from __future__ import annotations

import hashlib
import json
import re
from datetime import UTC, datetime
from typing import Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import BaseModel, Field, field_validator, model_validator

from app.services.draft import DraftResponse

EMAIL = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)
EXTERNAL_ID = r"^[A-Za-z0-9][A-Za-z0-9._:@+-]*$"


def scoped_email_id(kind: Literal["source", "thread"], *components: str) -> str:
    encoded = json.dumps([kind, *components], ensure_ascii=False, separators=(",", ":"))
    return f"email:{kind}:{hashlib.sha256(encoded.encode()).hexdigest()}"


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
        stripped = value.strip() if value is not None else ""
        return stripped or None


class EmailRecipient(EmailParty):
    kind: Literal["to", "cc", "bcc"] = "to"


class EmailIngest(BaseModel):
    provider: str = Field(min_length=1, max_length=40, pattern=EXTERNAL_ID)
    mailbox_external_id: str = Field(min_length=1, max_length=255, pattern=EXTERNAL_ID)
    mailbox: EmailParty
    source_external_id: str = Field(min_length=1, max_length=255, pattern=EXTERNAL_ID)
    thread_external_id: str = Field(min_length=1, max_length=255, pattern=EXTERNAL_ID)
    direction: Literal["inbound", "outbound"]
    sender: EmailParty
    recipients: list[EmailRecipient] = Field(min_length=1, max_length=20)
    subject: str = Field(min_length=1, max_length=500)
    body: str = Field(min_length=1, max_length=100_000)
    occurred_at: datetime
    in_reply_to: str | None = Field(default=None, max_length=255, pattern=EXTERNAL_ID)

    @field_validator("provider")
    @classmethod
    def canonical_provider(cls, value: str) -> str:
        return value.casefold()

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

    @model_validator(mode="after")
    def validate_mailbox_direction(self) -> EmailIngest:
        mailbox = self.mailbox.email
        recipient_emails = {party.email for party in self.recipients}
        if self.direction == "inbound":
            if self.sender.email == mailbox or mailbox not in recipient_emails:
                raise ValueError("Inbound email must be sent from outside to the mailbox")
        elif self.sender.email != mailbox:
            raise ValueError("Outbound email must be sent by the mailbox")
        return self

    @property
    def namespaced_source_id(self) -> str:
        return scoped_email_id(
            "source", self.provider, self.mailbox_external_id, self.source_external_id
        )

    @property
    def namespaced_thread_id(self) -> str:
        return scoped_email_id(
            "thread", self.provider, self.mailbox_external_id, self.thread_external_id
        )


class EmailRecord(EmailIngest):
    id: UUID
    contact_email: str | None
    deal_external_id: str


def _safe_external_to(message: EmailIngest) -> list[EmailRecipient]:
    return [
        recipient
        for recipient in message.recipients
        if recipient.kind == "to" and recipient.email != message.mailbox.email
    ]


def record_email(message: EmailIngest) -> EmailRecord:
    if message.direction == "inbound":
        contact_email = message.sender.email
    else:
        external_to = _safe_external_to(message)
        contact_email = external_to[0].email if len(external_to) == 1 else None
    return EmailRecord(
        **message.model_dump(),
        id=uuid5(NAMESPACE_URL, f"slipstream:{message.namespaced_source_id}"),
        contact_email=contact_email,
        deal_external_id=f"slipstream:{message.namespaced_thread_id}",
    )


def draft_thread_reply(messages: list[EmailRecord]) -> DraftResponse:
    if not messages:
        raise ValueError("Email thread is empty")
    target = max(messages, key=lambda item: (item.occurred_at, str(item.id)))
    if target.direction == "inbound":
        recipient = target.sender
    else:
        external_to = _safe_external_to(target)
        if len(external_to) != 1:
            raise ValueError("A single external To recipient is required for a safe reply")
        recipient = external_to[0]
    subject = re.sub(r"^(re:\s*)+", "", target.subject, flags=re.IGNORECASE)
    first_name = recipient.name.split()[0] if recipient.name else "there"
    context = " ".join(target.body.split())
    if len(context) > 180:
        context = f"{context[:177].rstrip()}…"
    opening = (
        f"Thanks for your message about {subject}. I understood your note as: “{context}”"
        if target.direction == "inbound"
        else f"Following up on my last note about {subject}: “{context}”"
    )
    body = (
        f"Hi {first_name},\n\n{opening}\n\n"
        "Would it be useful to confirm the next step and timing together?\n\nBest,"
    )
    return DraftResponse(
        id=uuid5(NAMESPACE_URL, f"slipstream:email-draft:{target.namespaced_source_id}"),
        conversation_id=target.id,
        recipient_name=recipient.name,
        recipient_email=recipient.email,
        subject=f"Re: {subject}",
        body=body,
        model="thread-grounded-template-v2",
    )
