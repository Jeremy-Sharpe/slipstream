from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import Settings
from app.routers.scorecards import _list_stored, _read_stored, _store
from app.schemas.scorecard import (
    Evidence,
    JudgedPlaybook,
    JudgedScorecard,
    Scorecard,
    Transcript,
    TranscriptTurn,
    WinningPattern,
)
from app.services.score import (
    JudgeError,
    JudgeResult,
    build_judge,
    derive_playbook,
    heuristic_discovery_count,
    openrouter_judge,
    outcome_stats,
    rep_profiles,
    rep_talk_ratio,
    score_call,
    strict_schema,
    transcript_from_fixture,
    transcript_from_segments,
)
from evals.run_scorecard_eval import compare_models
from evals.run_scorecard_eval import main as eval_main

FIXTURES_ROOT = Path(__file__).resolve().parents[2] / "fixtures" / "calls"


class FakeJudge:
    def __init__(
        self,
        scorecard: JudgedScorecard | None = None,
        playbook: JudgedPlaybook | None = None,
    ) -> None:
        self.scorecard = scorecard or _judged_scorecard()
        self.playbook = playbook or _judged_playbook()
        self.calls = 0

    def __call__(self, *, system: str, user: str, schema: type[Any]) -> JudgeResult[Any]:
        self.calls += 1
        output = self.playbook if schema is JudgedPlaybook else self.scorecard
        return JudgeResult(
            output=output,
            input_tokens=10,
            output_tokens=5,
            latency_ms=7,
            model="fake",
        )


def test_deterministic_metrics_agree_with_fixture_labels() -> None:
    for folder in sorted(path for path in FIXTURES_ROOT.iterdir() if path.is_dir()):
        transcript = transcript_from_fixture(folder / "script.json")
        expected = _read_json(folder / "expected.json")["scorecard"]

        assert abs(rep_talk_ratio(transcript.turns) - expected["rep_talk_ratio"]) <= 0.03
        assert (
            abs(heuristic_discovery_count(transcript.turns) - expected["discovery_questions"]) <= 1
        )


def test_strict_schema_forbids_extra_properties_recursively() -> None:
    schema = strict_schema(JudgedScorecard)

    assert schema["additionalProperties"] is False
    assert set(schema["required"]) == set(schema["properties"])
    evidence = schema["$defs"]["Evidence"]
    assert evidence["additionalProperties"] is False
    assert set(evidence["required"]) == set(evidence["properties"])


def test_score_call_fills_deterministic_fields_and_drops_invalid_evidence() -> None:
    transcript = Transcript(
        call_id="call-test",
        rep="Sam Whitfield",
        outcome="won",
        turns=[
            TranscriptTurn(speaker="rep", name="Sam Whitfield", text="What changed this week?"),
            TranscriptTurn(
                speaker="prospect",
                name="Maya Chen",
                text="Thursday works and I agree to the proposal review.",
            ),
        ],
    )
    judged = JudgedScorecard(
        discovery_questions=[
            Evidence(turn_index=1, quote="What changed this week?"),
            Evidence(turn_index=99, quote="missing"),
            Evidence(turn_index=2, quote="not in the turn"),
        ],
        next_step_secured=True,
        next_step_evidence=Evidence(turn_index=2, quote="Thursday works"),
        objection_handling="handled",
        objection_evidence=[Evidence(turn_index=1, quote="not in the turn")],
        went_well=["Asked an open question."],
        to_improve=["Handle objections with more proof."],
        summary="Sam asked a real question.",
    )

    scorecard, result = score_call(transcript, FakeJudge(scorecard=judged))

    assert result.model == "fake"
    assert scorecard.discovery_questions == 1
    assert scorecard.discovery_evidence == [Evidence(turn_index=1, quote="What changed this week?")]
    assert scorecard.next_step_secured is True
    assert scorecard.objection_evidence == []
    assert scorecard.rep_talk_ratio == 0.31
    assert scorecard.talk_ratio_band == "healthy"


def test_openrouter_judge_sends_strict_schema_and_computes_cost() -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        body = json.loads(request.content)
        assert str(request.url) == "https://openrouter.ai/api/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer test-key"
        assert body["response_format"]["type"] == "json_schema"
        assert body["response_format"]["json_schema"]["strict"] is True
        assert body["provider"]["require_parameters"] is True
        assert "temperature" not in body
        return _openrouter_response(_judged_scorecard().model_dump_json())

    judge = openrouter_judge(
        "test-key",
        "test/model",
        prices={"test/model": (2.0, 10.0)},
        transport=httpx.MockTransport(respond),
    )

    result = judge(system="system", user="user", schema=JudgedScorecard)

    assert isinstance(result.output, JudgedScorecard)
    assert result.input_tokens == 1000
    assert result.output_tokens == 500
    assert result.cost_usd == 0.007
    assert len(requests) == 1


def test_openrouter_judge_prefers_billed_cost_from_usage() -> None:
    def respond(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "model": "test/model",
                "choices": [{"message": {"content": _judged_scorecard().model_dump_json()}}],
                "usage": {"prompt_tokens": 1000, "completion_tokens": 500, "cost": 0.00123},
            },
        )

    judge = openrouter_judge(
        "test-key",
        "test/model",
        prices={"test/model": (2.0, 10.0)},
        transport=httpx.MockTransport(respond),
    )

    result = judge(system="system", user="user", schema=JudgedScorecard)

    assert result.cost_usd == 0.00123


def test_openrouter_judge_accepts_fenced_json() -> None:
    judge = openrouter_judge(
        "test-key",
        "test/model",
        prices={"test/model": (1.0, 1.0)},
        transport=httpx.MockTransport(
            lambda _: _openrouter_response(f"```json\n{_judged_scorecard().model_dump_json()}\n```")
        ),
    )

    result = judge(system="system", user="user", schema=JudgedScorecard)

    assert result.output.summary == "The rep asked about the change and secured Thursday."


def test_openrouter_judge_retries_once_after_parse_failure() -> None:
    attempts = 0

    def respond(_: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return _openrouter_response("Here is some prose.")
        return _openrouter_response(_judged_scorecard().model_dump_json())

    judge = openrouter_judge(
        "test-key",
        "test/model",
        prices={"test/model": (1.0, 1.0)},
        transport=httpx.MockTransport(respond),
    )

    result = judge(system="system", user="user", schema=JudgedScorecard)

    assert result.parse_retries == 1
    assert attempts == 2


def test_openrouter_judge_raises_after_two_bad_parse_attempts() -> None:
    judge = openrouter_judge(
        "test-key",
        "test/model",
        prices={"test/model": (1.0, 1.0)},
        transport=httpx.MockTransport(lambda _: _openrouter_response("not json")),
    )

    try:
        judge(system="system", user="user", schema=JudgedScorecard)
    except JudgeError as error:
        assert "did not match schema" in str(error)
    else:
        raise AssertionError("expected JudgeError")


def test_openrouter_status_error_sanitises_key() -> None:
    judge = openrouter_judge(
        "secret-key",
        "test/model",
        prices={"test/model": (1.0, 1.0)},
        transport=httpx.MockTransport(lambda _: httpx.Response(429, text="slow down secret-key")),
    )

    try:
        judge(system="system", user="user", schema=JudgedScorecard)
    except JudgeError as error:
        message = str(error)
        assert "429" in message
        assert "secret-key" not in message
    else:
        raise AssertionError("expected JudgeError")


def test_build_judge_prefers_openrouter_then_anthropic(monkeypatch) -> None:
    chosen: list[tuple[str, str]] = []

    def fake_openrouter(api_key: str, model: str):
        chosen.append(("openrouter", f"{api_key}:{model}"))
        return FakeJudge()

    def fake_anthropic(api_key: str, model: str):
        chosen.append(("anthropic", f"{api_key}:{model}"))
        return FakeJudge()

    monkeypatch.setattr("app.services.score.openrouter_judge", fake_openrouter)
    monkeypatch.setattr("app.services.score.anthropic_judge", fake_anthropic)

    build_judge(
        Settings(
            _env_file=None,
            openrouter_api_key=SecretStr("or-key"),
            anthropic_api_key=SecretStr("anthropic-key"),
            scorecard_judge_model="anthropic/claude-sonnet-5",
        )
    )
    build_judge(
        Settings(
            _env_file=None,
            anthropic_api_key=SecretStr("anthropic-key"),
            scorecard_judge_model="anthropic/claude-sonnet-5:beta",
        )
    )
    build_judge(
        Settings(
            _env_file=None,
            anthropic_api_key=SecretStr("anthropic-key"),
            scorecard_judge_model="anthropic/claude-haiku-4.5",
        )
    )

    assert chosen == [
        ("openrouter", "or-key:anthropic/claude-sonnet-5"),
        ("anthropic", "anthropic-key:claude-sonnet-5"),
        ("anthropic", "anthropic-key:claude-haiku-4-5"),
    ]
    try:
        build_judge(Settings(_env_file=None))
    except RuntimeError as error:
        assert str(error) == "No scorecard judge is configured"
    else:
        raise AssertionError("expected RuntimeError")


def test_transcript_from_segments_maps_speakers_and_orders_rows() -> None:
    transcript = transcript_from_segments(
        "call-segments",
        "Sam Whitfield",
        "stalled",
        [
            {"speaker": "Maya Chen", "body": "Second", "sequence": 2},
            {"speaker": "Sales Rep", "body": "First", "sequence": 1},
            {"speaker": "Sam Whitfield", "body": "Third", "sequence": 3},
        ],
    )

    assert [turn.text for turn in transcript.turns] == ["First", "Second", "Third"]
    assert [turn.speaker for turn in transcript.turns] == ["rep", "prospect", "rep"]
    assert transcript.turns[0].name == "Sam Whitfield"


def test_outcome_stats_and_rep_profiles_exclude_no_shows() -> None:
    cards = [
        _scorecard("call-1", "Sam Whitfield", "won", 4, True, "handled", 0.40),
        _scorecard("call-2", "Sam Whitfield", "lost", 1, False, "ignored", 0.60),
        _scorecard("call-3", "Jordan Lee", "no_show", 0, False, "none_raised", 0.70),
    ]

    stats = outcome_stats(cards)
    profiles = rep_profiles(cards)

    assert stats[0].outcome_group == "won"
    assert stats[0].calls == 1
    assert stats[0].mean_discovery == 4
    assert stats[0].next_step_rate == 1
    assert stats[0].objection_handled_rate == 1
    assert stats[1].outcome_group == "not_won"
    assert stats[1].calls == 1
    assert stats[1].mean_talk_ratio == 0.60
    assert profiles == [
        profiles[0].model_copy(update={"rep": "Sam Whitfield"}),
    ]
    assert profiles[0].calls == 2
    assert profiles[0].won == 1
    assert profiles[0].mean_discovery == 2.5
    assert profiles[0].next_step_rate == 0.5
    assert profiles[0].mean_talk_ratio == 0.5


def test_derive_playbook_drops_patterns_with_unknown_call_ids() -> None:
    scorecard = _scorecard("call-1", "Sam Whitfield", "won", 4, True, "handled", 0.40)
    playbook = JudgedPlaybook(
        patterns=[
            WinningPattern(
                behaviour="Use discovery",
                why_it_matters="It reveals the trigger.",
                call_ids=["call-1"],
                quotes=["good quote"],
            ),
            WinningPattern(
                behaviour="Invented pattern",
                why_it_matters="It should be dropped.",
                call_ids=["missing-call"],
                quotes=["good quote"],
            ),
        ],
        coaching_focus=["Ask before pricing."],
    )

    derived, _ = derive_playbook([scorecard], FakeJudge(playbook=playbook))

    assert [pattern.behaviour for pattern in derived.patterns] == ["Use discovery"]
    assert derived.coaching_focus == ["Ask before pricing."]


def test_scorecard_routes_handle_configuration_fake_judge_and_validation(
    client: TestClient,
) -> None:
    transcript = _transcript_payload()
    response = client.post("/scorecards", json=transcript)

    assert response.status_code == 503
    assert response.json() == {"detail": "No scorecard judge is configured"}

    client.app.state.judge_factory = lambda: FakeJudge()
    response = client.post("/scorecards", json=transcript)

    assert response.status_code == 200
    payload = response.json()
    assert payload["call_id"] == "call-route"
    assert payload["model"] == "fake"

    playbook_response = client.post(
        "/playbook",
        json={"scorecards": [_scorecard("call-1", "Sam Whitfield", "won").model_dump(mode="json")]},
    )

    assert playbook_response.status_code == 200
    assert playbook_response.json()["model"] == "fake"
    assert client.post("/scorecards", json={"call_id": "broken"}).status_code == 422


def test_score_stored_fixture_call_persists_fixture_labels_and_validated_evidence(
    client: TestClient,
) -> None:
    call = client.post("/api/v1/calls/fixtures/call-01-northstar-labs/ingest").json()
    script = _read_json(FIXTURES_ROOT / "call-01-northstar-labs" / "script.json")
    judged = _judged_scorecard().model_copy(
        update={
            "discovery_questions": [
                Evidence(turn_index=1, quote=script["turns"][0]["text"][0:22]),
                Evidence(turn_index=1, quote="not a real quote"),
            ]
        }
    )
    client.app.state.judge_factory = lambda: FakeJudge(scorecard=judged)

    response = client.post(f"/api/v1/calls/{call['id']}/scorecard")

    assert response.status_code == 200
    payload = response.json()
    assert payload["rep"] == "Sam Whitfield"
    assert payload["outcome"] == "won"
    assert payload["conversation_id"] == call["id"]
    assert payload["discovery_questions"] == 1
    assert payload["model"] == "fake"
    assert 0 < payload["rep_talk_ratio"] < 1


def test_score_stored_call_is_idempotent_until_force_is_requested(
    client: TestClient,
) -> None:
    call = client.post("/api/v1/calls/fixtures/call-01-northstar-labs/ingest").json()
    judge = FakeJudge()
    client.app.state.judge_factory = lambda: judge

    first = client.post(f"/api/v1/calls/{call['id']}/scorecard")
    second = client.post(f"/api/v1/calls/{call['id']}/scorecard")
    forced = client.post(f"/api/v1/calls/{call['id']}/scorecard?force=true")

    assert first.status_code == 200
    assert second.status_code == 200
    assert forced.status_code == 200
    assert second.json()["scored_at"] == first.json()["scored_at"]
    assert judge.calls == 2
    assert forced.json()["scored_at"] != first.json()["scored_at"]


def test_score_stored_call_body_overrides_fixture_rep_and_outcome(
    client: TestClient,
) -> None:
    call = client.post("/api/v1/calls/fixtures/call-01-northstar-labs/ingest").json()
    client.app.state.judge_factory = lambda: FakeJudge()

    response = client.post(
        f"/api/v1/calls/{call['id']}/scorecard?force=true",
        json={"rep": "Alex Doe", "outcome": "lost"},
    )

    assert response.status_code == 200
    assert response.json()["rep"] == "Alex Doe"
    assert response.json()["outcome"] == "lost"


def test_stored_scorecard_read_missing_call_and_missing_judge_responses(
    client: TestClient,
) -> None:
    call = client.post("/api/v1/calls/fixtures/call-01-northstar-labs/ingest").json()
    client.app.state.judge_factory = lambda: FakeJudge()
    stored = client.post(f"/api/v1/calls/{call['id']}/scorecard").json()
    unknown_id = uuid4()

    get_response = client.get(f"/api/v1/calls/{call['id']}/scorecard")
    missing_get = client.get(f"/api/v1/calls/{unknown_id}/scorecard")
    missing_post = client.post(f"/api/v1/calls/{unknown_id}/scorecard")

    def no_judge():
        raise RuntimeError("No scorecard judge is configured")

    client.app.state.scorecard_store.clear()
    client.app.state.judge_factory = no_judge
    unconfigured = client.post(f"/api/v1/calls/{call['id']}/scorecard")

    assert get_response.status_code == 200
    assert get_response.json() == stored
    assert missing_get.status_code == 404
    assert missing_get.json() == {"detail": "Scorecard not found"}
    assert missing_post.status_code == 404
    assert missing_post.json() == {"detail": "Call not found"}
    assert unconfigured.status_code == 503
    assert unconfigured.json() == {"detail": "No scorecard judge is configured"}


def test_list_scorecards_returns_stored_scorecard(client: TestClient) -> None:
    call = client.post("/api/v1/calls/fixtures/call-01-northstar-labs/ingest").json()
    client.app.state.judge_factory = lambda: FakeJudge()
    stored = client.post(f"/api/v1/calls/{call['id']}/scorecard").json()

    response = client.get("/api/v1/scorecards")

    assert response.status_code == 200
    assert response.json() == [stored]


def test_derive_playbook_uses_stored_scorecards_and_caches_latest(
    client: TestClient,
) -> None:
    assert client.post("/api/v1/playbook/derive").status_code == 400
    assert client.get("/api/v1/playbook/latest").status_code == 404

    call = client.post("/api/v1/calls/fixtures/call-01-northstar-labs/ingest").json()
    client.app.state.judge_factory = lambda: FakeJudge()
    assert client.post(f"/api/v1/calls/{call['id']}/scorecard").status_code == 200

    derived = client.post("/api/v1/playbook/derive")
    latest = client.get("/api/v1/playbook/latest")

    assert derived.status_code == 200
    assert derived.json()["model"] == "fake"
    assert latest.status_code == 200
    assert latest.json()["generated_at"] == derived.json()["generated_at"]


def test_supabase_scorecard_helpers_store_read_list_and_raise_on_missing_row() -> None:
    conversation_id = uuid4()
    empty_id = uuid4()
    missing_id = uuid4()
    client = _FakeSupabase(
        {
            str(conversation_id): {"id": str(conversation_id), "scorecard": {}},
            str(empty_id): {"id": str(empty_id), "scorecard": {}},
            "invalid": {"id": "invalid", "scorecard": {"call_id": "broken"}},
        }
    )
    scorecard = _scorecard("call-1", "Sam Whitfield", "won").model_copy(
        update={"conversation_id": str(conversation_id)}
    )

    _store(client, conversation_id, scorecard)

    assert client.rows[str(conversation_id)]["scorecard"] == scorecard.model_dump(mode="json")
    assert _read_stored(client, conversation_id) == scorecard
    assert _read_stored(client, empty_id) is None
    assert _list_stored(client) == [scorecard]
    try:
        _store(client, missing_id, scorecard)
    except RuntimeError as error:
        assert str(error) == "Scorecard update returned no row"
    else:
        raise AssertionError("expected RuntimeError")


def test_comparison_summariser_picks_cheapest_model_within_spread() -> None:
    decision = compare_models(
        [
            _model_summary("cheap-accurate", 10, 10, 10, 0.01),
            _model_summary("dear-accurate", 10, 10, 10, 0.50),
            _model_summary("cheap-off", 8, 10, 10, 0.001),
        ]
    )

    assert decision["pick"] == "cheap-accurate"
    assert decision["rule_outs"] == {"cheap-off": ["discovery_tolerance"]}


def test_eval_script_writes_per_model_and_comparison_reports(tmp_path: Path, capsys) -> None:
    exit_code = eval_main(
        ["--judge", "heuristic", "--models", "a,b", "--out", str(tmp_path), "--limit", "3"]
    )
    output = capsys.readouterr().out

    assert exit_code in {0, 1}
    assert "Scorecard Comparison" in output
    markdown_files = list(tmp_path.glob("*.md"))
    json_files = list(tmp_path.glob("*.json"))
    assert len(markdown_files) == 3
    assert len(json_files) == 3
    comparison = next(path for path in json_files if "comparison" in path.name)
    report = json.loads(comparison.read_text(encoding="utf-8"))
    assert [model["model"] for model in report["models"]] == ["a", "b"]


def _judged_scorecard() -> JudgedScorecard:
    return JudgedScorecard(
        discovery_questions=[Evidence(turn_index=1, quote="What changed this week?")],
        next_step_secured=True,
        next_step_evidence=Evidence(turn_index=2, quote="Thursday works"),
        objection_handling="none_raised",
        objection_evidence=[],
        went_well=["Asked about change."],
        to_improve=["Add proof for objections."],
        summary="The rep asked about the change and secured Thursday.",
    )


def _judged_playbook() -> JudgedPlaybook:
    return JudgedPlaybook(
        patterns=[
            WinningPattern(
                behaviour="Ask about the trigger",
                why_it_matters="It keeps coaching grounded in the buyer context.",
                call_ids=["call-1"],
                quotes=["good quote"],
            )
        ],
        coaching_focus=["Ask about the trigger before pricing."],
    )


def _scorecard(
    call_id: str,
    rep: str,
    outcome: str,
    discovery: int = 4,
    next_step: bool = True,
    objection: str = "handled",
    talk_ratio: float = 0.40,
) -> Scorecard:
    return Scorecard(
        call_id=call_id,
        rep=rep,
        outcome=outcome,  # type: ignore[arg-type]
        discovery_questions=discovery,
        discovery_evidence=[Evidence(turn_index=1, quote="good quote")],
        next_step_secured=next_step,
        next_step_evidence=Evidence(turn_index=2, quote="next quote") if next_step else None,
        objection_handling=objection,  # type: ignore[arg-type]
        objection_evidence=[],
        rep_talk_ratio=talk_ratio,
        talk_ratio_band="healthy",
        went_well=["good quote"],
        to_improve=["improve"],
        summary="good quote summary",
        model="fake",
        rubric_version="v1",
        scored_at=datetime.now(UTC),
    )


def _transcript_payload() -> dict[str, Any]:
    return {
        "call_id": "call-route",
        "rep": "Sam Whitfield",
        "outcome": "won",
        "turns": [
            {
                "speaker": "rep",
                "name": "Sam Whitfield",
                "text": "What changed this week?",
            },
            {
                "speaker": "prospect",
                "name": "Maya Chen",
                "text": "Thursday works for the review.",
            },
        ],
    }


def _openrouter_response(content: str) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "model": "test/model",
            "choices": [{"message": {"content": content}}],
            "usage": {"prompt_tokens": 1000, "completion_tokens": 500},
        },
    )


class _FakeResult:
    def __init__(self, data: list[dict[str, Any]]) -> None:
        self.data = data


class _FakeSupabase:
    def __init__(self, rows: dict[str, dict[str, Any]]) -> None:
        self.rows = rows

    def table(self, name: str) -> _FakeTable:
        assert name == "conversations"
        return _FakeTable(self.rows)


class _FakeTable:
    def __init__(self, rows: dict[str, dict[str, Any]]) -> None:
        self.rows = rows
        self.filters: list[tuple[str, str, Any]] = []
        self.update_payload: dict[str, Any] | None = None

    def select(self, columns: str) -> _FakeTable:
        return self

    def update(self, payload: dict[str, Any]) -> _FakeTable:
        self.update_payload = payload
        return self

    def eq(self, column: str, value: Any) -> _FakeTable:
        self.filters.append(("eq", column, value))
        return self

    def neq(self, column: str, value: Any) -> _FakeTable:
        self.filters.append(("neq", column, value))
        return self

    def limit(self, count: int) -> _FakeTable:
        return self

    def execute(self) -> _FakeResult:
        rows = list(self.rows.values())
        for operator, column, value in self.filters:
            if operator == "eq":
                rows = [row for row in rows if row.get(column) == value]
            if operator == "neq":
                rows = [row for row in rows if row.get(column) != value and row.get(column) != {}]
        if self.update_payload is not None:
            for row in rows:
                row.update(self.update_payload)
            return _FakeResult(rows)
        return _FakeResult(rows)


def _model_summary(
    model: str,
    discovery: int,
    next_step: int,
    objection: int,
    cost: float,
) -> dict[str, Any]:
    checks = {}
    for dimension, passed in {
        "discovery_tolerance": discovery,
        "discovery_exact": discovery,
        "next_step": next_step,
        "objection": objection,
        "talk_ratio": 10,
    }.items():
        checks[dimension] = {
            "mean_pct": passed * 10,
            "min_pct": passed * 10,
            "max_pct": passed * 10,
            "mean_passed": passed,
            "max_passed": passed,
        }
    return {
        "model": model,
        "skipped": None,
        "checks": checks,
        "parse_failures": 0,
        "mean_latency_ms": 10,
        "total_cost_usd": cost,
        "cost_per_call_usd": cost / 10,
    }


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))
