from __future__ import annotations

import asyncio
import hashlib
import secrets
import time
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

import httpx
from fastapi import (
    APIRouter,
    Header,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from pydantic import BaseModel, Field, ValidationError, model_validator

from app.core.config import Settings
from app.routers.calls import persist_realtime_call
from app.services.coach import (
    CoachingSuggestion,
    CoachingTurn,
    deterministic_suggestion,
    flag_rep_risk,
    rep_risk_flag,
    suggest_next_move,
)
from app.services.transcribe import Transcript, TranscriptSegment

router = APIRouter(prefix="/coach", tags=["coach"])
SCRIBE_TOKEN_URL = "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe"
MAX_TURNS = 500
MAX_TRANSCRIPT_CHARS = 100_000
SUGGESTION_INTERVAL_MS = 15_000
MAX_SUGGESTIONS = 25
MAX_RISK_FLAGS = 6
# Later flags in a session stay deterministic so a pasted transcript cannot queue
# six five-second model calls behind one another.
MAX_MODEL_RISK_REFINEMENTS = 2
START_TIMEOUT_SECONDS = 10
IDLE_TIMEOUT_SECONDS = 60
MAX_SESSION_SECONDS = 2 * 60 * 60
MAX_CHECKPOINTS = 100
MAX_CHECKPOINT_AGE_SECONDS = 24 * 60 * 60
TOKEN_WINDOW_SECONDS = 60
MAX_TOKENS_PER_WINDOW = 6
SUGGESTION_WINDOW_SECONDS = 60
MAX_SUGGESTIONS_PER_WINDOW = 20


class ScribeTokenResponse(BaseModel):
    token: str
    websocket_url: str = "wss://api.elevenlabs.io/v1/speech-to-text/realtime"
    model_id: str = "scribe_v2_realtime"


class StartEvent(BaseModel):
    type: Literal["start"]
    source_external_id: str = Field(min_length=1, max_length=200)
    subject: str = Field(min_length=1, max_length=200)
    occurred_at: datetime | None = None
    rep_name: str | None = Field(default=None, max_length=80)
    deal_context: str | None = Field(default=None, max_length=2000)
    ingest_token: str | None = Field(default=None, max_length=500)


class TranscriptEvent(BaseModel):
    type: Literal["transcript"]
    sequence: int = Field(ge=0)
    speaker: str = Field(min_length=1, max_length=80)
    role: Literal["rep", "prospect", "unknown"] = "unknown"
    text: str = Field(min_length=1, max_length=4000)
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)

    @model_validator(mode="after")
    def validate_timing(self) -> TranscriptEvent:
        if self.end_ms < self.start_ms:
            raise ValueError("end_ms must not precede start_ms")
        self.text = self.text.strip()
        if not self.text:
            raise ValueError("text must not be blank")
        return self


class StopEvent(BaseModel):
    type: Literal["stop"]


def _valid_token(candidate: str | None, required: object | None) -> bool:
    if required is None:
        return True
    return bool(candidate) and secrets.compare_digest(
        candidate.encode("utf-8"), required.get_secret_value().encode("utf-8")
    )


def _paid_coach_enabled(settings: Settings) -> bool:
    return any(
        (
            settings.elevenlabs_api_key,
            settings.anthropic_api_key,
            settings.openai_api_key,
            settings.openrouter_api_key,
        )
    )


async def _bounded_model_pass(
    websocket: WebSocket,
    fallback: CoachingSuggestion,
    work: Callable[[], Awaitable[CoachingSuggestion | None]],
) -> CoachingSuggestion:
    now = time.monotonic()
    async with websocket.app.state.coach_suggestion_lock:
        started = websocket.app.state.coach_suggestion_started_at
        while started and now - started[0] >= SUGGESTION_WINDOW_SECONDS:
            started.popleft()
        if len(started) >= MAX_SUGGESTIONS_PER_WINDOW:
            return fallback
        started.append(now)
    try:
        await asyncio.wait_for(websocket.app.state.coach_reasoning_slots.acquire(), timeout=0.05)
    except TimeoutError:
        return fallback

    async def run() -> CoachingSuggestion:
        try:
            return await work() or fallback
        finally:
            websocket.app.state.coach_reasoning_slots.release()

    worker = asyncio.create_task(run())
    try:
        return await asyncio.shield(worker)
    except asyncio.CancelledError:
        worker.add_done_callback(lambda task: task.exception() if not task.cancelled() else None)
        raise


async def _bounded_suggestion(
    websocket: WebSocket,
    settings: Settings,
    turns: list[CoachingTurn],
    deal_context: str | None,
) -> CoachingSuggestion:
    return await _bounded_model_pass(
        websocket,
        deterministic_suggestion(turns[-1]),
        lambda: asyncio.to_thread(suggest_next_move, settings, turns, deal_context),
    )


async def _bounded_risk_flag(
    websocket: WebSocket,
    settings: Settings,
    turns: list[CoachingTurn],
    deal_context: str | None,
    refine: bool,
) -> CoachingSuggestion | None:
    fallback = rep_risk_flag(turns[-1])
    if fallback is None or not refine:
        return fallback
    return await _bounded_model_pass(
        websocket,
        fallback,
        lambda: asyncio.to_thread(flag_rep_risk, settings, turns, deal_context),
    )


async def _send_error(websocket: WebSocket, code: str, detail: str) -> None:
    await websocket.send_json({"type": "error", "code": code, "detail": detail})


async def _persist_completed_call(
    websocket: WebSocket,
    *,
    source_external_id: str,
    checkpoint: dict,
    transcript: Transcript,
) -> object:
    source_hash = hashlib.sha256(source_external_id.encode()).digest()[0]
    persist_lock = websocket.app.state.ingest_locks[
        source_hash % len(websocket.app.state.ingest_locks)
    ]
    try:
        async with persist_lock:
            record = await persist_realtime_call(
                websocket,
                source_external_id=source_external_id,
                subject=checkpoint["subject"],
                occurred_at=checkpoint["occurred_at"],
                transcript=transcript,
                rep_name=checkpoint.get("rep_name") or "Sales Rep",
            )
        checkpoint["completed_call"] = record.model_dump(mode="json")
        checkpoint["updated_at"] = time.monotonic()
        return record
    finally:
        checkpoint["persistence_task"] = None


@router.post("/scribe-token", response_model=ScribeTokenResponse)
async def create_scribe_token(
    request: Request,
    ingest_token: str | None = Header(default=None, alias="X-Slipstream-Ingest-Token"),
) -> ScribeTokenResponse:
    settings = request.app.state.settings
    if _paid_coach_enabled(settings) and settings.ingest_token is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Realtime authentication is not configured",
        )
    if not _valid_token(ingest_token, settings.ingest_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingest token")
    if settings.elevenlabs_api_key is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Realtime transcription is not configured",
        )
    now = time.monotonic()
    async with request.app.state.coach_token_lock:
        issued = request.app.state.coach_token_issued_at
        while issued and now - issued[0] >= TOKEN_WINDOW_SECONDS:
            issued.popleft()
        if len(issued) >= MAX_TOKENS_PER_WINDOW:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Realtime token capacity is busy; retry shortly",
                headers={"Retry-After": str(TOKEN_WINDOW_SECONDS)},
            )
        issued.append(now)
    try:
        response = await request.app.state.transcription_client.post(
            SCRIBE_TOKEN_URL,
            headers={"xi-api-key": settings.elevenlabs_api_key.get_secret_value()},
        )
        response.raise_for_status()
        payload = response.json()
        token = payload.get("token") if isinstance(payload, dict) else None
        if not isinstance(token, str) or not token:
            raise ValueError("Missing token")
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The transcription provider could not create a realtime token",
        ) from error
    return ScribeTokenResponse(token=token)


@router.websocket("/live")
async def live_coach(websocket: WebSocket) -> None:
    await websocket.accept()
    handshake_slot_acquired = False
    coach_slot_acquired = False
    source_lock: asyncio.Lock | None = None
    source_lock_acquired = False
    deadline_handle: asyncio.TimerHandle | None = None
    deadline_expired = asyncio.Event()
    checkpoint_key: str | None = None
    checkpoints: dict | None = None
    try:
        try:
            await asyncio.wait_for(
                websocket.app.state.coach_handshake_slots.acquire(), timeout=0.05
            )
            handshake_slot_acquired = True
        except TimeoutError:
            await _send_error(websocket, "capacity_busy", "Authentication capacity is busy")
            await websocket.close(code=1013)
            return
        try:
            start_payload = await asyncio.wait_for(
                websocket.receive_json(), timeout=START_TIMEOUT_SECONDS
            )
            start = StartEvent.model_validate(start_payload)
        except TimeoutError:
            await _send_error(websocket, "start_timeout", "Start authentication timed out")
            await websocket.close(code=1008)
            return
        except (ValidationError, ValueError, TypeError):
            await _send_error(
                websocket, "invalid_start", "The first event must be a valid start event"
            )
            await websocket.close(code=1008)
            return
        settings = websocket.app.state.settings
        if _paid_coach_enabled(settings) and settings.ingest_token is None:
            await _send_error(
                websocket, "configuration_error", "Realtime authentication is not configured"
            )
            await websocket.close(code=1011)
            return
        if not _valid_token(start.ingest_token, settings.ingest_token):
            await _send_error(websocket, "unauthorized", "Invalid ingest token")
            await websocket.close(code=1008)
            return
        websocket.app.state.coach_handshake_slots.release()
        handshake_slot_acquired = False
        try:
            await asyncio.wait_for(websocket.app.state.coach_slots.acquire(), timeout=0.05)
            coach_slot_acquired = True
        except TimeoutError:
            await _send_error(websocket, "capacity_busy", "Live coaching capacity is busy")
            await websocket.close(code=1013)
            return

        checkpoint_key = start.source_external_id
        async with websocket.app.state.coach_source_locks_guard:
            source_lock = websocket.app.state.coach_source_locks.setdefault(
                start.source_external_id, asyncio.Lock()
            )
            if source_lock.locked():
                source_lock = None
            else:
                await source_lock.acquire()
                source_lock_acquired = True
        if source_lock is None:
            await _send_error(websocket, "source_busy", "This live call is already connected")
            await websocket.close(code=1013)
            return

        session_task = asyncio.current_task()

        def expire_session() -> None:
            deadline_expired.set()
            if session_task is not None:
                session_task.cancel()

        deadline_handle = asyncio.get_running_loop().call_later(MAX_SESSION_SECONDS, expire_session)

        checkpoints = websocket.app.state.coach_checkpoints
        cutoff = time.monotonic() - MAX_CHECKPOINT_AGE_SECONDS
        async with websocket.app.state.coach_source_locks_guard:
            active_sources = set(websocket.app.state.coach_source_locks)
        expired = [
            key
            for key, value in checkpoints.items()
            if value["updated_at"] < cutoff and key not in active_sources
        ]
        for key in expired:
            checkpoints.pop(key, None)
        checkpoint = checkpoints.get(start.source_external_id)
        if checkpoint is None:
            if len(checkpoints) >= MAX_CHECKPOINTS:
                await _send_error(websocket, "capacity_busy", "Checkpoint capacity is busy")
                await websocket.close(code=1013)
                return
            occurred_at = start.occurred_at or datetime.now(UTC)
            if occurred_at.tzinfo is None:
                occurred_at = occurred_at.replace(tzinfo=UTC)
            checkpoint = {
                "subject": start.subject.strip(),
                "occurred_at": occurred_at,
                "rep_name": start.rep_name or "Sales Rep",
                "deal_context": start.deal_context,
                "events": [],
                "suggestion_count": 0,
                "risk_flag_count": 0,
                "last_suggestion_at": None,
                "updated_at": time.monotonic(),
                "persistence_task": None,
            }
            checkpoints[start.source_external_id] = checkpoint
        else:
            checkpoint["updated_at"] = time.monotonic()
        supplied_occurred_at = start.occurred_at
        if supplied_occurred_at is not None and supplied_occurred_at.tzinfo is None:
            supplied_occurred_at = supplied_occurred_at.replace(tzinfo=UTC)
        metadata_conflict = checkpoint is not None and (
            checkpoint["subject"] != start.subject.strip()
            or (
                supplied_occurred_at is not None
                and supplied_occurred_at != checkpoint["occurred_at"]
            )
            or (start.deal_context is not None and start.deal_context != checkpoint["deal_context"])
            or (start.rep_name is not None and start.rep_name != checkpoint["rep_name"])
        )
        if metadata_conflict:
            await _send_error(
                websocket, "source_conflict", "Source ID already belongs to another live call"
            )
            await websocket.close(code=1008)
            return

        persistence_task = checkpoint.get("persistence_task")
        if persistence_task is not None:
            try:
                await asyncio.shield(persistence_task)
            except asyncio.CancelledError:
                persistence_task.add_done_callback(
                    lambda task: task.exception() if not task.cancelled() else None
                )
                raise
            except Exception:
                pass

        if checkpoint.get("completed_call") is not None:
            completed_call = checkpoint["completed_call"]
            replay_session_id = str(uuid4())
            await websocket.send_json(
                {
                    "type": "ready",
                    "session_id": replay_session_id,
                    "resume_from_sequence": (
                        checkpoint["events"][-1].sequence + 1 if checkpoint["events"] else 0
                    ),
                }
            )
            await websocket.send_json(
                {
                    "type": "completed",
                    "session_id": replay_session_id,
                    "call": completed_call,
                }
            )
            await websocket.close(code=1000)
            return

        session_id = uuid4()
        events: list[TranscriptEvent] = list(checkpoint["events"])
        coaching_turns = [
            CoachingTurn(
                sequence=event.sequence,
                speaker=event.speaker,
                role=event.role,
                text=event.text,
            )
            for event in events
        ]
        transcript_chars = sum(len(event.text) for event in events)
        await websocket.send_json(
            {
                "type": "ready",
                "session_id": str(session_id),
                "resume_from_sequence": events[-1].sequence + 1 if events else 0,
            }
        )
        suggestion_count = checkpoint["suggestion_count"]
        risk_flag_count = checkpoint.get("risk_flag_count", 0)
        last_suggestion_at: float | None = checkpoint["last_suggestion_at"]
        session_started_at = time.monotonic()
        while True:
            remaining = MAX_SESSION_SECONDS - (time.monotonic() - session_started_at)
            if remaining <= 0:
                await _send_error(websocket, "session_timeout", "Maximum call length reached")
                await websocket.close(code=1000)
                return
            try:
                payload = await asyncio.wait_for(
                    websocket.receive_json(), timeout=min(IDLE_TIMEOUT_SECONDS, remaining)
                )
            except TimeoutError:
                await _send_error(websocket, "idle_timeout", "The live call was idle too long")
                await websocket.close(code=1000)
                return
            event_type = payload.get("type") if isinstance(payload, dict) else None
            if event_type == "stop":
                StopEvent.model_validate(payload)
                if not events:
                    await _send_error(
                        websocket, "empty_call", "At least one transcript event is required"
                    )
                    continue
                transcript = Transcript(
                    text="\n".join(f"{event.speaker}: {event.text}" for event in events),
                    language_code=None,
                    segments=[
                        TranscriptSegment(
                            sequence=event.sequence,
                            speaker=event.speaker,
                            body=event.text,
                            start_ms=event.start_ms,
                            end_ms=event.end_ms,
                        )
                        for event in events
                    ],
                    provider="realtime_client",
                )
                try:
                    persistence_task = asyncio.create_task(
                        _persist_completed_call(
                            websocket,
                            source_external_id=start.source_external_id,
                            checkpoint=checkpoint,
                            transcript=transcript,
                        )
                    )
                    checkpoint["persistence_task"] = persistence_task
                    try:
                        record = await asyncio.shield(persistence_task)
                    except asyncio.CancelledError:
                        persistence_task.add_done_callback(
                            lambda task: task.exception() if not task.cancelled() else None
                        )
                        raise
                except HTTPException as error:
                    if error.status_code == status.HTTP_409_CONFLICT:
                        await _send_error(
                            websocket,
                            "source_conflict",
                            "Source ID already belongs to another call",
                        )
                        checkpoints.pop(start.source_external_id, None)
                        await websocket.close(code=1008)
                        return
                    await _send_error(
                        websocket,
                        "persistence_failed",
                        "The call was not saved; retry the stop event",
                    )
                    continue
                except Exception:
                    await _send_error(
                        websocket,
                        "persistence_failed",
                        "The call was not saved; retry the stop event",
                    )
                    continue
                await websocket.send_json(
                    {
                        "type": "completed",
                        "session_id": str(session_id),
                        "call": record.model_dump(mode="json"),
                    }
                )
                await websocket.close(code=1000)
                return
            if event_type != "transcript":
                await _send_error(websocket, "invalid_event", "Expected a transcript or stop event")
                continue
            try:
                event = TranscriptEvent.model_validate(payload)
            except ValidationError:
                await _send_error(websocket, "invalid_transcript", "Transcript event is invalid")
                continue
            if (
                len(events) >= MAX_TURNS
                or transcript_chars + len(event.text) > MAX_TRANSCRIPT_CHARS
            ):
                await _send_error(
                    websocket, "session_limit", "The live transcript limit was reached"
                )
                await websocket.close(code=1009)
                return
            if events and (
                event.sequence <= events[-1].sequence or event.start_ms < events[-1].end_ms
            ):
                await _send_error(
                    websocket,
                    "out_of_order",
                    "Transcript events must be ordered and non-overlapping",
                )
                continue
            events.append(event)
            transcript_chars += len(event.text)
            checkpoint["events"] = list(events)
            checkpoint["updated_at"] = time.monotonic()
            coaching_turns.append(
                CoachingTurn(
                    sequence=event.sequence,
                    speaker=event.speaker,
                    role=event.role,
                    text=event.text,
                )
            )
            await websocket.send_json({"type": "committed", "sequence": event.sequence})
            # A rep's own risky claim cannot wait for the next-move interval, so the only
            # limits on a risk flag are the session cap and the shared rate limit.
            risk_due = (
                event.role == "rep"
                and risk_flag_count < MAX_RISK_FLAGS
                and suggestion_count < MAX_SUGGESTIONS
            )
            if risk_due:
                risk = await _bounded_risk_flag(
                    websocket,
                    settings,
                    coaching_turns[-6:],
                    checkpoint["deal_context"],
                    refine=risk_flag_count < MAX_MODEL_RISK_REFINEMENTS,
                )
                if risk is not None:
                    risk_flag_count += 1
                    suggestion_count += 1
                    checkpoint["risk_flag_count"] = risk_flag_count
                    checkpoint["suggestion_count"] = suggestion_count
                    await websocket.send_json({"type": "suggestion", **risk.model_dump()})
            suggestion_due = (
                event.role == "prospect"
                and suggestion_count < MAX_SUGGESTIONS
                and (
                    last_suggestion_at is None
                    or time.monotonic() - last_suggestion_at >= SUGGESTION_INTERVAL_MS / 1000
                )
            )
            if suggestion_due:
                suggestion = await _bounded_suggestion(
                    websocket,
                    settings,
                    coaching_turns[-12:],
                    checkpoint["deal_context"],
                )
                suggestion_count += 1
                last_suggestion_at = time.monotonic()
                checkpoint["suggestion_count"] = suggestion_count
                checkpoint["last_suggestion_at"] = last_suggestion_at
                await websocket.send_json({"type": "suggestion", **suggestion.model_dump()})
    except WebSocketDisconnect:
        return
    except asyncio.CancelledError:
        if not deadline_expired.is_set():
            raise
        try:
            await asyncio.wait_for(
                _send_error(websocket, "session_timeout", "Maximum call length reached"),
                timeout=1,
            )
            await asyncio.wait_for(websocket.close(code=1000), timeout=1)
        except (TimeoutError, RuntimeError, WebSocketDisconnect):
            pass
        return
    except (ValidationError, ValueError, TypeError):
        await _send_error(websocket, "invalid_event", "The event payload is invalid")
        await websocket.close(code=1008)
    finally:
        if deadline_handle is not None:
            deadline_handle.cancel()
        if (
            checkpoints is not None
            and checkpoint_key is not None
            and checkpoint_key in checkpoints
            and not checkpoints[checkpoint_key]["events"]
        ):
            checkpoints.pop(checkpoint_key, None)
        if source_lock is not None and source_lock_acquired:
            async with websocket.app.state.coach_source_locks_guard:
                source_lock.release()
                if websocket.app.state.coach_source_locks.get(checkpoint_key) is source_lock:
                    websocket.app.state.coach_source_locks.pop(checkpoint_key, None)
        if coach_slot_acquired:
            websocket.app.state.coach_slots.release()
        if handshake_slot_acquired:
            websocket.app.state.coach_handshake_slots.release()
