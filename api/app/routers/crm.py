from __future__ import annotations

import asyncio
import secrets
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import ValidationError

from app.routers.extractions import load_extraction
from app.services.crm_webhook import (
    CrmSyncReceipt,
    CrmWebhookDeliveryError,
    CrmWebhookOutcomeUnknownError,
    build_crm_payload,
    deliver_crm_payload,
    delivery_identity,
)

router = APIRouter(prefix="/calls", tags=["crm"])
CRM_SYNC_ADMISSION_WAIT_SECONDS = 0.1
CRM_SYNC_TOTAL_SECONDS = 15


def _authorise(request: Request, token: str | None) -> None:
    required = request.app.state.settings.ingest_token
    if (
        required is None
        or token is None
        or not secrets.compare_digest(token.encode(), required.get_secret_value().encode())
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingest token")


@router.post("/{conversation_id}/crm-sync", response_model=CrmSyncReceipt)
async def sync_extraction_to_crm(
    conversation_id: UUID,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> CrmSyncReceipt:
    settings = request.app.state.settings
    if settings.crm_webhook_url is None or settings.crm_webhook_secret is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRM webhook integration is not configured",
        )
    _authorise(request, ingest_token)
    extraction = await load_extraction(request, conversation_id)
    if extraction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extraction not found")
    try:
        payload = build_crm_payload(extraction)
    except ValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The extracted fields do not fit the CRM delivery contract",
        ) from error
    receipt_key = delivery_identity(payload)
    admission = request.app.state.crm_sync_admission_slots
    try:
        await asyncio.wait_for(admission.acquire(), timeout=CRM_SYNC_ADMISSION_WAIT_SECONDS)
    except TimeoutError as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="CRM sync capacity is busy; retry this exact update",
        ) from error
    try:
        async with asyncio.timeout(CRM_SYNC_TOTAL_SECONDS):
            lock = request.app.state.crm_sync_locks[
                conversation_id.int % len(request.app.state.crm_sync_locks)
            ]
            async with lock:
                cached = request.app.state.crm_sync_receipts.get(receipt_key)
                if cached is not None:
                    return cached
                receipt = await deliver_crm_payload(
                    request.app.state.crm_webhook_client,
                    url=settings.crm_webhook_url,
                    secret=settings.crm_webhook_secret.get_secret_value(),
                    payload=payload,
                )
                request.app.state.crm_sync_receipts[receipt_key] = receipt
                if len(request.app.state.crm_sync_receipts) > 1000:
                    request.app.state.crm_sync_receipts.popitem(last=False)
                return receipt
    except CrmWebhookDeliveryError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The CRM update could not be delivered",
        ) from error
    except CrmWebhookOutcomeUnknownError as error:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The CRM delivery outcome is unknown",
        ) from error
    except TimeoutError as error:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The CRM delivery outcome is unknown",
        ) from error
    finally:
        admission.release()
