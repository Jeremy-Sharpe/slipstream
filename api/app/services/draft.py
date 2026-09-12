from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import BaseModel

from app.schemas.extraction import ExtractionResult


class DraftResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    recipient_name: str | None
    recipient_email: str | None
    subject: str
    body: str
    status: Literal["draft", "approved", "sent"] = "draft"
    source: Literal["deterministic", "claude"] = "deterministic"
    model: str = "grounded-template-v1"
    approved_by: str | None = None
    approved_at: datetime | None = None
    sent_at: datetime | None = None


def draft_follow_up(extraction: ExtractionResult) -> DraftResponse:
    contact_name = extraction.contact.name.value
    first_name = contact_name.split()[0] if contact_name else "there"
    company = extraction.company.name.value
    subject = f"Next steps{f' — {company}' if company else ''}"
    lines = [f"Hi {first_name},", "", "Thanks for your time.", "", extraction.summary]
    if extraction.next_step:
        lines.extend(["", f"Next step: {extraction.next_step.description}"])
        if extraction.next_step.due_date:
            lines.append(f"Timing: {extraction.next_step.due_date.isoformat()}")
    promises = [promise.value for promise in extraction.promises if promise.value]
    if promises:
        lines.extend(["", "What I committed to:"])
        lines.extend(f"- {promise}" for promise in promises)
    lines.extend(["", "Please reply if I have missed anything.", "", "Best,"])
    return DraftResponse(
        id=uuid5(NAMESPACE_URL, f"slipstream:draft:{extraction.conversation_id}"),
        conversation_id=extraction.conversation_id,
        recipient_name=contact_name,
        recipient_email=extraction.contact.email.value,
        subject=subject,
        body="\n".join(lines),
    )


def mark_sent(draft: DraftResponse, approved_by: str) -> DraftResponse:
    now = datetime.now(UTC)
    return draft.model_copy(
        update={
            "status": "sent",
            "approved_by": approved_by,
            "approved_at": now,
            "sent_at": now,
        }
    )
