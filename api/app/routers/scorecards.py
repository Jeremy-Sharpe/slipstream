from __future__ import annotations

import asyncio
import logging
import secrets
from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, Field, model_validator
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.schemas.scorecard import (
    MAX_PLAYBOOK_SCORECARDS,
    Identifier,
    Playbook,
    Scorecard,
    Transcript,
)
from app.services.score import JudgeError, derive_playbook, score_call
from app.services.scorecard_store import (
    ScorecardNotFoundError,
    ScorecardStaleError,
    load_scorecard_source,
    read_scorecard,
    read_scorecards,
    store_scorecard,
)

router = APIRouter(tags=["scorecards"])
LOGGER = logging.getLogger(__name__)
MAX_SCORECARD_REQUEST_BYTES = 2 * 1024 * 1024
MAX_MEMORY_SCORECARDS = 500
ADMISSION_TIMEOUT_SECONDS = 0.05


class ScorecardSizeLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int = MAX_SCORECARD_REQUEST_BYTES) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        is_scorecard_route = scope["type"] == "http" and scope["path"].rstrip("/").endswith(
            ("/scorecards", "/playbook")
        )
        if not is_scorecard_route:
            await self.app(scope, receive, send)
            return
        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        raw_length = headers.get(b"content-length")
        try:
            content_length = int(raw_length) if raw_length is not None else None
        except ValueError:
            content_length = -1
        if content_length is not None and (content_length < 0 or content_length > self.max_bytes):
            response = JSONResponse(
                {"detail": "Scorecard request is too large"},
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
                        detail="Scorecard request is too large",
                    )
            return message

        await self.app(scope, limited_receive, send)


class PlaybookRequest(BaseModel):
    call_ids: list[Identifier] = Field(
        min_length=2,
        max_length=MAX_PLAYBOOK_SCORECARDS,
    )

    @model_validator(mode="after")
    def unique_calls(self) -> PlaybookRequest:
        if len(self.call_ids) != len(set(self.call_ids)):
            raise ValueError("Playbook call IDs must be unique")
        return self


def _judge(request: Request):
    try:
        return request.app.state.judge_factory()
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No scorecard judge is configured",
        ) from error


def _authorise(request: Request, token: str | None) -> None:
    required = request.app.state.settings.ingest_token
    if required is not None and (
        token is None
        or not secrets.compare_digest(token.encode(), required.get_secret_value().encode())
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def _save_memory_scorecard(request: Request, scorecard: Scorecard) -> Scorecard:
    existing = request.app.state.scorecard_store.get(scorecard.call_id)
    if existing is None or existing.scored_at <= scorecard.scored_at:
        request.app.state.scorecard_store[scorecard.call_id] = scorecard
        request.app.state.scorecard_store.move_to_end(scorecard.call_id)
        while len(request.app.state.scorecard_store) > MAX_MEMORY_SCORECARDS:
            request.app.state.scorecard_store.popitem(last=False)
        return scorecard
    return existing


def _score_durable(client: Any, submitted: Transcript, judge, started_at: datetime):
    canonical, revision = load_scorecard_source(client, submitted.call_id)
    scorecard, result = score_call(
        canonical,
        judge,
        scoring_started_at=started_at,
    )
    return store_scorecard(client, scorecard, revision), result


@router.get("/scorecards/{call_id}", response_model=Scorecard)
async def get_scorecard(call_id: str, request: Request) -> Scorecard:
    if request.app.state.supabase is None:
        scorecard = request.app.state.scorecard_store.get(call_id)
    else:
        try:
            scorecard = await _run_bounded(
                request, read_scorecard, request.app.state.supabase, call_id
            )
        except HTTPException:
            raise
        except Exception as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The scorecard store is unavailable",
            ) from error
    if scorecard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scorecard not found")
    return scorecard


async def _run_bounded(request: Request, operation, *args):
    try:
        await asyncio.wait_for(
            request.app.state.scorecard_admission_slots.acquire(),
            timeout=ADMISSION_TIMEOUT_SECONDS,
        )
    except TimeoutError as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Scorecard capacity is busy; retry shortly",
        ) from error
    try:
        await request.app.state.scorecard_slots.acquire()
    except BaseException:
        request.app.state.scorecard_admission_slots.release()
        raise

    worker = asyncio.create_task(asyncio.to_thread(operation, *args))

    def release_capacity(_: asyncio.Task[Any]) -> None:
        request.app.state.scorecard_slots.release()
        request.app.state.scorecard_admission_slots.release()

    worker.add_done_callback(release_capacity)
    return await asyncio.shield(worker)


def _trusted_scorecards(request: Request, call_ids: list[str]) -> list[Scorecard]:
    if request.app.state.supabase is None:
        scorecards = [request.app.state.scorecard_store.get(call_id) for call_id in call_ids]
    else:
        stored = read_scorecards(request.app.state.supabase, call_ids)
        if any(item is None for item in stored):
            raise ScorecardNotFoundError("One or more scorecards were not found")
        canonical_ids = [item[0] for item in stored if item is not None]
        if len(canonical_ids) != len(set(canonical_ids)):
            raise ValueError("Call identifiers resolve to the same conversation")
        scorecards = [item[1] for item in stored if item is not None]
    if any(scorecard is None for scorecard in scorecards):
        raise ScorecardNotFoundError("One or more scorecards were not found")
    resolved = [scorecard for scorecard in scorecards if scorecard is not None]
    if len({scorecard.call_id for scorecard in resolved}) != len(resolved):
        raise ValueError("Call identifiers resolve to the same conversation")
    return resolved


@router.post("/scorecards", response_model=Scorecard)
async def create_scorecard(
    transcript: Transcript,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> Scorecard:
    _authorise(request, ingest_token)
    judge = _judge(request)
    scoring_started_at = datetime.now(UTC)
    try:
        if request.app.state.supabase is None:
            scorecard, _ = await _run_bounded(
                request,
                lambda: score_call(
                    transcript,
                    judge,
                    scoring_started_at=scoring_started_at,
                ),
            )
            return _save_memory_scorecard(request, scorecard)
        scorecard, _ = await _run_bounded(
            request,
            _score_durable,
            request.app.state.supabase,
            transcript,
            judge,
            scoring_started_at,
        )
        return scorecard
    except ScorecardStaleError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Call changed while it was being scored; retry",
        ) from error
    except ScorecardNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Call not found"
        ) from error
    except JudgeError as error:
        reference = uuid4().hex[:12]
        LOGGER.warning("Scorecard judge failed [%s]", reference, exc_info=error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Scorecard judge failed (reference {reference})",
        ) from error
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The scorecard store is unavailable",
        ) from error


@router.post("/playbook", response_model=Playbook)
async def create_playbook(
    body: PlaybookRequest,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> Playbook:
    _authorise(request, ingest_token)
    judge = _judge(request)
    try:
        playbook, _ = await _run_bounded(
            request,
            lambda: derive_playbook(
                _trusted_scorecards(request, body.call_ids),
                judge,
            ),
        )
    except ScorecardNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scorecard not found"
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Call identifiers must resolve to distinct conversations",
        ) from error
    except JudgeError as error:
        reference = uuid4().hex[:12]
        LOGGER.warning("Playbook judge failed [%s]", reference, exc_info=error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Playbook judge failed (reference {reference})",
        ) from error
    return playbook
