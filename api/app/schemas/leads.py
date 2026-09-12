from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

JsonDict = dict[str, Any]
LeadStatus = Literal["new", "reviewed", "approved", "contacted", "rejected"]


class LeadIn(BaseModel):
    icp_profile_id: UUID | str | None = None
    company_name: str
    company_domain: str | None = None
    person_name: str | None = None
    title: str | None = None
    email: str | None = None
    linkedin_url: str | None = None
    industry: str | None = None
    employee_count: int | None = Field(default=None, ge=0)
    location: str | None = None
    origami_row_id: str
    origami_relevance_score: float | None = None
    similarity_score: float | None = None
    embedding: list[float] | None = None
    embedding_model: str | None = None
    metadata: JsonDict = Field(default_factory=dict)


class Lead(LeadIn):
    model_config = ConfigDict(from_attributes=True)

    id: UUID | str
    status: LeadStatus = "new"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class LeadSourceRequest(BaseModel):
    icp_profile_id: UUID | str | None = None
    count: int = Field(default=10, ge=1, le=100)
    quality: Literal["fast", "accurate"] = "fast"


class LeadSourceAccepted(BaseModel):
    origami_job_id: str
    icp_profile_id: UUID | str
    status: str


class LeadSourceStatus(BaseModel):
    status: str
    phase: str | None = None
    credits: JsonDict | None = None
    next_poll_at: datetime | str | None = None


class OutreachRequest(BaseModel):
    rep_name: str


class OutreachApproveRequest(BaseModel):
    actor: str
    draft_id: UUID | str


class OutreachDraftContent(BaseModel):
    subject: str
    body: str


class Draft(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID | str
    lead_id: UUID | str
    deal_id: UUID | str | None = None
    conversation_id: UUID | str | None = None
    kind: Literal["outreach"] = "outreach"
    recipient_name: str | None = None
    recipient_email: str | None = None
    subject: str
    body: str
    status: Literal["draft", "approved", "sent"] = "draft"
    model: str | None = None
    prompt_version: str | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
    sent_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
