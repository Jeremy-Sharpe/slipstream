from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.llm import ReasoningResult
from app.routers.calls import CallResponse, SegmentResponse
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
from app.services.extract import ground, recover_subject_identity


def _assert_evidence_span_is_grounded(segments: dict[int, str], evidence: dict) -> None:
    if evidence["source"] == "transcript":
        assert evidence["quote"] in segments[evidence["sequence"]]
    else:
        assert evidence["source"] == "fixture_label"
        assert evidence["sequence"] is None


def _assert_value_field_is_grounded(segments: dict[int, str], field: dict) -> None:
    if field["value"] is not None:
        assert field["evidence"]
    for evidence in field["evidence"]:
        _assert_evidence_span_is_grounded(segments, evidence)


def _assert_evidence_is_grounded(call: dict, extraction: dict) -> None:
    segments = {segment["sequence"]: segment["body"] for segment in call["segments"]}
    for section in (extraction["contact"], extraction["company"]):
        for field in section.values():
            _assert_value_field_is_grounded(segments, field)
    _assert_value_field_is_grounded(segments, extraction["deal"]["amount"])
    _assert_value_field_is_grounded(segments, extraction["deal"]["stage"])
    _assert_value_field_is_grounded(segments, extraction["deal"]["outcome"])

    for promise in extraction["promises"]:
        _assert_value_field_is_grounded(segments, promise)
    for objection in extraction["objections"]:
        assert objection["evidence"]
        for evidence in objection["evidence"]:
            _assert_evidence_span_is_grounded(segments, evidence)
    if extraction["next_step"]:
        assert extraction["next_step"]["evidence"]
        for evidence in extraction["next_step"]["evidence"]:
            _assert_evidence_span_is_grounded(segments, evidence)


def _span(sequence: int, quote: str) -> EvidenceSpan:
    return EvidenceSpan(sequence=sequence, quote=quote)


def _string(
    value: str | None, sequence: int | None = None, quote: str | None = None
) -> StringField:
    return StringField(
        value=value,
        confidence=0.9 if value is not None else 0,
        evidence=[_span(sequence, quote)] if sequence is not None and quote is not None else [],
    )


def _minimal_payload(call: CallResponse) -> ExtractionPayload:
    return ExtractionPayload(
        contact=ContactFields(
            name=_string("Donnie Azoff", 0, "Donnie Azoff"),
            email=_string("donnie@marlowefinch.example", 26, "donnie@marlowefinch.example"),
            phone=_string(None),
            title=_string("CFO", 1, "CFO"),
        ),
        company=CompanyFields(
            name=_string("Marlowe & Finch Accounting", 0, "Marlowe & Finch Accounting"),
            domain=_string(None),
            industry=_string("Accounting practice", 2, "accountants"),
            employee_count=IntegerField(
                value=34,
                confidence=0.9,
                evidence=[_span(0, "thirty-four-person")],
            ),
            location=_string("Hawthorn, VIC", 0, "Hawthorn"),
        ),
        deal=DealFields(
            stage=StageField(
                value="customer",
                confidence=0.9,
                evidence=[_span(25, "start with onboarding Monday")],
            ),
            outcome=OutcomeField(
                value="won",
                confidence=0.9,
                evidence=[_span(25, "we'll sign the 30-seat agreement")],
            ),
            amount=IntegerField(
                value=48600,
                confidence=0.9,
                evidence=[_span(26, "$48,600")],
            ),
        ),
        promises=[
            _string(
                "I will get a proposal in your inbox today",
                22,
                "I will get a proposal in your inbox today",
            ),
            _string(
                "I will send the proposal and 30-seat agreement by 5pm today",
                24,
                "I will send the proposal and 30-seat agreement by 5pm today",
            ),
        ],
        objections=[
            Objection(
                text="Price is my first concern",
                handling="ignored",
                confidence=0.9,
                evidence=[_span(7, "Price is my first concern")],
            )
        ],
        next_step=NextStep(
            description=(
                "Jordan to send the proposal and 30-seat agreement by 5pm for Donnie "
                "and the managing partner to review and sign."
            ),
            due_date="2026-09-11",
            owner="Jordan Belfort",
            confidence=0.9,
            evidence=[
                _span(25, "Fine. Send it by 5pm today, 11 September"),
            ],
        ),
        summary="Jordan agreed to send Donnie a proposal and agreement for review.",
    )


def _model_result(output: ExtractionPayload) -> ReasoningResult[ExtractionPayload]:
    return ReasoningResult(output=output, model="fake/model", provider="openrouter")


def test_demo_call_extracts_crm_fields_with_evidence(client: TestClient) -> None:
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()

    first = client.post(f"/api/v1/calls/{call['id']}/extract")
    second = client.post(f"/api/v1/calls/{call['id']}/extract")
    fetched = client.get(f"/api/v1/calls/{call['id']}/extraction")

    assert first.status_code == 200
    assert second.json() == first.json()
    assert fetched.json() == first.json()
    extraction = first.json()
    assert extraction["source"] == "fixture_labels"
    assert extraction["contact"]["name"]["value"] == "Donnie Azoff"
    assert extraction["company"]["name"]["value"] == "Marlowe & Finch Accounting"
    assert extraction["deal"]["outcome"]["value"] == "won"
    assert extraction["deal"]["amount"]["value"] == 48600
    assert extraction["next_step"]["due_date"] == "2026-09-11"
    _assert_evidence_is_grounded(call, extraction)


def test_every_labelled_fixture_runs_through_real_ingest_and_extraction(
    client: TestClient,
) -> None:
    fixtures = client.get("/api/v1/calls/fixtures").json()
    assert len(fixtures) == 13

    for fixture in fixtures:
        call_response = client.post(f"/api/v1/calls/fixtures/{fixture['call_id']}/ingest")
        assert call_response.status_code == 200, fixture["call_id"]
        call = call_response.json()
        extraction_response = client.post(f"/api/v1/calls/{call['id']}/extract")
        assert extraction_response.status_code == 200, fixture["call_id"]
        extraction = extraction_response.json()
        assert extraction["source"] == "fixture_labels"
        assert extraction["summary"]
        _assert_evidence_is_grounded(call, extraction)


def test_missing_call_or_extraction_returns_not_found(client: TestClient) -> None:
    unknown = "00000000-0000-0000-0000-000000000000"

    assert client.post(f"/api/v1/calls/{unknown}/extract").status_code == 404
    assert client.get(f"/api/v1/calls/{unknown}/extraction").status_code == 404


def test_model_path_extracts_demo_fixture_and_reuses_stored_result(
    client: TestClient,
    monkeypatch,
) -> None:
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()
    calls = 0

    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        nonlocal calls
        calls += 1
        assert system
        assert user
        assert schema is ExtractionPayload
        assert max_tokens == 5000
        assert timeout is None
        return _model_result(_minimal_payload(CallResponse.model_validate(call)))

    monkeypatch.setattr("app.services.extract.structured", fake)

    first = client.post(f"/api/v1/calls/{call['id']}/extract")
    second = client.post(f"/api/v1/calls/{call['id']}/extract")

    assert first.status_code == 200
    assert second.json() == first.json()
    assert calls == 1
    extraction = first.json()
    assert extraction["source"] == "model"
    assert extraction["model"] == "fake/model"
    assert extraction["grounding"] == {"repaired": 0, "dropped": 0}
    _assert_evidence_is_grounded(call, extraction)


def test_model_extraction_repairs_paraphrased_evidence(
    client: TestClient,
    monkeypatch,
) -> None:
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()
    payload = _minimal_payload(CallResponse.model_validate(call))
    data = payload.model_dump()
    data["company"]["name"]["evidence"] = [
        EvidenceSpan(
            sequence=1,
            quote=(
                "i’ve heard marlowe & finch accounting is the calmest "
                "thirty-four-person practice in hawthorn."
            ),
        ).model_dump()
    ]

    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        return _model_result(ExtractionPayload.model_validate(data))

    monkeypatch.setattr("app.services.extract.structured", fake)

    response = client.post(f"/api/v1/calls/{call['id']}/extract")

    assert response.status_code == 200
    extraction = response.json()
    evidence = extraction["company"]["name"]["evidence"][0]
    assert evidence["sequence"] == 0
    assert evidence["quote"] == (
        "I've heard Marlowe & Finch Accounting is the calmest "
        "thirty-four-person practice in Hawthorn"
    )
    assert extraction["grounding"] == {"repaired": 1, "dropped": 0}
    _assert_evidence_is_grounded(call, extraction)


def test_grounding_locates_model_evidence_with_no_sequence() -> None:
    call = CallResponse(
        id=uuid4(),
        source_external_id="missing-sequence",
        subject="Grounding boundary",
        occurred_at=datetime.now(UTC),
        duration_seconds=3,
        transcript="Buyer: Marlowe & Finch Accounting",
        segments=[
            SegmentResponse(
                sequence=4,
                speaker="Buyer",
                body="Marlowe & Finch Accounting needs a safer follow-up.",
                start_ms=0,
                end_ms=3000,
            )
        ],
        provider="test",
    )
    payload = _minimal_payload(call)
    for section in (payload.contact, payload.company):
        for field_name in type(section).model_fields:
            getattr(section, field_name).evidence = []
    for field_name in ("amount", "stage", "outcome"):
        getattr(payload.deal, field_name).evidence = []
    payload.promises = []
    payload.objections = []
    payload.next_step = None
    payload.contact.name.evidence = [EvidenceSpan(quote="Marlowe & Finch Accounting")]

    grounded, report = ground(payload, call)

    assert grounded.contact.name.evidence == [
        EvidenceSpan(sequence=4, quote="Marlowe & Finch Accounting")
    ]
    assert report == GroundingReport(repaired=1, dropped=0)


def test_model_extraction_repairs_missing_evidence_sequence(
    client: TestClient,
    monkeypatch,
) -> None:
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()
    payload = _minimal_payload(CallResponse.model_validate(call))
    payload.contact.name.evidence = [EvidenceSpan(quote="Donnie Azoff")]

    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        return _model_result(payload)

    monkeypatch.setattr("app.services.extract.structured", fake)

    response = client.post(f"/api/v1/calls/{call['id']}/extract")

    assert response.status_code == 200
    extraction = response.json()
    assert extraction["contact"]["name"]["evidence"] == [
        {"source": "transcript", "sequence": 0, "quote": "Donnie Azoff"}
    ]
    assert extraction["grounding"] == {"repaired": 1, "dropped": 0}


def test_subject_identity_recovery_requires_verbatim_transcript_evidence(
    client: TestClient,
) -> None:
    call_payload = client.post(
        "/api/v1/calls/fixtures/call-01-northstar-labs/ingest"
    ).json()
    call = CallResponse.model_validate(call_payload)
    payload = _minimal_payload(call)
    payload.contact.name = _string(None)
    payload.company.name = _string(None)

    recovered, count = recover_subject_identity(payload, call)

    assert count == 2
    assert recovered.contact.name.value == "Maya Chen"
    assert recovered.contact.name.evidence == [_span(0, "Maya Chen")]
    assert recovered.company.name.value == "Northstar Labs"
    assert recovered.company.name.evidence == [_span(0, "Northstar Labs")]


def test_subject_identity_recovery_does_not_treat_subject_as_evidence() -> None:
    call = CallResponse(
        id=uuid4(),
        source_external_id="subject-only",
        subject="Acme — Priya Shah",
        occurred_at=datetime.now(UTC),
        duration_seconds=1,
        transcript="Buyer: Hello",
        segments=[
            SegmentResponse(
                sequence=0,
                speaker="Buyer",
                body="Hello",
                start_ms=0,
                end_ms=1000,
            )
        ],
        provider="test",
    )
    payload = _minimal_payload(call)
    payload.contact.name = _string(None)
    payload.company.name = _string(None)

    recovered, count = recover_subject_identity(payload, call)

    assert count == 0
    assert recovered.contact.name.value is None
    assert recovered.company.name.value is None


def test_canonical_extraction_rejects_unindexed_transcript_evidence() -> None:
    call = CallResponse(
        id=uuid4(),
        source_external_id="canonical-boundary",
        subject="Canonical boundary",
        occurred_at=datetime.now(UTC),
        duration_seconds=1,
        transcript="Buyer: evidence",
        segments=[],
        provider="test",
    )
    payload = _minimal_payload(call)
    payload.contact.name.evidence = [EvidenceSpan(quote="evidence")]

    with pytest.raises(ValidationError, match="requires a segment sequence"):
        ExtractionResult(
            **payload.model_dump(),
            conversation_id=call.id,
            source="model",
            model="fake/model",
            prompt_version="extract-v2",
        )


def test_model_extraction_drops_unmatched_evidence_without_failing(
    client: TestClient,
    monkeypatch,
) -> None:
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()
    payload = _minimal_payload(CallResponse.model_validate(call))
    data = payload.model_dump()
    data["contact"]["phone"] = StringField(
        value="+61 3 7010 1113",
        confidence=0.8,
        evidence=[EvidenceSpan(sequence=0, quote="phone number not in transcript")],
    ).model_dump()
    data["promises"].append(
        StringField(
            value="Imaginary promise",
            confidence=0.8,
            evidence=[EvidenceSpan(source="fixture_label", quote="unspoken promise")],
        ).model_dump()
    )

    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        return _model_result(ExtractionPayload.model_validate(data))

    monkeypatch.setattr("app.services.extract.structured", fake)

    response = client.post(f"/api/v1/calls/{call['id']}/extract")

    assert response.status_code == 200
    extraction = response.json()
    assert extraction["contact"]["phone"] == {"value": None, "confidence": 0, "evidence": []}
    assert [promise["value"] for promise in extraction["promises"]] == [
        "I will get a proposal in your inbox today",
        "I will send the proposal and 30-seat agreement by 5pm today",
    ]
    assert extraction["grounding"] == {"repaired": 0, "dropped": 2}
    _assert_evidence_is_grounded(call, extraction)


def test_model_parse_failure_returns_bad_gateway(
    client: TestClient,
    monkeypatch,
) -> None:
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()

    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        raise ValueError("bad parse")

    monkeypatch.setattr("app.services.extract.structured", fake)

    response = client.post(f"/api/v1/calls/{call['id']}/extract")

    assert response.status_code == 502
    assert response.json()["detail"] == "The call could not be converted into CRM fields"


def test_non_fixture_call_without_provider_returns_service_unavailable(
    client: TestClient,
) -> None:
    call = CallResponse(
        id=uuid4(),
        source_external_id="manual-call",
        subject="Manual call",
        occurred_at=datetime(2026, 9, 12, tzinfo=UTC),
        duration_seconds=1,
        transcript="Rep: Hello\nBuyer: Hi",
        segments=[
            SegmentResponse(
                sequence=0,
                speaker="Rep",
                body="Hello",
                start_ms=0,
                end_ms=500,
            ),
            SegmentResponse(
                sequence=1,
                speaker="Buyer",
                body="Hi",
                start_ms=500,
                end_ms=1000,
            ),
        ],
        provider="manual",
        fixture=False,
    )
    client.app.state.call_store[str(call.id)] = call

    response = client.post(f"/api/v1/calls/{call.id}/extract")

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "No reasoning provider is configured; fixture calls remain available"
    )


def test_ground_repairs_and_drops_evidence_on_hand_built_payload() -> None:
    call = CallResponse(
        id=uuid4(),
        source_external_id="ground-test",
        subject="Ground test",
        occurred_at=datetime(2026, 9, 12, tzinfo=UTC),
        duration_seconds=2,
        transcript="Buyer: Alice Brown joined.\nBuyer: We need post-sale support.",
        segments=[
            SegmentResponse(
                sequence=0,
                speaker="Buyer",
                body="Alice Brown joined.",
                start_ms=0,
                end_ms=1000,
            ),
            SegmentResponse(
                sequence=1,
                speaker="Buyer",
                body="We need post–sale support before launch.",
                start_ms=1000,
                end_ms=2000,
            ),
        ],
        provider="manual",
        fixture=False,
    )
    payload = ExtractionPayload(
        contact=ContactFields(
            name=StringField(
                value="Alice Brown",
                confidence=0.9,
                evidence=[EvidenceSpan(sequence=0, quote="Alice Brown")],
            ),
            email=_string(None),
            phone=StringField(
                value="555",
                confidence=0.7,
                evidence=[EvidenceSpan(sequence=0, quote="never said")],
            ),
            title=_string(None),
        ),
        company=CompanyFields(
            name=StringField(
                value="Post Sale",
                confidence=0.8,
                evidence=[EvidenceSpan(source="fixture_label", quote="post-sale support.")],
            ),
            domain=_string(None),
            industry=_string(None),
            employee_count=IntegerField(value=None, confidence=0, evidence=[]),
            location=_string(None),
        ),
        deal=DealFields(
            stage=StageField(value=None, confidence=0, evidence=[]),
            outcome=OutcomeField(value=None, confidence=0, evidence=[]),
            amount=IntegerField(value=None, confidence=0, evidence=[]),
        ),
        promises=[],
        objections=[],
        next_step=None,
        summary="Alice needs support.",
    )

    grounded, report = ground(payload, call)

    assert report == GroundingReport(repaired=1, dropped=1)
    assert grounded.contact.name.evidence == [EvidenceSpan(sequence=0, quote="Alice Brown")]
    assert grounded.company.name.evidence == [EvidenceSpan(sequence=1, quote="post–sale support")]
    assert grounded.contact.phone.value is None
    assert grounded.contact.phone.confidence == 0
    assert grounded.contact.phone.evidence == []


def test_null_fields_drop_stray_evidence_instead_of_failing() -> None:
    data = _minimal_payload(None).model_dump()
    data["contact"]["phone"] = {
        "value": None,
        "confidence": 0.4,
        "evidence": [{"source": "transcript", "sequence": 0, "quote": "x"}],
    }

    payload = ExtractionPayload.model_validate(data)

    assert payload.contact.phone.value is None
    assert payload.contact.phone.evidence == []
    assert payload.contact.phone.confidence == 0
