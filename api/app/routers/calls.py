from __future__ import annotations

import asyncio
import hashlib
import json
import re
import secrets
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Any, Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from fastapi import APIRouter, File, Form, Header, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.services.transcribe import (
    Transcript,
    TranscriptionUnavailableError,
    TranscriptSegment,
    transcribe_audio,
)

router = APIRouter(prefix="/calls", tags=["calls"])
FIXTURES_ROOT = Path(__file__).resolve().parents[3] / "fixtures" / "calls"
FIXTURE_ID = re.compile(r"^call-[a-z0-9-]+$")
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_UPLOAD_REQUEST_BYTES = MAX_UPLOAD_BYTES + 2 * 1024 * 1024


class RealtimeCallConflictError(RuntimeError):
    """Raised when a realtime idempotency key is reused for different content."""


class UploadSizeLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int = MAX_UPLOAD_REQUEST_BYTES) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["path"].endswith("/calls/transcribe"):
            headers = {key.lower(): value for key, value in scope.get("headers", [])}
            raw_length = headers.get(b"content-length")
            try:
                content_length = int(raw_length) if raw_length is not None else None
            except ValueError:
                content_length = -1
            if content_length is not None and (
                content_length < 0 or content_length > self.max_bytes
            ):
                response = JSONResponse(
                    {"detail": "Recording request is too large"},
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                )
                await response(scope, receive, send)
                return

            received = 0

            async def limited_receive():
                nonlocal received
                message = await receive()
                if message["type"] == "http.request":
                    received += len(message.get("body", b""))
                    if received > self.max_bytes:
                        raise HTTPException(
                            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                            detail="Recording request is too large",
                        )
                return message

            await self.app(scope, limited_receive, send)
            return
        await self.app(scope, receive, send)


class SegmentResponse(BaseModel):
    sequence: int
    speaker: str
    body: str
    start_ms: int = Field(ge=0)
    end_ms: int | None = Field(default=None, ge=0)


class CallResponse(BaseModel):
    id: UUID
    source_external_id: str
    subject: str
    occurred_at: datetime
    duration_seconds: int | None
    transcript: str
    segments: list[SegmentResponse]
    processing_status: Literal["pending", "processing", "ready", "failed"] = "ready"
    provider: str
    fixture: bool = False


class FixtureSummary(BaseModel):
    call_id: str
    company: str
    prospect: str
    rep: str
    outcome: str
    scheduled_at: datetime
    demo: bool
    has_audio: bool


def _fixture_path(call_id: str) -> Path:
    if not FIXTURE_ID.fullmatch(call_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fixture not found")
    path = FIXTURES_ROOT / call_id / "script.json"
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fixture not found")
    return path


def _read_fixture(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as fixture_file:
        payload = json.load(fixture_file)
    if not isinstance(payload, dict) or not isinstance(payload.get("turns"), list):
        raise ValueError("Invalid fixture")
    return payload


def _fixture_transcript(payload: dict[str, Any]) -> Transcript:
    turns = payload["turns"]
    duration_ms = int(payload.get("audio_seconds", payload["duration_target_seconds"]) * 1000)
    word_counts = [max(1, len(turn["text"].split())) for turn in turns]
    total_words = sum(word_counts)
    cursor = 0
    segments: list[TranscriptSegment] = []
    transcript_lines: list[str] = []
    for sequence, (turn, word_count) in enumerate(zip(turns, word_counts, strict=True)):
        segment_duration = round(duration_ms * word_count / total_words)
        end_ms = duration_ms if sequence == len(turns) - 1 else cursor + segment_duration
        segments.append(
            TranscriptSegment(
                sequence=sequence,
                speaker=turn["name"],
                body=turn["text"],
                start_ms=cursor,
                end_ms=end_ms,
            )
        )
        transcript_lines.append(f"{turn['name']}: {turn['text']}")
        cursor = end_ms
    return Transcript(
        text="\n".join(transcript_lines),
        language_code="en",
        segments=segments,
        provider="fixture",
    )


def _record(
    *,
    source_external_id: str,
    subject: str,
    occurred_at: datetime,
    transcript: Transcript,
    fixture: bool,
) -> CallResponse:
    last_end = transcript.segments[-1].end_ms if transcript.segments else None
    return CallResponse(
        id=uuid5(NAMESPACE_URL, f"slipstream:{source_external_id}"),
        source_external_id=source_external_id,
        subject=subject,
        occurred_at=occurred_at,
        duration_seconds=round(last_end / 1000) if last_end is not None else None,
        transcript=transcript.text,
        segments=[SegmentResponse(**asdict(segment)) for segment in transcript.segments],
        provider=transcript.provider,
        fixture=fixture,
    )


def _same_call(left: CallResponse, right: CallResponse) -> bool:
    return (
        left.source_external_id == right.source_external_id
        and left.subject == right.subject
        and left.occurred_at == right.occurred_at
        and left.transcript == right.transcript
        and left.provider == right.provider
        and left.fixture == right.fixture
        and left.segments == right.segments
    )


def _persist_to_supabase(client: Any, record: CallResponse) -> CallResponse:
    conversation = {
        "channel": "call",
        "subject": record.subject,
        "direction": "outbound",
        "occurred_at": record.occurred_at.isoformat(),
        "duration_seconds": record.duration_seconds,
        "source_external_id": record.source_external_id,
        "raw_content": record.transcript,
        "processing_status": "processing",
        "processing_error": None,
        "metadata": {"provider": record.provider, "fixture": record.fixture},
    }
    existing = (
        client.table("conversations")
        .select("id")
        .eq("channel", "call")
        .eq("source_external_id", record.source_external_id)
        .limit(1)
        .execute()
        .data
    )
    if existing:
        existing_record = _read_from_supabase(client, UUID(existing[0]["id"]))
        if existing_record is not None and existing_record.processing_status == "ready":
            if _same_call(existing_record, record):
                return existing_record
            raise RealtimeCallConflictError("Source ID already belongs to another transcript")
        raise RuntimeError("A prior ingestion for this source did not complete")
    try:
        created = client.table("conversations").insert(conversation).execute().data
    except Exception as error:
        raced = (
            client.table("conversations")
            .select("id")
            .eq("channel", "call")
            .eq("source_external_id", record.source_external_id)
            .limit(1)
            .execute()
            .data
        )
        if raced:
            raced_record = _read_from_supabase(client, UUID(raced[0]["id"]))
            if raced_record is not None and raced_record.processing_status == "ready":
                if _same_call(raced_record, record):
                    return raced_record
                raise RealtimeCallConflictError(
                    "Source ID already belongs to another transcript"
                ) from error
        raise
    if not created:
        raise RuntimeError("Supabase did not return the created conversation")
    conversation_id = created[0]["id"]
    segments = [
        {**segment.model_dump(), "conversation_id": conversation_id} for segment in record.segments
    ]
    try:
        if segments:
            client.table("transcript_segments").insert(segments).execute()
        client.table("conversations").update(
            {"processing_status": "ready", "processing_error": None}
        ).eq("id", conversation_id).execute()
    except Exception:
        client.table("conversations").update(
            {"processing_status": "failed", "processing_error": "Transcript persistence failed"}
        ).eq("id", conversation_id).execute()
        raise
    return record.model_copy(update={"id": UUID(conversation_id)})


def _read_from_supabase(client: Any, conversation_id: UUID) -> CallResponse | None:
    conversations = (
        client.table("conversations")
        .select(
            "id,source_external_id,subject,occurred_at,duration_seconds,raw_content,"
            "processing_status,metadata"
        )
        .eq("id", str(conversation_id))
        .eq("channel", "call")
        .limit(1)
        .execute()
        .data
    )
    if not conversations:
        return None
    conversation = conversations[0]
    segments = (
        client.table("transcript_segments")
        .select("sequence,speaker,body,start_ms,end_ms")
        .eq("conversation_id", str(conversation_id))
        .order("sequence")
        .execute()
        .data
    )
    metadata = conversation.get("metadata") or {}
    return CallResponse(
        id=conversation["id"],
        source_external_id=conversation["source_external_id"],
        subject=conversation["subject"],
        occurred_at=conversation["occurred_at"],
        duration_seconds=conversation["duration_seconds"],
        transcript=conversation["raw_content"] or "",
        segments=segments,
        processing_status=conversation["processing_status"],
        provider=metadata.get("provider", "unknown"),
        fixture=bool(metadata.get("fixture", False)),
    )


async def _persist(request: Request, record: CallResponse) -> CallResponse:
    client = request.app.state.supabase
    if client is not None:
        try:
            return await asyncio.to_thread(_persist_to_supabase, client, record)
        except RealtimeCallConflictError as error:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Source ID already belongs to another transcript",
            ) from error
        except Exception as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The conversation store is unavailable",
            ) from error
    request.app.state.call_store[str(record.id)] = record
    return record


async def persist_realtime_call(
    request: Request,
    *,
    source_external_id: str,
    subject: str,
    occurred_at: datetime,
    transcript: Transcript,
) -> CallResponse:
    """Persist a completed realtime transcript through the canonical call store."""
    record = _record(
        source_external_id=source_external_id,
        subject=subject,
        occurred_at=occurred_at,
        transcript=transcript,
        fixture=False,
    )
    existing = await _find_by_source(request, source_external_id)
    if existing is not None:
        if _same_call(existing, record):
            return existing
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Source ID already belongs to another transcript",
        )
    return await _persist(request, record)


async def _find_by_source(request: Request, source_external_id: str) -> CallResponse | None:
    if request.app.state.supabase is None:
        record_id = uuid5(NAMESPACE_URL, f"slipstream:{source_external_id}")
        return request.app.state.call_store.get(str(record_id))

    def read() -> CallResponse | None:
        rows = (
            request.app.state.supabase.table("conversations")
            .select("id")
            .eq("channel", "call")
            .eq("source_external_id", source_external_id)
            .limit(1)
            .execute()
            .data
        )
        return (
            _read_from_supabase(request.app.state.supabase, UUID(rows[0]["id"])) if rows else None
        )

    try:
        return await asyncio.to_thread(read)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The conversation store is unavailable",
        ) from error


async def load_call(request: Request, conversation_id: UUID) -> CallResponse | None:
    if request.app.state.supabase is not None:
        try:
            return await asyncio.to_thread(
                _read_from_supabase, request.app.state.supabase, conversation_id
            )
        except Exception as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The conversation store is unavailable",
            ) from error
    return request.app.state.call_store.get(str(conversation_id))


@router.get("/fixtures", response_model=list[FixtureSummary])
async def list_fixtures() -> list[FixtureSummary]:
    def load() -> list[FixtureSummary]:
        fixtures = []
        for path in sorted(FIXTURES_ROOT.glob("call-*/script.json")):
            payload = _read_fixture(path)
            fixtures.append(
                FixtureSummary(
                    call_id=payload["call_id"],
                    company=payload["company"]["name"],
                    prospect=payload["prospect"]["name"],
                    rep=payload["rep"],
                    outcome=payload["outcome"],
                    scheduled_at=payload["scheduled_at"],
                    demo=payload.get("demo", False),
                    has_audio=(path.parent / "audio.mp3").is_file(),
                )
            )
        return fixtures

    return await asyncio.to_thread(load)


@router.post("/fixtures/{call_id}/ingest", response_model=CallResponse)
async def ingest_fixture(call_id: str, request: Request) -> CallResponse:
    try:
        payload = await asyncio.to_thread(_read_fixture, _fixture_path(call_id))
        transcript = _fixture_transcript(payload)
        record = _record(
            source_external_id=payload["call_id"],
            subject=f"{payload['company']['name']} — {payload['prospect']['name']}",
            occurred_at=datetime.fromisoformat(payload["scheduled_at"]),
            transcript=transcript,
            fixture=True,
        )
    except (KeyError, TypeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Fixture data is invalid",
        ) from error
    return await _persist(request, record)


@router.post("/transcribe", response_model=CallResponse)
async def ingest_audio(
    request: Request,
    file: Annotated[UploadFile, File(description="Audio or video recording")],
    subject: Annotated[str, Form(min_length=1, max_length=200)],
    occurred_at: Annotated[datetime | None, Form()] = None,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> CallResponse:
    content_type = file.content_type or "application/octet-stream"
    subject = subject.strip()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Subject must not be blank",
        )
    if not (content_type.startswith("audio/") or content_type.startswith("video/")):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload an audio or video recording",
        )
    api_key = request.app.state.settings.elevenlabs_api_key
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Live transcription is not configured; ingest a fixture call instead",
        )
    required_token = request.app.state.settings.ingest_token
    if required_token is not None and (
        ingest_token is None
        or not secrets.compare_digest(ingest_token, required_token.get_secret_value())
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingest token")
    try:
        await asyncio.wait_for(request.app.state.transcription_slots.acquire(), timeout=0.01)
    except TimeoutError as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Transcription capacity is busy; retry shortly",
            headers={"Retry-After": "5"},
        ) from error
    try:
        content = await file.read(MAX_UPLOAD_BYTES + 1)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="The upload is empty"
            )
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="Recordings are limited to 50 MB",
            )
        fingerprint = hashlib.sha256(content).hexdigest()
        source_external_id = f"upload-{fingerprint}"
        lock = request.app.state.ingest_locks[
            int(fingerprint[:2], 16) % len(request.app.state.ingest_locks)
        ]
        try:
            await asyncio.wait_for(lock.acquire(), timeout=0.05)
        except TimeoutError as error:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="This recording is already being processed; retry shortly",
                headers={"Retry-After": "5"},
            ) from error
        try:
            existing = await _find_by_source(request, source_external_id)
            if existing is not None:
                if existing.processing_status == "ready":
                    return existing
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A prior ingestion of this recording requires operator review",
                )
            try:
                transcript = await transcribe_audio(
                    content=content,
                    filename=Path(file.filename or "recording").name,
                    content_type=content_type,
                    api_key=api_key.get_secret_value(),
                    client=request.app.state.transcription_client,
                )
            except TranscriptionUnavailableError as error:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="The transcription provider could not process this recording",
                ) from error
            record = _record(
                source_external_id=source_external_id,
                subject=subject,
                occurred_at=(
                    occurred_at.replace(tzinfo=UTC)
                    if occurred_at is not None and occurred_at.tzinfo is None
                    else occurred_at or datetime.now(UTC)
                ),
                transcript=transcript,
                fixture=False,
            )
            return await _persist(request, record)
        finally:
            lock.release()
    finally:
        request.app.state.transcription_slots.release()
        await file.close()


@router.get("/{conversation_id}", response_model=CallResponse)
async def get_call(conversation_id: UUID, request: Request) -> CallResponse:
    record = await load_call(request, conversation_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    return record
