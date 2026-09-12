from __future__ import annotations

import hashlib
import json
import re
from email.utils import parseaddr
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field, field_validator


class EmailDeliveryPayload(BaseModel):
    draft_id: str = Field(min_length=1, max_length=200)
    recipient_email: str = Field(min_length=3, max_length=320)
    subject: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=1800)

    @field_validator("recipient_email")
    @classmethod
    def recipient_is_a_single_mailbox(cls, value: str) -> str:
        candidate = value.strip()
        _, address = parseaddr(candidate)
        if (
            not re.fullmatch(
                r"[^\s@<>]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}",
                address,
            )
            or address != candidate
            or "\r" in candidate
            or "\n" in candidate
        ):
            raise ValueError("recipient_email must be one valid email address")
        return candidate


class EmailDeliveryReceipt(BaseModel):
    draft_id: str
    status: Literal["sent"] = "sent"
    provider: Literal["resend"] = "resend"
    provider_message_id: str = Field(min_length=1, max_length=200)
    idempotency_key: str = Field(min_length=1, max_length=256)


class EmailDeliveryRejectedError(RuntimeError):
    pass


class EmailDeliveryOutcomeUnknownError(RuntimeError):
    pass


def delivery_payload_sha256(sender: str, payload: EmailDeliveryPayload) -> str:
    encoded = json.dumps(
        {"from": sender, **payload.model_dump(mode="json")},
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return hashlib.sha256(encoded).hexdigest()


def resend_idempotency_key(sender: str, payload: EmailDeliveryPayload) -> str:
    digest = delivery_payload_sha256(sender, payload)
    return f"slipstream-draft-{digest}"


async def send_with_resend(
    client: httpx.AsyncClient,
    *,
    base_url: str,
    api_key: str,
    sender: str,
    payload: EmailDeliveryPayload,
) -> EmailDeliveryReceipt:
    idempotency_key = resend_idempotency_key(sender, payload)
    try:
        async with client.stream(
            "POST",
            f"{base_url.rstrip('/')}/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Idempotency-Key": idempotency_key,
            },
            json={
                "from": sender,
                "to": [payload.recipient_email],
                "subject": payload.subject,
                "text": payload.body,
            },
        ) as response:
            if response.status_code >= 500 or response.status_code in {408, 409, 425, 429}:
                raise EmailDeliveryOutcomeUnknownError("Email delivery outcome is unknown")
            response.raise_for_status()
            raw = bytearray()
            async for chunk in response.aiter_bytes():
                raw.extend(chunk)
                if len(raw) > 4096:
                    raise EmailDeliveryOutcomeUnknownError(
                        "Email provider returned an unreadable receipt"
                    )
    except httpx.TransportError as error:
        raise EmailDeliveryOutcomeUnknownError("Email delivery outcome is unknown") from error
    except httpx.HTTPStatusError as error:
        raise EmailDeliveryRejectedError("Email provider rejected the message") from error
    try:
        response_payload: Any = json.loads(raw)
    except ValueError as error:
        raise EmailDeliveryOutcomeUnknownError(
            "Email provider returned an unreadable receipt"
        ) from error
    message_id = response_payload.get("id") if isinstance(response_payload, dict) else None
    if not isinstance(message_id, str) or not message_id.strip() or len(message_id) > 200:
        raise EmailDeliveryOutcomeUnknownError("Email provider returned an unreadable receipt")
    return EmailDeliveryReceipt(
        draft_id=payload.draft_id,
        provider_message_id=message_id.strip(),
        idempotency_key=idempotency_key,
    )
