from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EvidenceSpan(BaseModel):
    source: Literal["transcript", "fixture_label"] = "transcript"
    sequence: int | None = Field(default=None, ge=0)
    quote: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def transcript_evidence_needs_a_sequence(self) -> EvidenceSpan:
        if self.source == "transcript" and self.sequence is None:
            raise ValueError("Transcript evidence requires a segment sequence")
        return self


class StringField(BaseModel):
    value: str | None = None
    confidence: float = Field(ge=0, le=1)
    evidence: list[EvidenceSpan] = Field(default_factory=list)


class IntegerField(BaseModel):
    value: int | None = None
    confidence: float = Field(ge=0, le=1)
    evidence: list[EvidenceSpan] = Field(default_factory=list)


class ContactFields(BaseModel):
    name: StringField
    email: StringField
    phone: StringField
    title: StringField


class CompanyFields(BaseModel):
    name: StringField
    domain: StringField
    industry: StringField
    employee_count: IntegerField
    location: StringField


class StageField(BaseModel):
    value: Literal["discovery", "demo", "evaluation", "pilot", "procurement", "customer"] | None
    confidence: float = Field(ge=0, le=1)
    evidence: list[EvidenceSpan] = Field(default_factory=list)


class OutcomeField(BaseModel):
    value: Literal["open", "won", "lost", "stalled"] | None
    confidence: float = Field(ge=0, le=1)
    evidence: list[EvidenceSpan] = Field(default_factory=list)


class DealFields(BaseModel):
    stage: StageField
    outcome: OutcomeField
    amount: IntegerField
    currency: Literal["AUD"] = "AUD"


class Objection(BaseModel):
    text: str = Field(min_length=1)
    handling: Literal["handled", "partial", "ignored"]
    confidence: float = Field(ge=0, le=1)
    evidence: list[EvidenceSpan]


class NextStep(BaseModel):
    description: str = Field(min_length=1)
    due_date: date | None = Field(default=None, description="Date when explicitly known")
    owner: str | None = None
    confidence: float = Field(ge=0, le=1)
    evidence: list[EvidenceSpan]


class ExtractionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contact: ContactFields
    company: CompanyFields
    deal: DealFields
    promises: list[StringField]
    objections: list[Objection]
    next_step: NextStep | None
    summary: str = Field(min_length=1, max_length=1200)

    @model_validator(mode="after")
    def summary_is_concise(self) -> ExtractionPayload:
        if len(self.summary.split()) > 120:
            raise ValueError("Summary must not exceed 120 words")
        return self

    @model_validator(mode="after")
    def evidence_quotes_must_match_segments_later(self) -> ExtractionPayload:
        for field in (
            *self.promises,
            self.contact.name,
            self.contact.email,
            self.contact.phone,
            self.contact.title,
            self.company.name,
            self.company.domain,
            self.company.industry,
            self.company.employee_count,
            self.company.location,
            self.deal.amount,
            self.deal.stage,
            self.deal.outcome,
        ):
            if field.value is None and field.evidence:
                raise ValueError("Null extracted fields cannot have evidence")
        return self


class ExtractionResult(ExtractionPayload):
    conversation_id: UUID
    source: Literal["fixture_labels", "claude"]
    model: str
    prompt_version: str
