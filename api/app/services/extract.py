from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from app.core.config import Settings
from app.core.llm import MissingReasoningProviderError, ReasoningClient, structured
from app.routers.calls import CallResponse
from app.schemas.extraction import (
    CompanyFields,
    ContactFields,
    DealFields,
    EvidenceSpan,
    ExtractionPayload,
    ExtractionResult,
    GroundingReport,
    IntegerField,
    NextStep,
    Objection,
    OutcomeField,
    StageField,
    StringField,
)

PROMPT_VERSION = "extract-v2"
PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "extract-v2.md"
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


def extract_with_model(
    call: CallResponse, reasoning: Settings | ReasoningClient
) -> ExtractionResult:
    system = PROMPT_PATH.read_text()
    user = json.dumps(
        {
            "call_date": call.occurred_at.isoformat(),
            "call_subject": call.subject,
            "segments": [segment.model_dump() for segment in call.segments],
        },
        ensure_ascii=False,
    )
    try:
        result = structured(
            reasoning,
            system=system,
            user=user,
            schema=ExtractionPayload,
            max_tokens=5000,
        )
    except MissingReasoningProviderError:
        raise
    except Exception as error:
        raise ExtractionUnavailableError("Model extraction failed") from error
    try:
        payload, report = ground(result.output, call)
        return ExtractionResult(
            **payload.model_dump(),
            conversation_id=call.id,
            source="model",
            model=result.model,
            prompt_version=PROMPT_VERSION,
            grounding=report,
        )
    except Exception as error:
        raise ExtractionUnavailableError("Model extraction failed") from error


AttributedField = StringField | IntegerField | StageField | OutcomeField


def ground(
    payload: ExtractionPayload, call: CallResponse
) -> tuple[ExtractionPayload, GroundingReport]:
    segments = {segment.sequence: segment.body for segment in call.segments}
    ordered_segments = [(segment.sequence, segment.body) for segment in call.segments]
    report = GroundingReport()
    data = payload.model_dump()

    for name in ("name", "email", "phone", "title"):
        field, repaired, dropped = _ground_field(
            getattr(payload.contact, name), segments, ordered_segments
        )
        data["contact"][name] = field.model_dump()
        report.repaired += repaired
        report.dropped += dropped

    for name in ("name", "domain", "industry", "employee_count", "location"):
        field, repaired, dropped = _ground_field(
            getattr(payload.company, name), segments, ordered_segments
        )
        data["company"][name] = field.model_dump()
        report.repaired += repaired
        report.dropped += dropped

    for name in ("amount", "stage", "outcome"):
        field, repaired, dropped = _ground_field(
            getattr(payload.deal, name), segments, ordered_segments
        )
        data["deal"][name] = field.model_dump()
        report.repaired += repaired
        report.dropped += dropped

    data["promises"] = []
    for promise in payload.promises:
        evidence, repaired, dropped = _ground_evidence_list(
            promise.evidence, segments, ordered_segments
        )
        report.repaired += repaired
        report.dropped += dropped
        if evidence:
            data["promises"].append(promise.model_copy(update={"evidence": evidence}).model_dump())

    data["objections"] = []
    for objection in payload.objections:
        evidence, repaired, dropped = _ground_evidence_list(
            objection.evidence, segments, ordered_segments
        )
        report.repaired += repaired
        report.dropped += dropped
        if evidence:
            data["objections"].append(
                objection.model_copy(update={"evidence": evidence}).model_dump()
            )

    data["next_step"] = None
    if payload.next_step is not None:
        evidence, repaired, dropped = _ground_evidence_list(
            payload.next_step.evidence, segments, ordered_segments
        )
        report.repaired += repaired
        report.dropped += dropped
        if evidence:
            data["next_step"] = payload.next_step.model_copy(
                update={"evidence": evidence}
            ).model_dump()

    return ExtractionPayload.model_validate(data), report


def _ground_field(
    field: AttributedField,
    segments: dict[int, str],
    ordered_segments: list[tuple[int, str]],
) -> tuple[AttributedField, int, int]:
    evidence, repaired, dropped = _ground_evidence_list(field.evidence, segments, ordered_segments)
    update: dict[str, Any] = {"evidence": evidence}
    if field.value is not None and not evidence:
        update = {"value": None, "confidence": 0, "evidence": []}
    return field.model_copy(update=update), repaired, dropped


def _ground_evidence_list(
    evidence_list: list[EvidenceSpan],
    segments: dict[int, str],
    ordered_segments: list[tuple[int, str]],
) -> tuple[list[EvidenceSpan], int, int]:
    evidence: list[EvidenceSpan] = []
    repaired = 0
    dropped = 0
    for span in evidence_list:
        grounded, was_repaired = _ground_evidence(span, segments, ordered_segments)
        if grounded is None:
            dropped += 1
            continue
        if was_repaired:
            repaired += 1
        evidence.append(grounded)
    return evidence, repaired, dropped


def _ground_evidence(
    evidence: EvidenceSpan,
    segments: dict[int, str],
    ordered_segments: list[tuple[int, str]],
) -> tuple[EvidenceSpan | None, bool]:
    if (
        evidence.source == "transcript"
        and evidence.sequence in segments
        and evidence.quote in segments[evidence.sequence]
    ):
        return evidence, False

    match = _tolerant_match(evidence.quote, evidence.sequence, segments, ordered_segments)
    if match is None:
        return None, False
    sequence, quote = match
    return EvidenceSpan(source="transcript", sequence=sequence, quote=quote[:500]), True


def _tolerant_match(
    quote: str,
    cited_sequence: int | None,
    segments: dict[int, str],
    ordered_segments: list[tuple[int, str]],
) -> tuple[int, str] | None:
    pattern = _quote_pattern(quote)
    if pattern is None:
        return None
    if cited_sequence in segments:
        match = re.search(pattern, segments[cited_sequence], re.IGNORECASE)
        if match is not None:
            return cited_sequence, match.group(0)
    for sequence, body in ordered_segments:
        match = re.search(pattern, body, re.IGNORECASE)
        if match is not None:
            return sequence, match.group(0)
    return None


def _quote_pattern(quote: str) -> str | None:
    tokens = quote.rstrip(".,;:!?").split()
    if not tokens:
        return None
    return r"\s+".join(_quote_token_pattern(token) for token in tokens)


def _quote_token_pattern(token: str) -> str:
    replacements = {
        "'": "['‘’]",
        "‘": "['‘’]",
        "’": "['‘’]",
        '"': '["“”]',
        "“": '["“”]',
        "”": '["“”]',
        "-": "[-–—]",
        "–": "[-–—]",
        "—": "[-–—]",
    }
    return "".join(replacements.get(char, re.escape(char)) for char in token)
