from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx

from app.routers.calls import CallResponse
from app.schemas.extraction import (
    CompanyFields,
    ContactFields,
    DealFields,
    EvidenceSpan,
    ExtractionPayload,
    ExtractionResult,
    IntegerField,
    NextStep,
    Objection,
    OutcomeField,
    StageField,
    StringField,
)

ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-5"
PROMPT_VERSION = "extract-v1"
PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "extract-v1.md"
FIXTURES_ROOT = Path(__file__).resolve().parents[3] / "fixtures" / "calls"


class ExtractionUnavailableError(RuntimeError):
    pass


def _evidence(call: CallResponse, text: str | None) -> list[EvidenceSpan]:
    if not text:
        return []
    needle = text.casefold()
    for segment in call.segments:
        if needle in segment.body.casefold():
            start = segment.body.casefold().index(needle)
            return [
                EvidenceSpan(
                    sequence=segment.sequence,
                    quote=segment.body[start : start + len(text)],
                )
            ]
    return []


def _fixture_evidence(call: CallResponse, value: str | int | None) -> list[EvidenceSpan]:
    evidence = _evidence(call, str(value) if value is not None else None)
    if evidence or value is None:
        return evidence
    return [EvidenceSpan(source="fixture_label", quote=str(value)[:500])]


def _string(call: CallResponse, value: str | None, confidence: float = 1.0) -> StringField:
    return StringField(
        value=value,
        confidence=confidence if value else 0,
        evidence=_fixture_evidence(call, value),
    )


def _integer(call: CallResponse, value: int | None, evidence_text: str | None) -> IntegerField:
    return IntegerField(
        value=value,
        confidence=1 if value is not None else 0,
        evidence=_fixture_evidence(call, evidence_text),
    )


def _load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as input_file:
        payload = json.load(input_file)
    if not isinstance(payload, dict):
        raise ExtractionUnavailableError("Fixture extraction is invalid")
    return payload


def extract_fixture(call: CallResponse) -> ExtractionResult:
    fixture_dir = FIXTURES_ROOT / call.source_external_id
    script = _load_json(fixture_dir / "script.json")
    expected = _load_json(fixture_dir / "expected.json")["extraction"]
    contact = expected["contact"]
    company = expected["company"]
    deal = expected["deal"]
    stage = {
        "closed_won": "customer",
        "closed_lost": "evaluation",
        "proposal": "evaluation",
    }.get(deal["stage"], deal["stage"])
    outcome = "stalled" if deal["outcome"] == "no_show" else deal["outcome"]
    next_step = expected.get("next_step")
    payload = ExtractionPayload(
        contact=ContactFields(
            name=_string(call, contact["name"]),
            email=_string(call, contact["email"]),
            phone=_string(call, contact["phone"]),
            title=_string(call, contact["role"]),
        ),
        company=CompanyFields(
            name=_string(call, company["name"]),
            domain=_string(call, script["company"].get("domain")),
            industry=_string(call, company["industry"]),
            employee_count=_integer(call, company["headcount"], str(company["headcount"])),
            location=_string(call, company["location"]),
        ),
        deal=DealFields(
            stage=StageField(
                value=stage,
                confidence=1,
                evidence=[EvidenceSpan(source="fixture_label", quote=deal["stage"])],
            ),
            outcome=OutcomeField(
                value=outcome,
                confidence=1,
                evidence=[EvidenceSpan(source="fixture_label", quote=deal["outcome"])],
            ),
            amount=_integer(call, deal.get("value_aud"), str(deal.get("value_aud"))),
        ),
        promises=[_string(call, promise) for promise in expected["promises"]],
        objections=[
            Objection(
                text=objection["text"],
                handling=objection["handling"],
                confidence=1,
                evidence=_fixture_evidence(call, objection["text"]),
            )
            for objection in expected["objections"]
        ],
        next_step=(
            NextStep(
                description=next_step["description"],
                due_date=next_step.get("due"),
                owner=script["rep"],
                confidence=1,
                evidence=_fixture_evidence(call, next_step["description"]),
            )
            if next_step
            else None
        ),
        summary=(
            f"{script['rep']} spoke with {script['prospect']['name']} at "
            f"{script['company']['name']}. Outcome: {outcome}."
        ),
    )
    return ExtractionResult(
        **payload.model_dump(),
        conversation_id=call.id,
        source="fixture_labels",
        model="labelled-fixture-v1",
        prompt_version=PROMPT_VERSION,
    )


def _verify_evidence(payload: ExtractionPayload, call: CallResponse) -> None:
    segments = {segment.sequence: segment.body for segment in call.segments}
    attributed_fields = [
        *payload.promises,
        *payload.contact.__dict__.values(),
        *payload.company.__dict__.values(),
        payload.deal.amount,
        payload.deal.stage,
        payload.deal.outcome,
    ]
    for field in attributed_fields:
        if field.value is not None and not field.evidence:
            raise ExtractionUnavailableError("Every extracted value requires transcript evidence")
    if any(not objection.evidence for objection in payload.objections) or (
        payload.next_step is not None and not payload.next_step.evidence
    ):
        raise ExtractionUnavailableError("Every extracted claim requires transcript evidence")
    evidence_groups = [
        *(field.evidence for field in payload.promises),
        *(objection.evidence for objection in payload.objections),
        *(field.evidence for field in payload.contact.__dict__.values()),
        *(field.evidence for field in payload.company.__dict__.values()),
        payload.deal.amount.evidence,
        payload.deal.stage.evidence,
        payload.deal.outcome.evidence,
        payload.next_step.evidence if payload.next_step else [],
    ]
    for evidence_list in evidence_groups:
        for evidence in evidence_list:
            if evidence.source != "transcript":
                raise ExtractionUnavailableError("Claude evidence must come from the transcript")
            if (
                evidence.sequence not in segments
                or evidence.quote not in segments[evidence.sequence]
            ):
                raise ExtractionUnavailableError(
                    "Extraction evidence does not match the transcript"
                )


def _anthropic_schema() -> dict[str, Any]:
    unsupported = {
        "minimum",
        "maximum",
        "exclusiveMinimum",
        "exclusiveMaximum",
        "minLength",
        "maxLength",
        "pattern",
        "format",
    }

    def transform(value: Any) -> Any:
        if isinstance(value, dict):
            result = {key: transform(item) for key, item in value.items() if key not in unsupported}
            if result.get("type") == "object" or "properties" in result:
                result["additionalProperties"] = False
            return result
        if isinstance(value, list):
            return [transform(item) for item in value]
        return value

    return transform(ExtractionPayload.model_json_schema())


async def extract_with_claude(
    call: CallResponse,
    *,
    api_key: str,
    client: httpx.AsyncClient,
) -> ExtractionResult:
    try:
        prompt = PROMPT_PATH.read_text(encoding="utf-8")
        transcript = json.dumps(
            {"segments": [segment.model_dump() for segment in call.segments]},
            ensure_ascii=False,
        )
        response = await client.post(
            ANTHROPIC_MESSAGES_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": MODEL,
                "max_tokens": 5000,
                "system": prompt,
                "messages": [{"role": "user", "content": transcript}],
                "output_config": {
                    "format": {
                        "type": "json_schema",
                        "schema": _anthropic_schema(),
                    }
                },
            },
        )
        response.raise_for_status()
        body = response.json()
        if not isinstance(body, dict):
            raise ExtractionUnavailableError("Claude returned an invalid extraction response")
        if body.get("stop_reason") not in {"end_turn", "stop_sequence"}:
            raise ExtractionUnavailableError("Claude did not complete the extraction")
        content = body.get("content")
        if not isinstance(content, list):
            raise ExtractionUnavailableError("Claude returned an invalid extraction response")
        text_blocks = [
            block["text"]
            for block in content
            if isinstance(block, dict)
            and block.get("type") == "text"
            and isinstance(block.get("text"), str)
        ]
        if len(text_blocks) != 1:
            raise ExtractionUnavailableError("Claude returned an invalid extraction response")
        payload = ExtractionPayload.model_validate_json(text_blocks[0])
        _verify_evidence(payload, call)
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as error:
        raise ExtractionUnavailableError("Claude extraction failed") from error
    return ExtractionResult(
        **payload.model_dump(),
        conversation_id=call.id,
        source="claude",
        model=body.get("model", MODEL),
        prompt_version=PROMPT_VERSION,
    )
