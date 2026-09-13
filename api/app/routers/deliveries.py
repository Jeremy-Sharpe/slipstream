from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, Request

from app.services import deliveries
from app.services.email_delivery import EmailDeliveryReceipt

router = APIRouter(prefix="/drafts", tags=["email-delivery"])


@router.post("/{draft_id}/deliver", response_model=EmailDeliveryReceipt)
async def deliver_draft(
    draft_id: UUID,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> EmailDeliveryReceipt:
    deliveries._authorise(request, ingest_token)
    deliveries._require_delivery_configuration(request)
    return await deliveries._deliver_draft(draft_id, request)


@router.post("/deliver-batch", response_model=deliveries.BatchDeliveryResponse)
async def deliver_draft_batch(
    batch: deliveries.BatchDeliveryRequest,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> deliveries.BatchDeliveryResponse:
    return await deliveries.deliver_draft_batch(batch, request, ingest_token)
