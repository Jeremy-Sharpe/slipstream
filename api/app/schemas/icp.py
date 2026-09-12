from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

JsonDict = dict[str, Any]


class IcpEvidenceItem(BaseModel):
    attribute: str
    deal_ids: list[str]
    why: str


class IcpProfile(BaseModel):
    summary: str
    industries: list[str]
    headcount_band: str
    roles: list[str]
    triggers: list[str]
    disqualifiers: list[str]
    evidence: list[IcpEvidenceItem]
    confidence: float = Field(ge=0, le=1)
    origami_brief: str


class StoredIcpProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID | str
    version: int
    status: Literal["processing", "ready", "failed"] = "ready"
    profile: IcpProfile
    evidence: list[IcpEvidenceItem]
    origami_brief: str
    model: str | None = None
    embedding_model: str | None = None
    created_at: datetime | None = None


class IcpDeriveRequest(BaseModel):
    include_demo: bool = False


class FixtureHistoryCounts(BaseModel):
    companies: int
    contacts: int
    deals: int
    outcomes: dict[str, int]


class DealRecord(BaseModel):
    id: UUID | str
    company_id: UUID | str | None = None
    primary_contact_id: UUID | str | None = None
    company_name: str | None = None
    company_domain: str | None = None
    industry: str | None = None
    employee_count: int | None = None
    location: str | None = None
    contact_name: str | None = None
    contact_role: str | None = None
    name: str
    stage: str
    outcome: str
    amount: float | None = None
    currency: str = "AUD"
    owner_name: str | None = None
    summary: str | None = None
    close_date: str | None = None
    crm_external_id: str | None = None
    embedding: list[float] | None = None
    embedding_model: str | None = None
    metadata: JsonDict = Field(default_factory=dict)
