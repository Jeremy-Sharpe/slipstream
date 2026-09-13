"""Session API extending the existing realtime transport, with scoped desktop capabilities."""

from __future__ import annotations

import asyncio
import hashlib
import secrets
import time
from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Header, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, ValidationError, model_validator

from app.routers.calls import persist_realtime_call
from app.services import coach_context, coach_reasoning
from app.services.coach_state import (
    Turn,
    append_turn,
    apply_analysis,
    bump_control,
    manual_action,
    new_state,
)
from app.services.coach_store import public_session
from app.services.transcribe import Transcript, TranscriptSegment, transcribe_audio
from app.ws.coach import _paid_coach_enabled, _valid_token, create_scribe_token

router = APIRouter(prefix="/coach", tags=["coach sessions"])


class NewCustomer(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    company: str = Field(min_length=1, max_length=100)
    context: str = Field(default="", max_length=2000)


class CreateSession(BaseModel):
    contact_id: UUID | None = None
    deal_id: UUID | None = None
    new_customer: NewCustomer | None = None
    audio_mode: Literal["both", "system", "mic"] = "both"

    @model_validator(mode="after")
    def identity(self):
        if bool(self.contact_id) == bool(self.new_customer):
            raise ValueError("Choose a contact or provide a new customer")
        if self.new_customer and self.deal_id:
            raise ValueError("A new customer cannot use an existing deal")
        return self


class Redeem(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    access_token: str = Field(min_length=32, max_length=200)


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def admin(request, token):
    settings = request.app.state.settings
    if _paid_coach_enabled(settings) and not settings.ingest_token:
        raise HTTPException(503, "Configure INGEST_TOKEN before enabling paid coaching")
    if not _valid_token(token, settings.ingest_token):
        raise HTTPException(401, "Invalid ingest token")


async def authorised(request, session_id: UUID, authorization: str | None) -> dict:
    row = await request.app.state.coach_store.read(str(session_id))
    if not row:
        raise HTTPException(404, "Coach session not found")
    supplied = (authorization or "").removeprefix("Bearer ")
    if not row.get("access_hash") or not secrets.compare_digest(
        digest(supplied), row["access_hash"]
    ):
        raise HTTPException(401, "Invalid session token")
    if datetime.now(UTC) > datetime.fromisoformat(row["access_expires"]):
        raise HTTPException(401, "Session access has expired")
    return row


@router.get("/customers")
async def list_customers(
    request: Request, token: str | None = Header(None, alias="X-Slipstream-Ingest-Token")
):
    admin(request, token)
    return await asyncio.to_thread(coach_context.customers, request.app.state.supabase)


@router.get("/sessions")
async def recent_sessions(
    request: Request, token: str | None = Header(None, alias="X-Slipstream-Ingest-Token")
):
    admin(request, token)
    client = request.app.state.supabase
    if client:

        def read():
            return [
                item["payload"]
                for item in client.table("coach_sessions")
                .select("payload")
                .order("updated_at", desc=True)
                .limit(20)
                .execute()
                .data
            ]

        rows = await asyncio.to_thread(read)
    else:
        rows = sorted(
            request.app.state.coach_store.rows.values(),
            key=lambda row: row["created_at"],
            reverse=True,
        )[:20]
    return [
        {
            "id": row["id"],
            "status": row["status"],
            "created_at": row["created_at"],
            "customer": row["context"]["customer"],
            "turn_count": len(row["state"]["turns"]),
        }
        for row in rows
    ]


@router.post("/sessions")
async def create_session(
    body: CreateSession,
    request: Request,
    token: str | None = Header(None, alias="X-Slipstream-Ingest-Token"),
):
    admin(request, token)
    store = request.app.state.coach_store
    now = datetime.now(UTC)
    while store.created and time.monotonic() - store.created[0] > 60:
        store.created.popleft()
    if len(store.created) >= 10:
        raise HTTPException(429, "Too many new coach sessions; retry shortly")
    store.created.append(time.monotonic())
    try:
        context = await asyncio.to_thread(
            coach_context.load_context,
            request.app.state.supabase,
            str(body.contact_id) if body.contact_id else None,
            str(body.deal_id) if body.deal_id else None,
            body.new_customer.model_dump() if body.new_customer else None,
            now,
        )
    except ValueError as error:
        raise HTTPException(422, str(error)) from error
    if request.app.state.supabase is None and body.contact_id:
        previous = [
            old
            for old in store.rows.values()
            if old.get("contact_id") == str(body.contact_id) and old["status"] == "ended"
        ]
        for old in sorted(previous, key=lambda old: old["created_at"], reverse=True)[:3]:
            transcript = "\n".join(
                f"{turn['role']}: {turn['text']}" for turn in old["state"]["turns"]
            )
            if transcript:
                context["sources"].insert(
                    1,
                    {
                        "id": f"history:coach:{old['id']}",
                        "kind": "history",
                        "label": "Previous coached call",
                        "text": transcript[-3500:],
                        "at": old["created_at"],
                    },
                )
                context["brief"] = "Previous coached calls are available for this customer."
        context["sources"] = context["sources"][:40]
    handoff = secrets.token_urlsafe(32)
    row = {
        "id": str(uuid4()),
        "created_at": now.isoformat(),
        "status": "ready",
        "contact_id": str(body.contact_id) if body.contact_id else None,
        "deal_id": str(body.deal_id) if body.deal_id else None,
        "context": context,
        "audio_mode": body.audio_mode,
        "state": new_state(),
        "handoff_hash": digest(handoff),
        "handoff_expires": (now + timedelta(minutes=10)).isoformat(),
        "access_hash": None,
        "access_expires": (now + timedelta(days=1)).isoformat(),
        "conversation_id": None,
        "recording_status": "not_uploaded",
    }
    await store.save(row, "created")
    return {"session": public_session(row), "handoff_token": handoff}


@router.post("/sessions/{session_id}/redeem")
async def redeem(session_id: UUID, body: Redeem, request: Request):
    store = request.app.state.coach_store
    async with store.lock(str(session_id)):
        row = await store.read(str(session_id))
        if not row or not secrets.compare_digest(digest(body.token), row["handoff_hash"]):
            raise HTTPException(401, "Invalid handoff")
        # An exact retry is recoverable if the response was lost, never a second capability.
        if row.get("access_hash"):
            if not secrets.compare_digest(row["access_hash"], digest(body.access_token)):
                raise HTTPException(401, "Handoff already used")
        elif datetime.now(UTC) > datetime.fromisoformat(row["handoff_expires"]):
            raise HTTPException(401, "Handoff expired; start again from Calls")
        else:
            row["access_hash"] = digest(body.access_token)
            await store.save(row, "redeemed")
        return public_session(row)


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: UUID,
    request: Request,
    token: str | None = Header(None, alias="X-Slipstream-Ingest-Token"),
):
    admin(request, token)
    row = await request.app.state.coach_store.read(str(session_id))
    if not row:
        raise HTTPException(404, "Coach session not found")
    return public_session(row)


@router.post("/sessions/{session_id}/scribe-token")
async def scribe_token(
    session_id: UUID, request: Request, authorization: str | None = Header(None)
):
    row = await authorised(request, session_id, authorization)
    if row["status"] == "ended":
        raise HTTPException(409, "This call has ended")
    required = request.app.state.settings.ingest_token
    return await create_scribe_token(request, required.get_secret_value() if required else None)


@router.post("/sessions/{session_id}/recording")
async def recording(session_id: UUID, request: Request, authorization: str | None = Header(None)):
    await authorised(request, session_id, authorization)
    try:
        await asyncio.wait_for(request.app.state.transcription_slots.acquire(), timeout=0.05)
    except TimeoutError as error:
        raise HTTPException(429, "Recording processing busy; retry shortly") from error
    try:
        content_type = request.headers.get("content-type", "").split(";")[0]
        if content_type not in {"audio/webm", "audio/wav"}:
            raise HTTPException(415, "Expected a WebM or WAV recording")
        parts = bytearray()
        async for chunk in request.stream():
            parts.extend(chunk)
            if len(parts) > 50 * 1024 * 1024:
                raise HTTPException(413, "Recording exceeds 50 MB; finish with the live transcript")
        if not parts:
            raise HTTPException(422, "Recording is empty")
        store = request.app.state.coach_store
        async with store.lock(str(session_id)):
            row = await authorised(request, session_id, authorization)
            fingerprint = hashlib.sha256(parts).hexdigest()
            if row.get("recording_hash") == fingerprint:
                return {"status": row["recording_status"]}
            if row["status"] == "ended" or row.get("finalizing"):
                raise HTTPException(409, "This call has ended or is finalising")
            settings = request.app.state.settings
            if not settings.elevenlabs_api_key:
                raise HTTPException(
                    503, "Batch transcription is not configured; local recording retained"
                )
            try:
                transcript = await transcribe_audio(
                    content=bytes(parts),
                    filename="call.wav",
                    content_type=content_type,
                    api_key=settings.elevenlabs_api_key.get_secret_value(),
                    client=request.app.state.transcription_client,
                )
                if request.app.state.supabase:
                    await asyncio.to_thread(
                        request.app.state.supabase.storage.from_("coach-recordings").upload,
                        f"{session_id}/recording.wav",
                        bytes(parts),
                        {"content-type": content_type, "upsert": "true"},
                    )
            except Exception as error:
                raise HTTPException(
                    502, "Recording processing failed; retry or keep the live transcript"
                ) from error
            row["batch_transcript"] = asdict(transcript)
            row["recording_hash"] = fingerprint
            row["recording_status"] = (
                "stored" if request.app.state.supabase else "transcribed_local"
            )
            await store.save(row, "recording_processed")
        return {"status": row["recording_status"]}
    finally:
        request.app.state.transcription_slots.release()


async def finish(request, row: dict) -> None:
    if row["status"] == "ended":
        return
    if not row.get("finalizing"):
        row["finalizing"] = True
        bump_control(row["state"])
        await request.app.state.coach_store.save(row, "finish_started")
    batch = row.get("batch_transcript")
    if batch:
        transcript = Transcript(
            **{**batch, "segments": [TranscriptSegment(**s) for s in batch["segments"]]}
        )
    else:
        turns = row["state"]["turns"]
        transcript = Transcript(
            text="\n".join(f"{t['role']}: {t['text']}" for t in turns),
            language_code=None,
            segments=[
                TranscriptSegment(
                    sequence=t["sequence"],
                    speaker=t["role"],
                    body=t["text"],
                    start_ms=t["start_ms"],
                    end_ms=t["end_ms"],
                )
                for t in turns
            ],
            provider="coach_realtime",
        )
    if transcript.segments:
        record = await persist_realtime_call(
            request,
            source_external_id=f"coach:{row['id']}",
            subject=f"{row['context']['customer'].get('name', 'New customer')} · coached call",
            occurred_at=datetime.fromisoformat(row["created_at"]),
            transcript=transcript,
            rep_name="Sales Rep",
        )
        row["conversation_id"] = str(record.id)
        if request.app.state.supabase:

            def link():
                request.app.state.supabase.table("conversations").update(
                    {
                        "contact_id": row["contact_id"],
                        "deal_id": row["deal_id"],
                        "metadata": {
                            "provider": transcript.provider,
                            "coach_session_id": row["id"],
                            "recording_path": f"{row['id']}/recording.wav"
                            if row["recording_status"] == "stored"
                            else None,
                        },
                    }
                ).eq("id", str(record.id)).execute()

            await asyncio.to_thread(link)
    row["status"] = "ended"
    row["state"]["revision"] += 1
    await request.app.state.coach_store.save(row, "ended")


@router.post("/sessions/{session_id}/finish")
async def finish_session(
    session_id: UUID, request: Request, authorization: str | None = Header(None)
):
    async with request.app.state.coach_store.lock(str(session_id)):
        row = await authorised(request, session_id, authorization)
        await finish(request, row)
        return public_session(row)


@router.websocket("/sessions/{session_id}/live")
async def live(session_id: UUID, websocket: WebSocket):
    await websocket.accept()
    store = websocket.app.state.coach_store
    session_key = str(session_id)
    worker = None
    connected = False
    sender = asyncio.Lock()
    dirty = asyncio.Event()

    async def send(payload):
        async with sender:
            await websocket.send_json(payload)

    async def snapshot(row):
        await send(
            {
                "type": "snapshot",
                "session": public_session(row),
                "resume_from_sequence": len(row["state"]["turns"]),
            }
        )

    try:
        auth = await asyncio.wait_for(websocket.receive_json(), 10)
        row = await authorised(websocket, session_id, "Bearer " + str(auth.get("token", "")))
        if session_key in store.connected or len(store.connected) >= 4:
            await send({"type": "error", "detail": "Session already connected or capacity busy"})
            await websocket.close(1013)
            return
        store.connected.add(session_key)
        connected = True
        await snapshot(row)

        async def reason_loop():
            analysed_revision = None
            while True:
                try:
                    await asyncio.wait_for(dirty.wait(), timeout=30)
                    woken = True
                except TimeoutError:
                    woken = False
                dirty.clear()
                await asyncio.sleep(0.35)
                previous = store.model_tasks.get(session_key)
                if previous is not None:
                    await asyncio.gather(asyncio.shield(previous), return_exceptions=True)
                async with store.lock(session_key):
                    row = await store.read(session_key)
                    if row["status"] != "live" or row.get("finalizing"):
                        continue
                    # The periodic reassessment only spends a model call if something changed.
                    if not woken and row["state"]["revision"] == analysed_revision:
                        continue
                    if row["state"]["analysis_count"] >= 240:
                        await send(
                            {
                                "type": "error",
                                "detail": "Analysis limit reached; transcript continues",
                            }
                        )
                        continue
                    row["state"]["analysis_count"] += 1
                    await store.save(row, "analysis_attempt")
                control_revision = row["state"].get("control_revision", 0)
                started = time.monotonic()

                async def run_model(snapshot_row):
                    async with websocket.app.state.coach_reasoning_slots:
                        return await asyncio.to_thread(
                            coach_reasoning.analyse, websocket.app.state.settings, snapshot_row
                        )

                task = asyncio.create_task(run_model(row))
                store.model_tasks[session_key] = task

                def completed(task):
                    if store.model_tasks.get(session_key) is task:
                        store.model_tasks.pop(session_key, None)
                    if not task.cancelled():
                        task.exception()

                task.add_done_callback(completed)
                try:
                    result, model = await asyncio.shield(task)
                    async with store.lock(session_key):
                        latest = await store.read(session_key)
                        if (
                            latest["status"] == "live"
                            and not latest.get("finalizing")
                            and apply_analysis(
                                latest["state"],
                                result,
                                control_revision,
                                latest["context"]["sources"],
                            )
                        ):
                            latest["model"] = model
                            latest["last_analysis_ms"] = round((time.monotonic() - started) * 1000)
                            await store.save(latest, "analysed")
                            analysed_revision = latest["state"]["revision"]
                            await snapshot(latest)
                        elif latest["status"] == "live":
                            dirty.set()
                except Exception:
                    async with store.lock(session_key):
                        latest = await store.read(session_key)
                        latest["state"]["analysis_status"] = "unavailable"
                        await store.save(latest, "analysis_failed")
                    await send(
                        {"type": "error", "detail": "Advice unavailable. Transcript continues."}
                    )
                    await asyncio.sleep(3)
                await asyncio.sleep(1)

        worker = asyncio.create_task(reason_loop())
        if row["status"] == "live":
            dirty.set()
        deadline = time.monotonic() + 7200
        while time.monotonic() < deadline:
            event = await asyncio.wait_for(websocket.receive_json(), 45)
            if not isinstance(event, dict):
                raise ValueError("Expected an event object")
            if event.get("type") == "ping":
                await send({"type": "pong"})
                continue
            async with store.lock(session_key):
                row = await store.read(session_key)
                if row["status"] == "ended":
                    await snapshot(row)
                    continue
                if row.get("finalizing") and event.get("type") != "end":
                    await send({"type": "error", "detail": "Call is finalising; retry saving it"})
                    continue
                kind = event.get("type")
                if kind == "transcript":
                    if row["status"] not in {"live", "paused"}:
                        raise ValueError("Start the session before sending transcript events")
                    changed = append_turn(row["state"], Turn.model_validate(event.get("turn")))
                    if changed:
                        await store.save(row, "transcript")
                        dirty.set()
                    await send({"type": "committed", "sequence": event["turn"]["sequence"]})
                elif kind in {"start", "resume", "pause"}:
                    row["status"] = "paused" if kind == "pause" else "live"
                    bump_control(row["state"])
                    await store.save(row, kind)
                    dirty.set()
                    await snapshot(row)
                elif kind == "action":
                    action_id = str(UUID(event.get("action_id", "")))
                    if manual_action(
                        row["state"], action_id, event.get("action"), event.get("suggestion_id")
                    ):
                        await store.save(row, "manual_action")
                        dirty.set()
                    await send({"type": "action_ack", "action_id": action_id})
                    await snapshot(row)
                elif kind == "end":
                    await finish(websocket, row)
                    await snapshot(row)
                else:
                    raise ValueError("Unknown coach event")
    except (WebSocketDisconnect, TimeoutError):
        pass
    except (ValueError, ValidationError, HTTPException) as error:
        await send(
            {
                "type": "error",
                "detail": error.detail if isinstance(error, HTTPException) else str(error)[:200],
            }
        )
        await websocket.close(1008)
    finally:
        if connected:
            store.connected.discard(session_key)
        if worker:
            worker.cancel()
            await asyncio.gather(worker, return_exceptions=True)
