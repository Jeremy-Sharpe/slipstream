from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.schemas.scorecard import Playbook, Scorecard, Transcript
from app.services.score import JudgeError, derive_playbook, score_call

router = APIRouter(tags=["scorecards"])


class PlaybookRequest(BaseModel):
    scorecards: list[Scorecard]


def _judge(request: Request):
    try:
        return request.app.state.judge_factory()
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Anthropic integration is not configured",
        ) from error


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
