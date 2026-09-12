from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.llm import (
    MissingReasoningProviderError,
    ReasoningClient,
    ReasoningResult,
    structured,
)
from app.routers.calls import CallResponse
from app.schemas.extraction import ExtractionResult

PROMPT_VERSION = "follow-up-v1"
PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "follow-up-v1.md"
SELLER_PATH = Path(__file__).resolve().parents[3] / "fixtures" / "seller.json"
TEMPLATE_PROMPT_VERSION = "grounded-template-v1"
GUARANTEE_PATTERN = re.compile(
    r"\b(?:guarantee(?:d|s)?|guaranteeing)\b", re.IGNORECASE
)
SAFE_GUARANTEE_PATTERN = re.compile(
    r"\b(?:cannot|can not|can't|do not|don't|no)\s+(?:make\s+)?guarantees?\b"
    r"|\bwithout making guarantees?\b",
    re.IGNORECASE,
)
SAFE_INSURANCE_PATTERN = re.compile(
    r"\b(?:cannot|can not|can't|do not|don't)\b[^.!?]{0,80}"
    r"\b(?:promise|guarantee)\b[^.!?]{0,80}"
    r"\b(?:insurance|insurer|premiums?|sav(?:e|es|ed|ing))\b",
    re.IGNORECASE,
)
SAVINGS_VERB = (
    r"(?:halv(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|cut(?:s|ting)?|"
    r"lower(?:s|ed|ing)?|fall(?:s|ing)?|fell|drop(?:s|ped|ping)?|sav(?:e|es|ed|ing))"
)
RISKY_DRAFT_PATTERNS = (
    re.compile(
        r"\b(?:breach[ -]?proof|never breached|100% secure|"
        r"(?:completely|fully|totally|perfectly) secure)\b",
        re.IGNORECASE,
    ),
    re.compile(
        rf"\b(?:insurance|insurer|premiums?)\b.*\b{SAVINGS_VERB}\b"
        rf"|\b{SAVINGS_VERB}\b.*\b(?:insurance|insurer|premiums?)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:competitor|incumbent|provider)\b.*"
        r"\b(?:not(?:\s+\w+){0,4}\s+certified|uncertified|lose certification)\b",
        re.IGNORECASE,
    ),
)


def _contains_risky_claim(text: str) -> bool:
    clauses = re.split(
        r"(?<=[.!?;])\s+|,\s+|\s+\b(?:and|but)\b\s+",
        " ".join(text.split()),
        flags=re.IGNORECASE,
    )
    for clause in clauses:
        without_safe_qualifications = SAFE_INSURANCE_PATTERN.sub("", clause)
        without_safe_qualifications = SAFE_GUARANTEE_PATTERN.sub(
            "", without_safe_qualifications
        )
        if GUARANTEE_PATTERN.search(without_safe_qualifications):
            return True
        if any(
            pattern.search(without_safe_qualifications)
            for pattern in RISKY_DRAFT_PATTERNS
        ):
            return True
    return False


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


def _model_payload(
    extraction: ExtractionResult,
    call: CallResponse,
    *,
    include_transcript: bool = True,
) -> str:
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
        "transcript": (
            [
                {"speaker": segment.speaker, "body": segment.body}
                for segment in call.segments
            ]
            if include_transcript
            else []
        ),
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
    def generate(*, include_transcript: bool) -> ReasoningResult[FollowUpDraftContent]:
        return structured(
            reasoning,
            system=PROMPT_PATH.read_text(encoding="utf-8"),
            user=_model_payload(
                extraction,
                call,
                include_transcript=include_transcript,
            ),
            schema=FollowUpDraftContent,
            max_tokens=1200,
        )

    try:
        result = generate(include_transcript=True)
        subject = result.output.subject.strip()
        body = result.output.body.strip()
        if _contains_risky_claim(subject) or _contains_risky_claim(body):
            result = generate(include_transcript=False)
    except MissingReasoningProviderError:
        raise
    except Exception as error:
        raise DraftUnavailableError("The follow-up could not be drafted") from error

    subject = result.output.subject.strip()
    body = result.output.body.strip()
    if not subject or not body or len(body.split()) > 220:
        raise DraftUnavailableError("The follow-up draft failed validation")
    if _contains_risky_claim(subject) or _contains_risky_claim(body):
        raise DraftUnavailableError("The follow-up draft failed safety validation")
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


def mark_approved(draft: DraftResponse, approved_by: str) -> DraftResponse:
    now = datetime.now(UTC)
    return draft.model_copy(
        update={
            "status": "approved",
            "approved_by": approved_by,
            "approved_at": now,
            "sent_at": None,
        }
    )
