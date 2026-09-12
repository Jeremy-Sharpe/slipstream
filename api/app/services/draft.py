from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.llm import MissingReasoningProviderError, ReasoningClient, structured
from app.routers.calls import CallResponse
from app.schemas.extraction import ExtractionResult

PROMPT_VERSION = "follow-up-v1"
PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "follow-up-v1.md"
SELLER_PATH = Path(__file__).resolve().parents[3] / "fixtures" / "seller.json"
TEMPLATE_PROMPT_VERSION = "grounded-template-v1"


class DraftUnavailableError(RuntimeError):
    pass


class FollowUpDraftContent(BaseModel):
    subject: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=1800)


class DraftResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    recipient_name: str | None
    recipient_email: str | None
    subject: str
    body: str
    status: Literal["draft", "approved", "sent"] = "draft"
    source: Literal["deterministic", "model"] = "deterministic"
    model: str = TEMPLATE_PROMPT_VERSION
    prompt_version: str = TEMPLATE_PROMPT_VERSION
    approved_by: str | None = None
    approved_at: datetime | None = None
    sent_at: datetime | None = None


def draft_id(conversation_id: UUID) -> UUID:
    return uuid5(NAMESPACE_URL, f"slipstream:draft:{conversation_id}")


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
        id=draft_id(extraction.conversation_id),
        conversation_id=extraction.conversation_id,
        recipient_name=contact_name,
        recipient_email=extraction.contact.email.value,
        subject=subject,
        body="\n".join(lines),
    )


def _model_payload(extraction: ExtractionResult, call: CallResponse) -> str:
    with SELLER_PATH.open(encoding="utf-8") as seller_file:
        seller = json.load(seller_file)
    rep_name = (
        extraction.next_step.owner
        if extraction.next_step and extraction.next_step.owner
        else seller["name"]
    )
    payload = {
        "contact": {
            "name": extraction.contact.name.value,
            "email": extraction.contact.email.value,
            "title": extraction.contact.title.value,
        },
        "company": {
            "name": extraction.company.name.value,
            "industry": extraction.company.industry.value,
        },
        "deal": {
            "stage": extraction.deal.stage.value,
            "outcome": extraction.deal.outcome.value,
            "amount": extraction.deal.amount.value,
        },
        "summary": extraction.summary,
        "promises": [promise.value for promise in extraction.promises if promise.value],
        "objections": [
            {"text": objection.text, "handling": objection.handling}
            for objection in extraction.objections
        ],
        "next_step": (
            {
                "description": extraction.next_step.description,
                "due_date": (
                    extraction.next_step.due_date.isoformat()
                    if extraction.next_step.due_date
                    else None
                ),
                "owner": extraction.next_step.owner,
            }
            if extraction.next_step
            else None
        ),
        "transcript": [
            {"speaker": segment.speaker, "body": segment.body} for segment in call.segments
        ],
        "seller": {
            "name": seller["name"],
            "description": seller["description"],
        },
        "rep_name": rep_name,
    }
    return json.dumps(payload, indent=2, ensure_ascii=False)


def draft_with_model(
    extraction: ExtractionResult, call: CallResponse, reasoning: Settings | ReasoningClient
) -> DraftResponse:
    try:
        result = structured(
            reasoning,
            system=PROMPT_PATH.read_text(encoding="utf-8"),
            user=_model_payload(extraction, call),
            schema=FollowUpDraftContent,
            max_tokens=1200,
        )
    except MissingReasoningProviderError:
        raise
    except Exception as error:
        raise DraftUnavailableError("The follow-up could not be drafted") from error

    subject = result.output.subject.strip()
    body = result.output.body.strip()
    if not subject or not body or len(body.split()) > 220:
        raise DraftUnavailableError("The follow-up draft failed validation")
    return DraftResponse(
        id=draft_id(extraction.conversation_id),
        conversation_id=extraction.conversation_id,
        recipient_name=extraction.contact.name.value,
        recipient_email=extraction.contact.email.value,
        subject=subject,
        body=body,
        source="model",
        model=result.model,
        prompt_version=PROMPT_VERSION,
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
