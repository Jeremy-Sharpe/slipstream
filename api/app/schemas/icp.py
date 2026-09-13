from datetime import UTC, datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.json_schema import SkipJsonSchema

JsonDict = dict[str, Any]


class IcpEvidenceItem(BaseModel):
    attribute: str
    deal_ids: list[str]
    why: str


class IcpSourceSummary(BaseModel):
    deals: int = Field(ge=0)
    calls: int = Field(ge=0)
    emails: int = Field(ge=0)
    outcome_labelled: int = Field(ge=0)


class IcpSourceDealRef(BaseModel):
    deal_id: str = Field(min_length=1, max_length=128)
    company_name: str = Field(min_length=1, max_length=120)
    call_ids: list[Annotated[str, Field(min_length=1, max_length=200)]] = Field(
        default_factory=list, max_length=20
    )


class IcpEvidenceInventory(IcpSourceSummary):
    won_deals: int = Field(ge=0)
    contrast_deals: int = Field(ge=0)
    active_deals: int = Field(ge=0)
    ready_to_derive: bool


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
    source_summary: IcpSourceSummary | None = None
    cohort_revision: SkipJsonSchema[str | None] = Field(
        default=None, pattern=r"^[0-9a-f]{64}$"
    )


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
    source_deals: list[IcpSourceDealRef] = Field(default_factory=list, max_length=100)


class IcpDeriveRequest(BaseModel):
    include_demo: bool = False


class IcpFreshness(BaseModel):
    profile_id: UUID | str
    profile_version: int = Field(ge=1)
    status: Literal["current", "stale", "legacy"]
    derived_cohort_revision: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    current_cohort_revision: str = Field(pattern=r"^[0-9a-f]{64}$")
    source_summary: IcpSourceSummary
    deals_added: int
    outcome_labels_added: int
    leads_on_profile: int = Field(ge=0)
    leads_needing_rescore: int = Field(ge=0)
    reason: str


class FixtureHistoryCounts(BaseModel):
    companies: int
    contacts: int
    deals: int
    outcomes: dict[str, int]


class InteractionEvidence(BaseModel):
    source_external_id: str
    channel: Literal["call", "email"]
    direction: Literal["inbound", "outbound", "unknown"]
    occurred_at: datetime
    subject: str
    content: str = Field(min_length=1, max_length=1200)

    @field_validator("occurred_at")
    @classmethod
    def canonical_time(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


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
    interactions: list[InteractionEvidence] = Field(default_factory=list, max_length=20)
    updated_at: datetime | None = None

    @field_validator("updated_at")
    @classmethod
    def canonical_updated_time(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
