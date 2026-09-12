from __future__ import annotations

import threading
from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
from typing import Any, Literal, Protocol
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.database import create_supabase

CampaignStatus = Literal["scheduled", "running", "paused", "completed", "attention"]
CampaignItemState = Literal["queued", "running", "sent", "retryable", "failed", "reconcile"]


class CampaignItem(BaseModel):
    position: int = Field(ge=0)
    draft_id: UUID
    state: CampaignItemState
    outcome: str | None = None
    http_status: int | None = None
    detail: str | None = None
    retryable: bool = False
    reconciliation_required: bool = False
    receipt: dict[str, Any] | None = None
    attempt_count: int = Field(default=0, ge=0)
    next_attempt_at: datetime | None = None
    last_attempt_at: datetime | None = None


class Campaign(BaseModel):
    id: UUID
    name: str
    status: CampaignStatus
    scheduled_for: datetime
    created_by: str
    created_at: datetime
    updated_at: datetime
    items: list[CampaignItem]

    @property
    def counts(self) -> dict[str, int]:
        return {
            state: sum(item.state == state for item in self.items)
            for state in ("queued", "running", "sent", "retryable", "failed", "reconcile")
        }


class CampaignClaim(BaseModel):
    campaign_id: UUID
    owner: UUID
    draft_ids: list[UUID]


class CampaignItemResult(BaseModel):
    draft_id: UUID
    state: CampaignItemState
    outcome: str
    http_status: int
    detail: str | None = None
    retryable: bool = False
    reconciliation_required: bool = False
    receipt: dict[str, Any] | None = None
    next_attempt_at: datetime | None = None


class CampaignStoreError(RuntimeError):
    pass


class CampaignConflictError(CampaignStoreError):
    pass


class CampaignStore(Protocol):
    def create(
        self,
        *,
        campaign_id: UUID,
        name: str,
        scheduled_for: datetime,
        created_by: str,
        draft_ids: list[UUID],
    ) -> Campaign: ...

    def list(self, *, limit: int) -> list[Campaign]: ...

    def get(self, campaign_id: UUID) -> Campaign | None: ...

    def claim_due(
        self,
        *,
        owner: UUID,
        limit: int,
        campaign_id: UUID | None = None,
    ) -> CampaignClaim | None: ...

    def record(
        self,
        *,
        campaign_id: UUID,
        owner: UUID,
        results: list[CampaignItemResult],
    ) -> Campaign: ...


class InMemoryCampaignStore:
    def __init__(self) -> None:
        self._campaigns: dict[UUID, Campaign] = {}
        self._owners: dict[UUID, UUID] = {}
        self._lease_until: dict[UUID, datetime] = {}
        self._lock = threading.RLock()

    def create(
        self,
        *,
        campaign_id: UUID,
        name: str,
        scheduled_for: datetime,
        created_by: str,
        draft_ids: list[UUID],
    ) -> Campaign:
        now = datetime.now(UTC)
        campaign = Campaign(
            id=campaign_id,
            name=name,
            status="scheduled",
            scheduled_for=scheduled_for,
            created_by=created_by,
            created_at=now,
            updated_at=now,
            items=[
                CampaignItem(
                    position=position,
                    draft_id=draft_id,
                    state="queued",
                    next_attempt_at=scheduled_for,
                )
                for position, draft_id in enumerate(draft_ids)
            ],
        )
        with self._lock:
            if campaign_id in self._campaigns:
                raise CampaignConflictError("Campaign already exists")
            self._campaigns[campaign_id] = campaign
        return campaign.model_copy(deep=True)

    def list(self, *, limit: int) -> list[Campaign]:
        with self._lock:
            rows = sorted(
                self._campaigns.values(), key=lambda row: row.created_at, reverse=True
            )[:limit]
            return [row.model_copy(deep=True) for row in rows]

    def get(self, campaign_id: UUID) -> Campaign | None:
        with self._lock:
            row = self._campaigns.get(campaign_id)
            return row.model_copy(deep=True) if row else None

    def claim_due(
        self,
        *,
        owner: UUID,
        limit: int,
        campaign_id: UUID | None = None,
    ) -> CampaignClaim | None:
        now = datetime.now(UTC)
        with self._lock:
            candidates: Iterable[Campaign]
            if campaign_id is None:
                candidates = sorted(self._campaigns.values(), key=lambda row: row.scheduled_for)
            else:
                candidate = self._campaigns.get(campaign_id)
                candidates = [candidate] if candidate else []
            for campaign in candidates:
                if campaign.status in {"paused", "completed", "attention"}:
                    continue
                lease_until = self._lease_until.get(campaign.id)
                if lease_until is not None and lease_until > now:
                    continue
                if campaign.scheduled_for > now:
                    continue
                stale = [item for item in campaign.items if item.state == "running"]
                for item in stale:
                    item.state = "retryable"
                    item.retryable = True
                    item.next_attempt_at = now
                due = [
                    item
                    for item in campaign.items
                    if item.state in {"queued", "retryable"}
                    and (item.next_attempt_at is None or item.next_attempt_at <= now)
                ][:limit]
                if not due:
                    campaign.status = self._terminal_status(campaign.items)
                    campaign.updated_at = now
                    continue
                for item in due:
                    item.state = "running"
                    item.attempt_count += 1
                    item.last_attempt_at = now
                campaign.status = "running"
                campaign.updated_at = now
                self._owners[campaign.id] = owner
                self._lease_until[campaign.id] = now + timedelta(seconds=75)
                return CampaignClaim(
                    campaign_id=campaign.id,
                    owner=owner,
                    draft_ids=[item.draft_id for item in due],
                )
        return None

    def record(
        self,
        *,
        campaign_id: UUID,
        owner: UUID,
        results: list[CampaignItemResult],
    ) -> Campaign:
        now = datetime.now(UTC)
        with self._lock:
            campaign = self._campaigns.get(campaign_id)
            if campaign is None:
                raise CampaignConflictError("Campaign disappeared while running")
            if self._owners.get(campaign_id) != owner:
                raise CampaignConflictError("Campaign run is no longer owned by this worker")
            by_draft = {item.draft_id: item for item in campaign.items}
            running_ids = {
                item.draft_id for item in campaign.items if item.state == "running"
            }
            result_ids = [result.draft_id for result in results]
            if len(result_ids) != len(set(result_ids)) or set(result_ids) != running_ids:
                raise CampaignConflictError("Campaign results do not match the owned run")
            for result in results:
                item = by_draft.get(result.draft_id)
                if item is None or item.state != "running":
                    raise CampaignConflictError("Campaign item is no longer owned by this run")
                update = result.model_dump(exclude={"draft_id"})
                for key, value in update.items():
                    setattr(item, key, value)
                item.last_attempt_at = now
            campaign.status = self._next_status(campaign.items)
            retry_times = [
                item.next_attempt_at
                for item in campaign.items
                if item.state in {"queued", "retryable"} and item.next_attempt_at is not None
            ]
            if retry_times:
                campaign.scheduled_for = min(retry_times)
            campaign.updated_at = now
            self._owners.pop(campaign_id, None)
            self._lease_until.pop(campaign_id, None)
            return campaign.model_copy(deep=True)

    @staticmethod
    def _terminal_status(items: list[CampaignItem]) -> CampaignStatus:
        if any(item.state in {"failed", "reconcile"} for item in items):
            return "attention"
        return "completed"

    @classmethod
    def _next_status(cls, items: list[CampaignItem]) -> CampaignStatus:
        if any(item.state in {"queued", "retryable", "running"} for item in items):
            return "scheduled"
        return cls._terminal_status(items)


class SupabaseCampaignStore:
    def __init__(self, client: Any) -> None:
        self._client = client

    def create(
        self,
        *,
        campaign_id: UUID,
        name: str,
        scheduled_for: datetime,
        created_by: str,
        draft_ids: list[UUID],
    ) -> Campaign:
        try:
            self._client.rpc(
                "create_email_campaign",
                {
                    "requested_campaign_id": str(campaign_id),
                    "requested_name": name,
                    "requested_scheduled_for": scheduled_for.isoformat(),
                    "requested_created_by": created_by,
                    "requested_draft_ids": [str(draft_id) for draft_id in draft_ids],
                },
            ).execute()
        except Exception as error:
            if getattr(error, "code", None) in {"PT409", "23505"}:
                raise CampaignConflictError("Campaign conflicts with stored state") from error
            raise
        campaign = self.get(campaign_id)
        if campaign is None:
            raise CampaignStoreError("Campaign creation was not readable")
        return campaign

    def list(self, *, limit: int) -> list[Campaign]:
        rows = (
            self._client.table("email_campaigns")
            .select("*,email_campaign_items(*)")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
            .data
        )
        return [self._campaign(row) for row in rows]

    def get(self, campaign_id: UUID) -> Campaign | None:
        rows = (
            self._client.table("email_campaigns")
            .select("*,email_campaign_items(*)")
            .eq("id", str(campaign_id))
            .limit(1)
            .execute()
            .data
        )
        return self._campaign(rows[0]) if rows else None

    def claim_due(
        self,
        *,
        owner: UUID,
        limit: int,
        campaign_id: UUID | None = None,
    ) -> CampaignClaim | None:
        data = self._client.rpc(
            "claim_due_email_campaign",
            {
                "requested_owner": str(owner),
                "requested_limit": limit,
                "requested_campaign_id": str(campaign_id) if campaign_id else None,
            },
        ).execute().data
        return CampaignClaim.model_validate(data) if data else None

    def record(
        self,
        *,
        campaign_id: UUID,
        owner: UUID,
        results: list[CampaignItemResult],
    ) -> Campaign:
        try:
            self._client.rpc(
                "record_email_campaign_results",
                {
                    "requested_campaign_id": str(campaign_id),
                    "requested_owner": str(owner),
                    "requested_results": [result.model_dump(mode="json") for result in results],
                },
            ).execute()
        except Exception as error:
            if getattr(error, "code", None) == "PT409":
                raise CampaignConflictError("Campaign run lost ownership") from error
            raise
        campaign = self.get(campaign_id)
        if campaign is None:
            raise CampaignStoreError("Recorded campaign was not readable")
        return campaign

    @staticmethod
    def _campaign(row: dict[str, Any]) -> Campaign:
        campaign_row = dict(row)
        items = sorted(
            campaign_row.pop("email_campaign_items", []), key=lambda item: item["position"]
        )
        return Campaign.model_validate({**campaign_row, "items": items})


def create_campaign_store(settings: Settings, client: Any | None = None) -> CampaignStore:
    client = client or create_supabase(settings)
    return SupabaseCampaignStore(client) if client is not None else InMemoryCampaignStore()


def new_campaign_id() -> UUID:
    return uuid4()
