from __future__ import annotations

import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.config import Settings
from app.core.llm import MissingReasoningProviderError, ReasoningClient, structured
from app.services.draft import (
    DraftResponse,
    DraftUnavailableError,
    _contains_risky_claim,
)

REPLY_PROMPT_VERSION = "email-reply-v1"
REPLY_PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "email-reply-v1.md"
TEMPLATE_REPLY_MODEL = "thread-grounded-template-v2"
RE_PREFIX = re.compile(r"^(re:\s*)+", re.IGNORECASE)
MAX_MODEL_THREAD_MESSAGES = 12
MAX_MODEL_BODY_CHARS = 4000
MAX_REPLY_WORDS = 200
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


class ThreadReplyContent(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=1800)


def _reply_target(messages: list[EmailRecord]) -> tuple[EmailRecord, EmailParty, str]:
    if not messages:
        raise ValueError("Email thread is empty")
    target = max(messages, key=lambda item: (item.occurred_at, str(item.id)))
    if target.direction == "inbound":
        recipient: EmailParty = target.sender
    else:
        external_to = _safe_external_to(target)
        if len(external_to) != 1:
            raise ValueError("A single external To recipient is required for a safe reply")
        recipient = external_to[0]
    return target, recipient, RE_PREFIX.sub("", target.subject)


def _reply_draft_id(target: EmailRecord) -> UUID:
    return uuid5(NAMESPACE_URL, f"slipstream:email-draft:{target.namespaced_source_id}")


def _rep_name(target: EmailRecord) -> str:
    return target.mailbox.name or target.mailbox.email.split("@")[0]


def _bounded_body(body: str) -> str:
    if len(body) <= MAX_MODEL_BODY_CHARS:
        return body
    return f"{body[: MAX_MODEL_BODY_CHARS - 1].rstrip()}…"


def _reply_payload(
    messages: list[EmailRecord], target: EmailRecord, recipient: EmailParty, subject: str
) -> str:
    ordered = sorted(messages, key=lambda item: (item.occurred_at, str(item.id)))
    payload = {
        "mailbox": {"name": target.mailbox.name, "email": target.mailbox.email},
        "rep_name": _rep_name(target),
        "recipient": {"name": recipient.name, "email": recipient.email},
        "reply_to_subject": subject,
        "thread": [
            {
                "sender": {"name": message.sender.name, "email": message.sender.email},
                "direction": message.direction,
                "occurred_at": message.occurred_at.isoformat(),
                "subject": message.subject,
                "body": _bounded_body(message.body),
            }
            for message in ordered[-MAX_MODEL_THREAD_MESSAGES:]
        ],
    }
    return json.dumps(payload, indent=2, ensure_ascii=False)


def _model_reply(
    messages: list[EmailRecord],
    target: EmailRecord,
    recipient: EmailParty,
    subject: str,
    reasoning: Settings | ReasoningClient,
) -> DraftResponse:
    try:
        result = structured(
            reasoning,
            system=REPLY_PROMPT_PATH.read_text(encoding="utf-8"),
            user=_reply_payload(messages, target, recipient, subject),
            schema=ThreadReplyContent,
            max_tokens=1200,
        )
    except MissingReasoningProviderError:
        raise
    except Exception as error:
        raise DraftUnavailableError("The reply could not be drafted") from error
    body = result.output.body.strip()
    if not body or len(body.split()) > MAX_REPLY_WORDS:
        raise DraftUnavailableError("The reply draft failed validation")
    if _contains_risky_claim(body):
        raise DraftUnavailableError("The reply draft failed safety validation")
    return DraftResponse(
        id=_reply_draft_id(target),
        conversation_id=target.id,
        recipient_name=recipient.name,
        recipient_email=recipient.email,
        subject=f"Re: {subject}",
        body=body,
        source="model",
        model=result.model,
        prompt_version=REPLY_PROMPT_VERSION,
    )


def _template_reply(
    target: EmailRecord, recipient: EmailParty, subject: str
) -> DraftResponse:
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
        id=_reply_draft_id(target),
        conversation_id=target.id,
        recipient_name=recipient.name,
        recipient_email=recipient.email,
        subject=f"Re: {subject}",
        body=body,
        model=TEMPLATE_REPLY_MODEL,
    )


def draft_thread_reply(
    messages: list[EmailRecord],
    settings: Settings | None = None,
    llm: ReasoningClient | None = None,
) -> DraftResponse:
    target, recipient, subject = _reply_target(messages)
    reasoning: Settings | ReasoningClient | None = llm
    if reasoning is None and settings is not None and settings.reasoning_configured:
        reasoning = settings
    if reasoning is None:
        return _template_reply(target, recipient, subject)
    return _model_reply(messages, target, recipient, subject, reasoning)
