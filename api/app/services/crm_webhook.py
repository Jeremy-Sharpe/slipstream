from __future__ import annotations

import hashlib
import hmac
import json
from typing import Literal
from urllib.parse import urlsplit

import httpx
from pydantic import BaseModel, Field

from app.schemas.extraction import ExtractionResult

MAX_RECEIPT_ID_LENGTH = 200


class CrmContact(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=80)
    title: str | None = Field(default=None, max_length=200)


class CrmCompany(BaseModel):
    name: str | None = Field(default=None, max_length=300)
    domain: str | None = Field(default=None, max_length=253)
    industry: str | None = Field(default=None, max_length=200)
    employee_count: int | None = None
    location: str | None = Field(default=None, max_length=300)


class CrmDeal(BaseModel):
    name: str = Field(max_length=500)
    stage: str | None = None
    outcome: str | None = None
    amount: int | None = None
    currency: Literal["AUD"] = "AUD"
    summary: str = Field(max_length=1200)
    next_step: str | None = Field(default=None, max_length=1200)
    next_step_due_date: str | None = None
    next_step_owner: str | None = Field(default=None, max_length=200)


class CrmWebhookPayload(BaseModel):
    schema_version: Literal["2026-09-13"] = "2026-09-13"
    event: Literal["conversation.crm_update.requested"] = "conversation.crm_update.requested"
    conversation_id: str
    source: Literal["fixture_labels", "model"]
    contact: CrmContact
    company: CrmCompany
    deal: CrmDeal


class CrmSyncReceipt(BaseModel):
    conversation_id: str
    status: Literal["delivered"] = "delivered"
    target_host: str
    idempotency_key: str
    provider_request_id: str | None = None


class CrmWebhookDeliveryError(RuntimeError):
    pass


class CrmWebhookOutcomeUnknownError(RuntimeError):
    pass


def build_crm_payload(result: ExtractionResult) -> CrmWebhookPayload:
    company_name = result.company.name.value
    contact_name = result.contact.name.value
    next_step = result.next_step
    return CrmWebhookPayload(
        conversation_id=str(result.conversation_id),
        source=result.source,
        contact=CrmContact(
            name=contact_name,
            email=result.contact.email.value,
            phone=result.contact.phone.value,
            title=result.contact.title.value,
        ),
        company=CrmCompany(
            name=company_name,
            domain=result.company.domain.value,
            industry=result.company.industry.value,
            employee_count=result.company.employee_count.value,
            location=result.company.location.value,
        ),
        deal=CrmDeal(
            name=f"{company_name or contact_name or 'Unqualified'} — follow-up",
            stage=result.deal.stage.value,
            outcome=result.deal.outcome.value,
            amount=result.deal.amount.value,
            currency=result.deal.currency,
            summary=result.summary,
            next_step=next_step.description if next_step else None,
            next_step_due_date=str(next_step.due_date)
            if next_step and next_step.due_date
            else None,
            next_step_owner=next_step.owner if next_step else None,
        ),
    )


def canonical_payload_bytes(payload: CrmWebhookPayload) -> bytes:
    return json.dumps(
        payload.model_dump(mode="json"),
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode()


def delivery_headers(body: bytes, secret: str, conversation_id: str) -> dict[str, str]:
    idempotency_key = _delivery_key(body, conversation_id)
    signed_message = idempotency_key.encode() + b"." + body
    signature = hmac.new(secret.encode(), signed_message, hashlib.sha256).hexdigest()
    return {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotency_key,
        "X-Slipstream-Signature": f"sha256={signature}",
        "X-Slipstream-Schema": "2026-09-13",
    }


def delivery_identity(payload: CrmWebhookPayload) -> str:
    body = canonical_payload_bytes(payload)
    return _delivery_key(body, payload.conversation_id)


def _delivery_key(body: bytes, conversation_id: str) -> str:
    return f"slipstream-crm-{conversation_id}-{hashlib.sha256(body).hexdigest()}"


async def deliver_crm_payload(
    client: httpx.AsyncClient,
    *,
    url: str,
    secret: str,
    payload: CrmWebhookPayload,
) -> CrmSyncReceipt:
    body = canonical_payload_bytes(payload)
    headers = delivery_headers(body, secret, payload.conversation_id)
    try:
        async with client.stream("POST", url, content=body, headers=headers) as response:
            response.raise_for_status()
            request_id = response.headers.get("X-Request-Id")
    except (httpx.TransportError, TimeoutError) as error:
        raise CrmWebhookOutcomeUnknownError("The CRM webhook outcome is unknown") from error
    except httpx.HTTPError as error:
        raise CrmWebhookDeliveryError("The configured CRM webhook rejected the update") from error
    if request_id is not None:
        request_id = request_id.strip()[:MAX_RECEIPT_ID_LENGTH] or None
    return CrmSyncReceipt(
        conversation_id=payload.conversation_id,
        target_host=urlsplit(url).hostname or "configured-webhook",
        idempotency_key=headers["Idempotency-Key"],
        provider_request_id=request_id,
    )
