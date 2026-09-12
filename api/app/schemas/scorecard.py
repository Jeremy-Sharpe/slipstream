from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Outcome = Literal["won", "stalled", "lost", "no_show"]
ObjectionHandling = Literal["handled", "partial", "ignored", "none_raised"]
TalkRatioBand = Literal["healthy", "heavy", "monologue"]


class TranscriptTurn(BaseModel):
    speaker: Literal["rep", "prospect"]
    name: str
    text: str


class Transcript(BaseModel):
    call_id: str
    rep: str
    outcome: Outcome | None = None
    turns: list[TranscriptTurn]


class Evidence(BaseModel):
    turn_index: int = Field(ge=1)
    quote: str


class JudgedScorecard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    discovery_questions: list[Evidence]
    next_step_secured: bool
    next_step_evidence: Evidence | None = None
    objection_handling: ObjectionHandling
    objection_evidence: list[Evidence]
    went_well: list[str]
    to_improve: list[str]
    summary: str


class Scorecard(BaseModel):
    call_id: str
    conversation_id: str | None = None
    rep: str
    outcome: Outcome | None = None
    discovery_questions: int
    discovery_evidence: list[Evidence]
    next_step_secured: bool
    next_step_evidence: Evidence | None = None
    objection_handling: ObjectionHandling
    objection_evidence: list[Evidence]
    rep_talk_ratio: float
    talk_ratio_band: TalkRatioBand
    went_well: list[str]
    to_improve: list[str]
    summary: str
    model: str
    rubric_version: str
    scored_at: datetime


class OutcomeStats(BaseModel):
    outcome_group: Literal["won", "not_won"]
    calls: int
    mean_discovery: float
    next_step_rate: float
    objection_handled_rate: float
    mean_talk_ratio: float


class RepProfile(BaseModel):
    rep: str
    calls: int
    won: int
    mean_discovery: float
    next_step_rate: float
    mean_talk_ratio: float


class WinningPattern(BaseModel):
    behaviour: str
    why_it_matters: str
    call_ids: list[str]
    quotes: list[str]


class JudgedPlaybook(BaseModel):
    model_config = ConfigDict(extra="forbid")

    patterns: list[WinningPattern]
    coaching_focus: list[str]


class Playbook(BaseModel):
    stats: list[OutcomeStats]
    reps: list[RepProfile]
    patterns: list[WinningPattern]
    coaching_focus: list[str]
    model: str
    generated_at: datetime
