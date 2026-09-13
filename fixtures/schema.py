from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


Outcome = Literal["won", "stalled", "lost", "no_show"]
DealStage = Literal["discovery", "evaluation", "proposal", "closed_won", "closed_lost"]
ObjectionHandling = Literal["handled", "partial", "ignored", "none_raised"]
RiskFlagKind = Literal["overclaim", "pressure", "unverifiable"]


class Rep(BaseModel):
    name: str
    role: str
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)


class Pricing(BaseModel):
    currency: Literal["AUD"]
    discovery_phase_aud_low: int
    discovery_phase_aud_high: int
    build_project_aud_low: int
    build_project_aud_high: int
    managed_optimisation_monthly_aud_low: int
    managed_optimisation_monthly_aud_high: int


class VoiceConfig(BaseModel):
    rep: dict[str, str]
    prospect_default: str
    prospect_overrides: dict[str, str] = Field(default_factory=dict)


class Seller(BaseModel):
    name: str
    description: str
    location: str
    team_size: int
    reps: list[Rep]
    pricing: Pricing
    voice_config_notes: str
    voices: VoiceConfig


class Prospect(BaseModel):
    name: str
    role: str
    email: str
    phone: str


class Company(BaseModel):
    name: str
    industry: str
    headcount: int
    location: str
    domain: str


class Turn(BaseModel):
    speaker: Literal["rep", "prospect"]
    name: str
    text: str = Field(min_length=1, max_length=600)


class CallScript(BaseModel):
    model_config = ConfigDict(extra="forbid")

    call_id: str
    seller: str
    rep: str
    prospect: Prospect
    company: Company
    channel: Literal["phone"]
    scheduled_at: datetime
    duration_target_seconds: int
    outcome: Outcome
    demo: bool = False
    deal_value_aud: int | None
    trigger: str | None
    turns: list[Turn]
    audio_seconds: float | None = None

    @field_validator("turns")
    @classmethod
    def speakers_alternate(cls, turns: list[Turn]) -> list[Turn]:
        for previous, current in zip(turns, turns[1:]):
            if previous.speaker == current.speaker:
                raise ValueError("turn speakers must alternate")
        return turns


class ContactExtraction(BaseModel):
    name: str
    role: str
    email: str
    phone: str


class CompanyExtraction(BaseModel):
    name: str
    industry: str
    headcount: int
    location: str


class DealExtraction(BaseModel):
    stage: DealStage
    value_aud: int
    outcome: Outcome


class ObjectionExtraction(BaseModel):
    text: str
    handling: Literal["handled", "partial", "ignored"]


class NextStep(BaseModel):
    description: str
    due: date | None = None


class ExpectedExtraction(BaseModel):
    contact: ContactExtraction
    company: CompanyExtraction
    deal: DealExtraction
    promises: list[str]
    objections: list[ObjectionExtraction]
    next_step: NextStep | None = None


class ExpectedScorecard(BaseModel):
    discovery_questions: int
    next_step_secured: bool
    objection_handling: ObjectionHandling
    rep_talk_ratio: float = Field(ge=0, le=1)
    notes: str


class ICPSignals(BaseModel):
    industry: str
    headcount_band: str
    role: str
    trigger: str | None = None


class RiskFlag(BaseModel):
    turn_index: int = Field(ge=1)
    text: str
    kind: RiskFlagKind


class Expected(BaseModel):
    model_config = ConfigDict(extra="forbid")

    call_id: str
    extraction: ExpectedExtraction
    scorecard: ExpectedScorecard
    icp_signals: ICPSignals
    risk_flags: list[RiskFlag] = Field(default_factory=list)
