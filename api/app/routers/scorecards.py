from __future__ import annotations

import asyncio
import logging
import secrets
from datetime import UTC, datetime
from typing import Annotated, Any, Literal
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
from app.services.playbook_store import PlaybookStaleError, read_latest_playbooks, store_playbook
from app.services.score import JudgeError, derive_playbook, score_call, stamp_scorecard_revision
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
MAX_MEMORY_PLAYBOOKS = 50
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


class PlaybookSourceExpectation(BaseModel):
    call_id: Identifier
    source_revision: Identifier
    scorecard_revision: Identifier
    rubric_version: Identifier
    outcome: Literal["won", "lost", "stalled"]


class PlaybookRequest(BaseModel):
    call_ids: list[Identifier] = Field(
        min_length=2,
        max_length=MAX_PLAYBOOK_SCORECARDS,
    )
    expected_sources: list[PlaybookSourceExpectation] | None = None

    @model_validator(mode="after")
    def unique_calls(self) -> PlaybookRequest:
        if len(self.call_ids) != len(set(self.call_ids)):
            raise ValueError("Playbook call IDs must be unique")
        if self.expected_sources is not None:
            expected_ids = [source.call_id for source in self.expected_sources]
            if len(expected_ids) != len(set(expected_ids)) or set(expected_ids) != set(
                self.call_ids
            ):
                raise ValueError("Expected playbook sources must match call IDs")
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
    if (
        submitted.rep != canonical.rep
        or submitted.outcome != canonical.outcome
        or submitted.turns != canonical.turns
    ):
        raise ScorecardStaleError("Submitted transcript is not the current canonical revision")
    scorecard, result = score_call(
        canonical,
        judge,
        scoring_started_at=started_at,
    )
    scorecard = stamp_scorecard_revision(scorecard.model_copy(
        update={
            "request_id": submitted.request_id,
            "source_external_id": submitted.call_id,
            "source_revision": revision,
        }
    ))
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


def _derive_trusted_playbook(request: Request, body: PlaybookRequest, judge):
    scorecards = _trusted_scorecards(request, body.call_ids)
    if body.expected_sources is not None:
        expected = {source.call_id: source for source in body.expected_sources}
        for scorecard in scorecards:
            source = expected.get(scorecard.call_id)
            if (
                source is None
                or scorecard.source_revision != source.source_revision
                or scorecard.scorecard_revision != source.scorecard_revision
                or scorecard.rubric_version != source.rubric_version
                or scorecard.outcome != source.outcome
            ):
                raise ScorecardStaleError("Scorecard cohort changed before playbook generation")
    return derive_playbook(scorecards, judge)


def _save_memory_playbook(request: Request, playbook: Playbook) -> Playbook:
    if not _is_current_playbook(request, playbook):
        raise PlaybookStaleError("Playbook cohort changed before persistence")
    request.app.state.playbook_store[playbook.cohort_revision] = playbook
    request.app.state.playbook_store.move_to_end(playbook.cohort_revision)
    while len(request.app.state.playbook_store) > MAX_MEMORY_PLAYBOOKS:
        request.app.state.playbook_store.popitem(last=False)
    return playbook


def _is_current_playbook(request: Request, playbook: Playbook) -> bool:
    try:
        cards = _trusted_scorecards(request, [source.call_id for source in playbook.sources])
    except (ScorecardNotFoundError, ValueError):
        return False
    current = {card.call_id: card for card in cards}
    return all(
        (card := current.get(source.call_id)) is not None
        and card.source_revision == source.source_revision
        and card.scorecard_revision == source.scorecard_revision
        and card.rubric_version == source.rubric_version
        and card.outcome == source.outcome
        for source in playbook.sources
    )


@router.get("/playbook/latest", response_model=Playbook)
async def get_latest_playbook(request: Request) -> Playbook:
    try:
        if request.app.state.supabase is None:
            playbook = next(
                (
                    candidate
                    for candidate in reversed(request.app.state.playbook_store.values())
                    if _is_current_playbook(request, candidate)
                ),
                None,
            )
        else:
            candidates = await _run_bounded(
                request,
                read_latest_playbooks,
                request.app.state.supabase,
                MAX_MEMORY_PLAYBOOKS,
            )
            playbook = await _run_bounded(
                request,
                lambda: next(
                    (item for item in candidates if _is_current_playbook(request, item)),
                    None,
                ),
            )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The playbook store is unavailable",
        ) from error
    if playbook is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playbook not found")
    return playbook


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
            _derive_trusted_playbook,
            request,
            body,
            judge,
        )
        if request.app.state.supabase is None:
            playbook = _save_memory_playbook(request, playbook)
        else:
            playbook = await _run_bounded(
                request, store_playbook, request.app.state.supabase, playbook
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
    except ScorecardStaleError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Scorecard cohort changed; reload before generating the playbook",
        ) from error
    except PlaybookStaleError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Scorecard cohort changed; reload before generating the playbook",
        ) from error
    except JudgeError as error:
        reference = uuid4().hex[:12]
        LOGGER.warning("Playbook judge failed [%s]", reference, exc_info=error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Playbook judge failed (reference {reference})",
        ) from error
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The playbook store is unavailable",
        ) from error
    return playbook
