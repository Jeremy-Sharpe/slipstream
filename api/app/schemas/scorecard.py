from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Outcome = Literal["won", "stalled", "lost", "no_show"]
ObjectionHandling = Literal["handled", "partial", "ignored", "none_raised"]
TalkRatioBand = Literal["healthy", "heavy", "monologue"]
Identifier = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
TurnText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10_000)]
EvidenceQuote = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=3, max_length=2_000),
]
Narrative = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=3, max_length=1_000),
]
MAX_TRANSCRIPT_TURNS = 500
MAX_TRANSCRIPT_BYTES = 512 * 1024
MAX_PLAYBOOK_SCORECARDS = 200


class TranscriptTurn(BaseModel):
    speaker: Literal["rep", "prospect"]
    name: PersonName
    text: TurnText


class Transcript(BaseModel):
    call_id: Identifier
    request_id: Identifier | None = None
    rep: PersonName
    outcome: Outcome | None = None
    turns: list[TranscriptTurn] = Field(min_length=1, max_length=MAX_TRANSCRIPT_TURNS)

    @model_validator(mode="after")
    def bounded_payload(self) -> Transcript:
        size = len(self.call_id.encode()) + len(self.rep.encode())
        size += sum(len(turn.name.encode()) + len(turn.text.encode()) for turn in self.turns)
        if size > MAX_TRANSCRIPT_BYTES:
            raise ValueError("Transcript exceeds the supported byte limit")
        return self


class Evidence(BaseModel):
    turn_index: int = Field(ge=1)
    quote: EvidenceQuote


class JudgedScorecard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    discovery_questions: list[Evidence] = Field(max_length=50)
    next_step_secured: bool
    next_step_evidence: Evidence | None = None
    objection_handling: ObjectionHandling
    objection_evidence: list[Evidence] = Field(max_length=50)
    went_well: list[Narrative] = Field(max_length=10)
    to_improve: list[Narrative] = Field(max_length=10)
    summary: Narrative


class Scorecard(BaseModel):
    call_id: Identifier
    request_id: Identifier | None = None
    source_external_id: Identifier | None = None
    source_revision: Identifier | None = None
    scorecard_revision: Identifier | None = None
    source_turns: list[TranscriptTurn] | None = None
    rep: PersonName
    outcome: Outcome | None = None
    discovery_questions: int = Field(ge=0, le=50)
    discovery_evidence: list[Evidence] = Field(max_length=50)
    next_step_secured: bool
    next_step_evidence: Evidence | None = None
    objection_handling: ObjectionHandling
    objection_evidence: list[Evidence] = Field(max_length=50)
    rep_talk_ratio: float = Field(ge=0, le=1)
    talk_ratio_band: TalkRatioBand
    went_well: list[Narrative] = Field(max_length=10)
    to_improve: list[Narrative] = Field(max_length=10)
    summary: Narrative
    model: Identifier
    rubric_version: Identifier
    scored_at: datetime

    @model_validator(mode="after")
    def internally_consistent(self) -> Scorecard:
        unique_discovery = {item.turn_index for item in self.discovery_evidence}
        if self.discovery_questions != len(unique_discovery) or len(self.discovery_evidence) != len(
            unique_discovery
        ):
            raise ValueError("Discovery count must match distinct evidence")
        if self.next_step_secured != (self.next_step_evidence is not None):
            raise ValueError("Next-step verdict must match its evidence")
        if self.objection_handling == "none_raised" and self.objection_evidence:
            raise ValueError("No-objection verdict cannot include objection evidence")
        if self.objection_handling != "none_raised" and not self.objection_evidence:
            raise ValueError("Objection verdict requires evidence")
        expected_band = (
            "healthy"
            if self.rep_talk_ratio < 0.50
            else "heavy"
            if self.rep_talk_ratio <= 0.60
            else "monologue"
        )
        if self.talk_ratio_band != expected_band:
            raise ValueError("Talk-ratio band does not match the ratio")
        return self


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
    behaviour: Narrative
    why_it_matters: Narrative
    call_ids: list[Identifier] = Field(min_length=1, max_length=5)
    quotes: list[EvidenceQuote] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def paired_citations(self) -> WinningPattern:
        if len(self.call_ids) != len(self.quotes):
            raise ValueError("Each playbook quote must identify its supporting call")
        return self


class JudgedPlaybook(BaseModel):
    model_config = ConfigDict(extra="forbid")

    patterns: list[WinningPattern] = Field(max_length=5)
    coaching_focus: list[Narrative] = Field(max_length=10)


class PlaybookSource(BaseModel):
    call_id: Identifier
    source_external_id: Identifier
    source_revision: Identifier
    scorecard_revision: Identifier
    rubric_version: Identifier
    outcome: Outcome | None = None


class Playbook(BaseModel):
    cohort_revision: Identifier
    sources: list[PlaybookSource] = Field(min_length=2, max_length=MAX_PLAYBOOK_SCORECARDS)
    stats: list[OutcomeStats]
    reps: list[RepProfile]
    patterns: list[WinningPattern]
    coaching_focus: list[str]
    model: str
    generated_at: datetime

    @model_validator(mode="after")
    def consistent_cohort(self) -> Playbook:
        ids = [source.call_id for source in self.sources]
        revisions = [source.source_revision for source in self.sources]
        rubrics = {source.rubric_version for source in self.sources}
        outcomes = [source.outcome for source in self.sources]
        stats = {item.outcome_group: item.calls for item in self.stats}
        if len(ids) != len(set(ids)) or len(revisions) != len(set(revisions)):
            raise ValueError("Playbook sources must be distinct revisions")
        if len(rubrics) != 1 or any(
            outcome not in {"won", "lost", "stalled"} for outcome in outcomes
        ):
            raise ValueError("Playbook sources must use one rubric and eligible outcomes")
        won = sum(outcome == "won" for outcome in outcomes)
        not_won = len(outcomes) - won
        if (
            set(stats) != {"won", "not_won"}
            or stats["won"] != won
            or stats["not_won"] != not_won
            or not won
            or not not_won
        ):
            raise ValueError("Playbook statistics must match source outcomes")
        cohort_payload = json.dumps(
            [
                source.model_dump(mode="json")
                for source in sorted(self.sources, key=lambda item: item.call_id)
            ],
            sort_keys=True,
            separators=(",", ":"),
        )
        expected_revision = hashlib.sha256(cohort_payload.encode("utf-8")).hexdigest()
        if self.cohort_revision != expected_revision:
            raise ValueError("Playbook cohort revision must match its sources")
        return self
