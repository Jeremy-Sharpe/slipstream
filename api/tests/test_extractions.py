from fastapi.testclient import TestClient

from app.services.extract import _anthropic_schema


def test_anthropic_schema_uses_only_supported_constraints() -> None:
    schema = _anthropic_schema()
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

    def inspect(value):
        if isinstance(value, dict):
            assert not unsupported.intersection(value)
            if value.get("type") == "object" or "properties" in value:
                assert value["additionalProperties"] is False
            for child in value.values():
                inspect(child)
        elif isinstance(value, list):
            for child in value:
                inspect(child)

    inspect(schema)


def _assert_evidence_is_grounded(call: dict, extraction: dict) -> None:
    segments = {segment["sequence"]: segment["body"] for segment in call["segments"]}
    evidence_lists = []
    for section in (extraction["contact"], extraction["company"]):
        evidence_lists.extend(field["evidence"] for field in section.values())
    evidence_lists.append(extraction["deal"]["amount"]["evidence"])
    evidence_lists.append(extraction["deal"]["stage"]["evidence"])
    evidence_lists.append(extraction["deal"]["outcome"]["evidence"])
    evidence_lists.extend(promise["evidence"] for promise in extraction["promises"])
    evidence_lists.extend(objection["evidence"] for objection in extraction["objections"])
    if extraction["next_step"]:
        evidence_lists.append(extraction["next_step"]["evidence"])

    for evidence_list in evidence_lists:
        assert evidence_list
        for evidence in evidence_list:
            if evidence["source"] == "transcript":
                assert evidence["quote"] in segments[evidence["sequence"]]
            else:
                assert evidence["source"] == "fixture_label"
                assert evidence["sequence"] is None


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
    assert extraction["contact"]["name"]["value"] == "Dev Patel"
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
        assert extraction["summary"]
        _assert_evidence_is_grounded(call, extraction)


def test_missing_call_or_extraction_returns_not_found(client: TestClient) -> None:
    unknown = "00000000-0000-0000-0000-000000000000"

    assert client.post(f"/api/v1/calls/{unknown}/extract").status_code == 404
    assert client.get(f"/api/v1/calls/{unknown}/extraction").status_code == 404
