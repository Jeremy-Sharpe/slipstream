from __future__ import annotations

import asyncio
import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, ValidationError

from app.routers.calls import FIXTURE_ID, FIXTURES_ROOT, load_call
from app.routers.extractions import load_extraction
from app.schemas.scorecard import Outcome, Playbook, Scorecard, Transcript
from app.services.score import JudgeError, derive_playbook, score_call, transcript_from_segments

router = APIRouter(tags=["scorecards"])


class PlaybookRequest(BaseModel):
    scorecards: list[Scorecard]


class ScoreCallRequest(BaseModel):
    rep: str | None = None
    outcome: Outcome | None = None


def _judge(request: Request):
    try:
        return request.app.state.judge_factory()
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No scorecard judge is configured",
        ) from error


def _read_stored(client: Any, conversation_id: UUID) -> Scorecard | None:
    rows = (
        client.table("conversations")
        .select("scorecard")
        .eq("id", str(conversation_id))
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        return None
    payload = rows[0].get("scorecard")
    if not payload:
        return None
    return Scorecard.model_validate(payload)


def _store(client: Any, conversation_id: UUID, scorecard: Scorecard) -> None:
    updated = (
        client.table("conversations")
        .update({"scorecard": scorecard.model_dump(mode="json")})
        .eq("id", str(conversation_id))
        .execute()
    )
    if not updated.data:
        raise RuntimeError("Scorecard update returned no row")


def _list_stored(client: Any) -> list[Scorecard]:
    rows = (
        client.table("conversations").select("id, scorecard").neq("scorecard", "{}").execute().data
    )
    scorecards = []
    for row in rows:
        payload = row.get("scorecard")
        if not payload:
            continue
        try:
            scorecards.append(Scorecard.model_validate(payload))
        except ValidationError:
            continue
    return scorecards


async def _load_scorecard(request: Request, conversation_id: UUID) -> Scorecard | None:
    if request.app.state.supabase is None:
        return request.app.state.scorecard_store.get(str(conversation_id))
    try:
        return await asyncio.to_thread(_read_stored, request.app.state.supabase, conversation_id)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The scorecard store is unavailable",
        ) from error


async def _save_scorecard(
    request: Request,
    conversation_id: UUID,
    scorecard: Scorecard,
) -> None:
    if request.app.state.supabase is None:
        request.app.state.scorecard_store[str(conversation_id)] = scorecard
        return
    try:
        await asyncio.to_thread(_store, request.app.state.supabase, conversation_id, scorecard)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The scorecard could not be stored",
        ) from error


async def _load_scorecards(request: Request) -> list[Scorecard]:
    if request.app.state.supabase is None:
        scorecards = list(request.app.state.scorecard_store.values())
    else:
        try:
            scorecards = await asyncio.to_thread(_list_stored, request.app.state.supabase)
        except Exception as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The scorecard store is unavailable",
            ) from error
    return sorted(scorecards, key=lambda scorecard: scorecard.call_id)


def _fixture_defaults(source_external_id: str) -> tuple[str | None, Outcome | None]:
    if not FIXTURE_ID.fullmatch(source_external_id):
        return None, None
    script_path = FIXTURES_ROOT / source_external_id / "script.json"
    if not script_path.exists():
        return None, None
    data = json.loads(script_path.read_text(encoding="utf-8"))
    return data.get("rep"), data.get("outcome")


async def _extracted_outcome(request: Request, conversation_id: UUID) -> Outcome | None:
    extraction = await load_extraction(request, conversation_id)
    if extraction is None:
        return None
    outcome = extraction.deal.outcome.value
    if outcome in (None, "open"):
        return None
    return outcome


@router.post("/scorecards", response_model=Scorecard)
async def create_scorecard(transcript: Transcript, request: Request) -> Scorecard:
    try:
        scorecard, _ = score_call(transcript, _judge(request))
    except JudgeError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)) from error
    return scorecard


@router.post("/playbook", response_model=Playbook)
async def create_playbook(body: PlaybookRequest, request: Request) -> Playbook:
    try:
        playbook, _ = derive_playbook(body.scorecards, _judge(request))
    except JudgeError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)) from error
    return playbook


@router.post("/calls/{conversation_id}/scorecard", response_model=Scorecard)
async def score_stored_call(
    conversation_id: UUID,
    request: Request,
    body: ScoreCallRequest | None = None,
    force: bool = False,
) -> Scorecard:
    lock = request.app.state.scorecard_locks[
        conversation_id.int % len(request.app.state.scorecard_locks)
    ]
    async with lock:
        existing = await _load_scorecard(request, conversation_id)
        if existing is not None and not force:
            return existing

        call = await load_call(request, conversation_id)
        if call is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")

        fixture_rep, fixture_outcome = (
            _fixture_defaults(call.source_external_id) if call.fixture else (None, None)
        )
        rep = (body.rep if body and body.rep is not None else fixture_rep) or "Rep"
        outcome = body.outcome if body and body.outcome is not None else fixture_outcome
        if outcome is None:
            outcome = await _extracted_outcome(request, conversation_id)

        transcript = transcript_from_segments(
            call.source_external_id,
            rep,
            outcome,
            [segment.model_dump() for segment in call.segments],
        )
        try:
            scorecard, _ = await asyncio.to_thread(score_call, transcript, _judge(request))
        except JudgeError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)
            ) from error

        scorecard.conversation_id = str(conversation_id)
        await _save_scorecard(request, conversation_id, scorecard)
        return scorecard


@router.get("/calls/{conversation_id}/scorecard", response_model=Scorecard)
async def get_stored_scorecard(conversation_id: UUID, request: Request) -> Scorecard:
    scorecard = await _load_scorecard(request, conversation_id)
    if scorecard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scorecard not found")
    return scorecard


@router.get("/scorecards", response_model=list[Scorecard])
async def list_stored_scorecards(request: Request) -> list[Scorecard]:
    return await _load_scorecards(request)


@router.post("/playbook/derive", response_model=Playbook)
async def derive_stored_playbook(request: Request) -> Playbook:
    scorecards = await _load_scorecards(request)
    if not scorecards:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No scorecards to learn from",
        )
    try:
        playbook, _ = await asyncio.to_thread(derive_playbook, scorecards, _judge(request))
    except JudgeError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)) from error
    request.app.state.playbook = playbook
    return playbook


@router.get("/playbook/latest", response_model=Playbook)
async def latest_playbook(request: Request) -> Playbook:
    playbook = request.app.state.playbook
    if playbook is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No playbook derived yet",
        )
    return playbook
