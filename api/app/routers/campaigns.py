from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from functools import partial
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, field_validator

from app.routers import deliveries
from app.services.campaigns import (
    Campaign,
    CampaignClaim,
    CampaignConflictError,
    CampaignItem,
    CampaignItemResult,
    CampaignStoreError,
    new_campaign_id,
)
from app.services.email_delivery import EmailDeliveryPayload

router = APIRouter(prefix="/campaigns", tags=["campaigns"])
CAMPAIGN_SIZE_LIMIT = 25
CAMPAIGN_RUN_LIMIT = 8
CAMPAIGN_STORE_SECONDS = 5
CAMPAIGN_RETRY_DELAY = timedelta(minutes=5)


class CampaignCreate(BaseModel):
    campaign_id: UUID = Field(default_factory=new_campaign_id)
    name: str = Field(min_length=1, max_length=120)
    draft_ids: list[UUID] = Field(min_length=1, max_length=CAMPAIGN_SIZE_LIMIT)
    scheduled_for: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_by: str = Field(min_length=1, max_length=120)

    @field_validator("name", "created_by")
    @classmethod
    def text_is_trimmed(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("value must not be blank")
        return stripped

    @field_validator("draft_ids")
    @classmethod
    def draft_ids_are_unique(cls, value: list[UUID]) -> list[UUID]:
        if len(set(value)) != len(value):
            raise ValueError("draft_ids must not contain duplicates")
        return value

    @field_validator("scheduled_for")
    @classmethod
    def schedule_has_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("scheduled_for must include a timezone")
        return value.astimezone(UTC)


class CampaignRunRequest(BaseModel):
    campaign_id: UUID | None = None
    limit: int = Field(default=CAMPAIGN_RUN_LIMIT, ge=1, le=CAMPAIGN_RUN_LIMIT)


class CampaignResponse(BaseModel):
    id: UUID
    name: str
    status: str
    scheduled_for: datetime
    created_by: str
    created_at: datetime
    updated_at: datetime
    counts: dict[str, int]
    items: list[CampaignItem]

    @classmethod
    def from_campaign(cls, campaign: Campaign) -> CampaignResponse:
        return cls(**campaign.model_dump(), counts=campaign.counts)


class CampaignRunResponse(BaseModel):
    claimed_count: int
    campaign: CampaignResponse | None = None


async def _store_call(request: Request, method: str, *args: Any, **kwargs: Any) -> Any:
    slots = request.app.state.campaign_store_slots
    try:
        await asyncio.wait_for(slots.acquire(), timeout=0.1)
    except TimeoutError as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Campaign storage capacity is busy",
        ) from error
    release_on_completion = False
    loop = asyncio.get_running_loop()
    function = getattr(request.app.state.campaign_store, method)
    future = loop.run_in_executor(
        request.app.state.campaign_store_executor, partial(function, *args, **kwargs)
    )

    def release_after_background_work(done: asyncio.Future[Any]) -> None:
        try:
            done.exception()
        except (asyncio.CancelledError, Exception):
            pass
        loop.call_soon_threadsafe(slots.release)

    try:
        try:
            async with asyncio.timeout(CAMPAIGN_STORE_SECONDS):
                return await asyncio.shield(future)
        except TimeoutError as error:
            future.add_done_callback(release_after_background_work)
            release_on_completion = True
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The campaign store timed out",
            ) from error
        except asyncio.CancelledError:
            future.add_done_callback(release_after_background_work)
            release_on_completion = True
            raise
        except CampaignConflictError as error:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
        except CampaignStoreError as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The campaign store is unavailable",
            ) from error
        except HTTPException:
            raise
        except Exception as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The campaign store is unavailable",
            ) from error
    finally:
        if not release_on_completion:
            slots.release()


async def _validate_membership(request: Request, draft_ids: list[UUID]) -> None:
    for draft_id in draft_ids:
        draft = await deliveries._load(request, draft_id)
        if draft is None:
            raise HTTPException(status_code=404, detail=f"Draft {draft_id} was not found")
        if draft.status != "approved":
            raise HTTPException(
                status_code=409,
                detail=f"Draft {draft_id} must be approved and unsent before enrollment",
            )
        try:
            EmailDeliveryPayload(
                draft_id=str(draft.id),
                recipient_email=draft.recipient_email,
                subject=draft.subject,
                body=draft.body,
            )
        except ValueError as error:
            raise HTTPException(
                status_code=409,
                detail=f"Draft {draft_id} does not fit the delivery contract",
            ) from error


@router.get("", response_model=list[CampaignResponse])
async def list_campaigns(
    request: Request, limit: Annotated[int, Query(ge=1, le=100)] = 50
) -> list[CampaignResponse]:
    records = await _store_call(request, "list", limit=limit)
    return [CampaignResponse.from_campaign(campaign) for campaign in records]


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: UUID, request: Request) -> CampaignResponse:
    campaign = await _store_call(request, "get", campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignResponse.from_campaign(campaign)


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    body: CampaignCreate,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> CampaignResponse:
    deliveries._authorise(request, ingest_token)
    await _validate_membership(request, body.draft_ids)
    try:
        campaign = await _store_call(
            request,
            "create",
            campaign_id=body.campaign_id,
            name=body.name,
            scheduled_for=body.scheduled_for,
            created_by=body.created_by,
            draft_ids=body.draft_ids,
        )
    except HTTPException as error:
        if error.status_code != status.HTTP_409_CONFLICT:
            raise
        existing = await _store_call(request, "get", body.campaign_id)
        if (
            existing is None
            or existing.name != body.name
            or existing.created_by != body.created_by
            or existing.scheduled_for != body.scheduled_for
            or [item.draft_id for item in existing.items] != body.draft_ids
        ):
            raise
        campaign = existing
    return CampaignResponse.from_campaign(campaign)


def _campaign_result(item: deliveries.BatchDeliveryItem) -> CampaignItemResult:
    if item.outcome == "sent":
        state = "sent"
        next_attempt_at = None
    elif item.retryable:
        state = "retryable"
        next_attempt_at = datetime.now(UTC) + CAMPAIGN_RETRY_DELAY
    elif item.reconciliation_required:
        state = "reconcile"
        next_attempt_at = None
    else:
        state = "failed"
        next_attempt_at = None
    return CampaignItemResult(
        draft_id=item.draft_id,
        state=state,
        outcome=item.outcome,
        http_status=item.http_status,
        detail=item.detail,
        retryable=item.retryable,
        reconciliation_required=item.reconciliation_required,
        receipt=item.receipt.model_dump(mode="json") if item.receipt else None,
        next_attempt_at=next_attempt_at,
    )


async def _run_claim(request: Request, claim: CampaignClaim) -> Campaign:
    result = await deliveries._deliver_draft_batch(
        deliveries.BatchDeliveryRequest(draft_ids=claim.draft_ids), request
    )
    return await _store_call(
        request,
        "record",
        campaign_id=claim.campaign_id,
        owner=claim.owner,
        results=[_campaign_result(item) for item in result.results],
    )


@router.post("/run-due", response_model=CampaignRunResponse)
async def run_due_campaign(
    body: CampaignRunRequest,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> CampaignRunResponse:
    deliveries._authorise(request, ingest_token)
    deliveries._require_delivery_configuration(request)
    owner = new_campaign_id()
    claim = await _store_call(
        request,
        "claim_due",
        owner=owner,
        limit=body.limit,
        campaign_id=body.campaign_id,
    )
    if claim is None:
        return CampaignRunResponse(claimed_count=0)
    campaign = await _run_claim(request, claim)
    return CampaignRunResponse(
        claimed_count=len(claim.draft_ids),
        campaign=CampaignResponse.from_campaign(campaign),
    )
