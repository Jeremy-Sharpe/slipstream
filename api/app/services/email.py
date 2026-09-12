from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import BaseModel, Field, field_validator

from app.services.draft import DraftResponse

EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class EmailParty(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    email: str = Field(min_length=3, max_length=320)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        canonical = value.strip().casefold()
        if not EMAIL.fullmatch(canonical):
            raise ValueError("Invalid email address")
        return canonical

    @field_validator("name")
    @classmethod
    def canonical_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class EmailIngest(BaseModel):
    source_external_id: str = Field(min_length=1, max_length=255)
    thread_external_id: str = Field(min_length=1, max_length=255)
    direction: Literal["inbound", "outbound"]
    sender: EmailParty
    recipients: list[EmailParty] = Field(min_length=1, max_length=20)
    subject: str = Field(min_length=1, max_length=500)
    body: str = Field(min_length=1, max_length=100_000)
    occurred_at: datetime
    in_reply_to: str | None = Field(default=None, max_length=255)

    @field_validator("subject")
    @classmethod
    def safe_subject(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped or "\r" in stripped or "\n" in stripped:
            raise ValueError("Subject must be a single non-blank line")
        return stripped

    @field_validator("body")
    @classmethod
    def non_blank_body(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Body must not be blank")
        return stripped

    @field_validator("occurred_at")
    @classmethod
    def canonical_time(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


class EmailRecord(EmailIngest):
    id: UUID
    contact_email: str
    deal_external_id: str


def record_email(message: EmailIngest) -> EmailRecord:
    counterpart = message.sender if message.direction == "inbound" else message.recipients[0]
    return EmailRecord(
        **message.model_dump(),
        id=uuid5(NAMESPACE_URL, f"slipstream:email:{message.source_external_id}"),
        contact_email=counterpart.email,
        deal_external_id=f"slipstream-email-thread:{message.thread_external_id}",
    )


def draft_thread_reply(messages: list[EmailRecord]) -> DraftResponse:
    if not messages:
        raise ValueError("Email thread is empty")
    latest = max(messages, key=lambda item: item.occurred_at)
    inbound = [item for item in messages if item.direction == "inbound"]
    anchor = max(inbound, key=lambda item: item.occurred_at) if inbound else latest
    recipient = anchor.sender if anchor.direction == "inbound" else anchor.recipients[0]
    subject = re.sub(r"^(re:\s*)+", "", latest.subject, flags=re.IGNORECASE)
    first_name = recipient.name.split()[0] if recipient.name else "there"
    context = " ".join(anchor.body.split())
    if len(context) > 180:
        context = f"{context[:177].rstrip()}…"
    body = (
        f"Hi {first_name},\n\n"
        f"Thanks for your message about {subject}. I understood your note as: “{context}”\n\n"
        "Would it be useful to confirm the next step and timing together?\n\nBest,"
    )
    return DraftResponse(
        id=uuid5(NAMESPACE_URL, f"slipstream:email-draft:{latest.thread_external_id}"),
        conversation_id=latest.id,
        recipient_name=recipient.name,
        recipient_email=recipient.email,
        subject=f"Re: {subject}",
        body=body,
        model="thread-grounded-template-v1",
    )
