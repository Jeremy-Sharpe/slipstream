from __future__ import annotations

import asyncio
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from threading import Event
from types import SimpleNamespace
from typing import Any

import httpx
from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError

from app.core.config import Settings
from app.routers.scorecards import _run_bounded
from app.schemas.scorecard import (
    Evidence,
    JudgedPlaybook,
    JudgedScorecard,
    Playbook,
    Scorecard,
    Transcript,
    TranscriptTurn,
    WinningPattern,
)
from app.services.playbook_store import read_latest_playbooks, store_playbook
from app.services.score import (
    JudgeError,
    JudgeResult,
    anthropic_judge,
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
from app.services.scorecard_store import (
    ScorecardNotFoundError,
    load_scorecard_source,
    read_conversation_revision,
    read_scorecard,
    read_scorecards,
    store_scorecard,
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
        self.last_system = ""
        self.last_user = ""

    def __call__(self, *, system: str, user: str, schema: type[Any]) -> JudgeResult[Any]:
        self.last_system = system
        self.last_user = user
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
            Evidence(turn_index=1, quote="changed this week"),
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
    assert scorecard.objection_handling == "none_raised"
    assert scorecard.objection_evidence == []
    assert scorecard.rep_talk_ratio == 0.31
    assert scorecard.talk_ratio_band == "healthy"


def test_score_call_drops_evidence_when_next_step_verdict_is_false() -> None:
    transcript = Transcript(
        call_id="call-proposed-meeting",
        rep="Sam Whitfield",
        outcome="stalled",
        turns=[
            TranscriptTurn(speaker="rep", name="Sam Whitfield", text="Could we meet Thursday?"),
            TranscriptTurn(speaker="prospect", name="Maya Chen", text="I cannot commit yet."),
        ],
    )
    judged = _judged_scorecard().model_copy(
        update={
            "next_step_secured": False,
            "next_step_evidence": Evidence(turn_index=1, quote="meet Thursday"),
        }
    )

    scorecard, _ = score_call(transcript, FakeJudge(scorecard=judged))

    assert scorecard.next_step_secured is False
    assert scorecard.next_step_evidence is None


def test_score_call_uses_request_start_for_stale_write_ordering() -> None:
    started_at = datetime(2026, 9, 12, 8, 0, tzinfo=UTC)

    scorecard, _ = score_call(
        Transcript.model_validate(_transcript_payload()),
        FakeJudge(),
        scoring_started_at=started_at,
    )

    assert scorecard.scored_at == started_at


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
        assert "did not match the scorecard schema" in str(error)
        assert error.input_tokens == 2000
        assert error.output_tokens == 1000
        assert error.cost_usd == 0.003
        assert error.parse_retries == 1
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


def test_openrouter_retry_failure_preserves_first_attempt_spend() -> None:
    attempts = 0

    def respond(_: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return _openrouter_response("not json")
        return httpx.Response(503, text="provider unavailable")

    judge = openrouter_judge(
        "test-key",
        "test/model",
        prices={"test/model": (1.0, 1.0)},
        transport=httpx.MockTransport(respond),
    )

    try:
        judge(system="system", user="user", schema=JudgedScorecard)
    except JudgeError as error:
        assert error.input_tokens == 1000
        assert error.output_tokens == 500
        assert error.cost_usd == 0.0015
        assert error.parse_retries == 1
    else:
        raise AssertionError("expected JudgeError")


def test_openrouter_marks_mixed_known_and_unknown_attempt_cost_unknown() -> None:
    attempts = 0

    def respond(_: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        response = _openrouter_response(
            "not json" if attempts == 1 else _judged_scorecard().model_dump_json()
        )
        if attempts == 1:
            response = httpx.Response(
                200,
                json={
                    **response.json(),
                    "usage": {
                        "prompt_tokens": 1000,
                        "completion_tokens": 500,
                        "cost": 0.002,
                    },
                },
            )
        return response

    judge = openrouter_judge(
        "test-key",
        "unpriced/model",
        prices={},
        transport=httpx.MockTransport(respond),
    )

    result = judge(system="system", user="user", schema=JudgedScorecard)

    assert result.cost_usd == 0.002
    assert result.cost_complete is False
    assert result.parse_retries == 1


def test_openrouter_missing_usage_is_never_treated_as_free() -> None:
    response = httpx.Response(
        200,
        json={
            "model": "test/model",
            "choices": [{"message": {"content": _judged_scorecard().model_dump_json()}}],
        },
    )
    judge = openrouter_judge(
        "test-key",
        "test/model",
        prices={"test/model": (1.0, 1.0)},
        transport=httpx.MockTransport(lambda _: response),
    )

    result = judge(system="system", user="user", schema=JudgedScorecard)

    assert result.cost_usd is None
    assert result.cost_complete is False


def test_openrouter_malformed_retry_usage_marks_known_spend_incomplete() -> None:
    attempts = 0

    def respond(_: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return _openrouter_response("not json")
        return httpx.Response(
            200,
            json={
                "model": "test/model",
                "choices": [{"message": {"content": "not json"}}],
                "usage": "invalid",
            },
        )

    judge = openrouter_judge(
        "test-key",
        "test/model",
        prices={"test/model": (1.0, 1.0)},
        transport=httpx.MockTransport(respond),
    )

    try:
        judge(system="system", user="user", schema=JudgedScorecard)
    except JudgeError as error:
        assert error.cost_usd == 0.0015
        assert error.cost_complete is False
        assert error.parse_retries == 1
    else:
        raise AssertionError("expected JudgeError")


def test_anthropic_empty_output_preserves_known_spend(monkeypatch) -> None:
    class FakeMessages:
        def parse(self, **_: object):
            return SimpleNamespace(
                parsed_output=None,
                usage=SimpleNamespace(input_tokens=1000, output_tokens=500),
            )

    class FakeAnthropic:
        def __init__(self, **_: object) -> None:
            self.messages = FakeMessages()

        def close(self) -> None:
            pass

    monkeypatch.setitem(sys.modules, "anthropic", SimpleNamespace(Anthropic=FakeAnthropic))
    judge = anthropic_judge("test-key", "claude-sonnet-5")

    try:
        judge(system="system", user="user", schema=JudgedScorecard)
    except JudgeError as error:
        assert error.input_tokens == 1000
        assert error.output_tokens == 500
        assert error.cost_usd == 0.007
        assert error.cost_complete is True
        assert error.model == "claude-sonnet-5"
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

    unknown = _scorecard("call-4", "Sam Whitfield", None, 1, False, "none_raised", 0.4)
    assert outcome_stats([*cards, unknown]) == stats


def test_derive_playbook_drops_patterns_with_unknown_call_ids() -> None:
    scorecard = _scorecard("call-1", "Sam Whitfield", "won", 4, True, "handled", 0.40)
    contrast = _scorecard("call-2", "Sam Whitfield", "lost", 1, False, "ignored", 0.60)
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

    derived, _ = derive_playbook([scorecard, contrast], FakeJudge(playbook=playbook))

    assert [pattern.behaviour for pattern in derived.patterns] == ["Use discovery"]
    assert derived.coaching_focus == ["Ask before pricing."]


def test_derive_playbook_keeps_retyped_quotes_and_drops_paraphrases() -> None:
    evidence = Evidence(turn_index=1, quote="We’d need the board’s sign-off before Thursday")
    scorecard = _scorecard(
        "call-1", "Sam Whitfield", "won", discovery_evidence=[evidence]
    )
    contrast = _scorecard("call-2", "Sam Whitfield", "lost", 1, False, "ignored", 0.60)
    playbook = JudgedPlaybook(
        patterns=[
            WinningPattern(
                behaviour="Named the approver",
                why_it_matters="It surfaces the real decision path.",
                call_ids=["call-1"],
                quotes=["\"We'd need the  board's sign-off before Thursday.\""],
            ),
            WinningPattern(
                behaviour="Paraphrased by the judge",
                why_it_matters="It should be dropped.",
                call_ids=["call-1"],
                quotes=["The rep asked who signs the contract off"],
            ),
        ],
        coaching_focus=["Ask who signs off."],
    )

    judge = FakeJudge(playbook=playbook)
    derived, _ = derive_playbook([scorecard, contrast], judge)

    assert [pattern.behaviour for pattern in derived.patterns] == ["Named the approver"]
    assert "Allowed quotes, by call id" in judge.last_user
    assert (
        "  1. [discovery, turn 1] We’d need the board’s sign-off before Thursday"
        in judge.last_user
    )
    assert "  2. [objection, turn 1] objection quote" in judge.last_user
    assert "  3. [next step, turn 2] next quote" in judge.last_user
    assert "copied character for character" in judge.last_system


def test_derive_playbook_computes_behaviours_and_sorts_them_by_the_gap() -> None:
    cohort = [
        _scorecard("call-1", "Sam Whitfield", "won", 5, True, "handled", 0.40),
        _scorecard("call-2", "Sam Whitfield", "won", 3, True, "handled", 0.45),
        _scorecard("call-3", "Ada Nwosu", "lost", 1, False, "ignored", 0.70),
        _scorecard("call-4", "Ada Nwosu", "stalled", 4, False, "handled", 0.45),
        _scorecard("call-5", "Ada Nwosu", "lost", 2, True, "ignored", 0.70),
    ]

    derived, _ = derive_playbook(cohort, FakeJudge(playbook=JudgedPlaybook(
        patterns=[], coaching_focus=["Ask before pricing."]
    )))
    rates = {
        behaviour.key: (behaviour.won.n, behaviour.won.of, behaviour.other.n, behaviour.other.of)
        for behaviour in derived.behaviours
    }

    assert rates == {
        "dated-next-step": (2, 2, 1, 3),
        "discovery-floor-4": (1, 2, 1, 3),
        "objection-handled": (2, 2, 1, 3),
        "healthy-talk-ratio": (2, 2, 1, 3),
    }
    gaps = [
        behaviour.won.n / behaviour.won.of - behaviour.other.n / behaviour.other.of
        for behaviour in derived.behaviours
    ]
    assert gaps == sorted(gaps, reverse=True)
    assert derived.behaviours[0].key in {
        "dated-next-step",
        "objection-handled",
        "healthy-talk-ratio",
    }
    next_step = next(item for item in derived.behaviours if item.key == "dated-next-step")
    assert next_step.behaviour == "Secured a dated next step"
    assert next_step.takeaway == (
        "Won calls secured a dated next step 2 of 2 times (100%), the rest 1 of 3 (33%)."
    )
    assert [quote.call_id for quote in next_step.quotes] == ["call-1", "call-2"]
    discovery = next(item for item in derived.behaviours if item.key == "discovery-floor-4")
    assert discovery.takeaway.endswith(
        "won calls averaged 4.0 discovery questions against 2.3."
    )
    assert [quote.call_id for quote in discovery.quotes] == ["call-1"]
    talk_ratio = next(item for item in derived.behaviours if item.key == "healthy-talk-ratio")
    assert talk_ratio.quotes == []
    assert all(len(behaviour.quotes) <= 3 for behaviour in derived.behaviours)


def test_derive_playbook_adds_the_pricing_behaviour_only_when_turns_prove_it() -> None:
    asked = Evidence(turn_index=1, quote="What changed this week?")
    late = Evidence(turn_index=2, quote="What changed this week?")
    won = _scorecard(
        "call-1",
        "Sam Whitfield",
        "won",
        discovery_evidence=[asked],
        source_turns=[
            TranscriptTurn(speaker="rep", name="Sam Whitfield", text="What changed this week?"),
            TranscriptTurn(speaker="rep", name="Sam Whitfield", text="It is $40 per seat."),
        ],
    )
    lost = _scorecard(
        "call-2",
        "Sam Whitfield",
        "lost",
        next_step=False,
        objection="ignored",
        talk_ratio=0.70,
        discovery_evidence=[late],
        source_turns=[
            TranscriptTurn(speaker="rep", name="Sam Whitfield", text="It is $40 per seat."),
            TranscriptTurn(speaker="rep", name="Sam Whitfield", text="What changed this week?"),
        ],
    )
    judge = FakeJudge(playbook=JudgedPlaybook(patterns=[], coaching_focus=["Ask before pricing."]))

    derived, _ = derive_playbook([won, lost], judge)
    without_turns, _ = derive_playbook(
        [
            _scorecard("call-1", "Sam Whitfield", "won"),
            _scorecard("call-2", "Sam Whitfield", "lost", 1, False, "ignored", 0.70),
        ],
        judge,
    )

    pricing = next(
        item for item in derived.behaviours if item.key == "discovery-before-pricing"
    )
    assert (pricing.won.n, pricing.won.of, pricing.other.n, pricing.other.of) == (1, 1, 0, 1)
    assert [quote.turn_index for quote in pricing.quotes] == [1]
    assert all(item.key != "discovery-before-pricing" for item in without_turns.behaviours)


def test_derive_playbook_still_validates_when_the_judge_finds_no_pattern() -> None:
    cohort = [
        _scorecard("call-1", "Sam Whitfield", "won"),
        _scorecard("call-2", "Sam Whitfield", "lost", 1, False, "ignored", 0.70),
    ]
    judge = FakeJudge(playbook=JudgedPlaybook(patterns=[], coaching_focus=["Ask before pricing."]))

    derived, _ = derive_playbook(cohort, judge)

    assert derived.patterns == []
    assert derived.coaching_focus == ["Ask before pricing."]
    assert len(derived.behaviours) == 4
    assert Playbook.model_validate(derived.model_dump(mode="json")) == derived


def test_playbook_store_upserts_and_reads_validated_payload() -> None:
    playbook, _ = derive_playbook(
        [
            _scorecard("call-1", "Sam Whitfield", "won"),
            _scorecard("call-2", "Sam Whitfield", "lost"),
        ],
        FakeJudge(),
    )
    client = _FakePlaybookClient()

    stored = store_playbook(client, playbook)

    assert stored == playbook
    assert client.rpc_name == "store_playbook_if_current"
    assert client.row is not None
    assert client.row["playbook"]["cohort_revision"] == playbook.cohort_revision
    assert read_latest_playbooks(client, 50) == [playbook]
    duplicate = playbook.model_dump(mode="json")
    duplicate["sources"].append(duplicate["sources"][0])
    try:
        Playbook.model_validate(duplicate)
    except ValidationError as error:
        assert "distinct revisions" in str(error)
    else:
        raise AssertionError("duplicate playbook source was accepted")


def test_scorecard_routes_handle_configuration_fake_judge_and_validation(
    client: TestClient,
) -> None:
    assert client.get("/playbook/latest").status_code == 404
    transcript = _transcript_payload()
    response = client.post("/scorecards", json=transcript)

    assert response.status_code == 503
    assert response.json() == {"detail": "No scorecard judge is configured"}

    client.app.state.judge_factory = lambda: FakeJudge()
    response = client.post("/scorecards", json=transcript)

    assert response.status_code == 200
    payload = response.json()
    assert payload["call_id"] == "call-route"
    assert payload["request_id"] == "request-route"
    assert payload["source_external_id"] == "call-route"
    assert len(payload["source_revision"]) == 64
    assert len(payload["scorecard_revision"]) == 64
    assert payload["model"] == "fake"
    stored = client.get("/scorecards/call-route")
    assert stored.status_code == 200
    assert stored.json() == payload
    assert client.get("/scorecards/missing").status_code == 404

    client.app.state.scorecard_store["call-1"] = _scorecard("call-1", "Sam Whitfield", "won")
    client.app.state.scorecard_store["call-2"] = _scorecard(
        "call-2", "Sam Whitfield", "lost", 1, False, "ignored", 0.6
    )
    playbook_response = client.post(
        "/playbook",
        json={"call_ids": ["call-1", "call-2"]},
    )

    assert playbook_response.status_code == 200
    playbook_payload = playbook_response.json()
    assert playbook_payload["model"] == "fake"
    assert len(playbook_payload["cohort_revision"]) == 64
    assert [source["call_id"] for source in playbook_payload["sources"]] == [
        "call-1",
        "call-2",
    ]
    assert all(source["source_revision"] for source in playbook_payload["sources"])
    latest_playbook = client.get("/playbook/latest")
    assert latest_playbook.status_code == 200
    assert latest_playbook.json() == playbook_payload
    stale_playbook = client.post(
        "/playbook",
        json={
            "call_ids": ["call-1", "call-2"],
            "expected_sources": [
                {
                    "call_id": "call-1",
                    "source_revision": "stale-revision",
                    "scorecard_revision": "revision-scorecard-call-1",
                    "rubric_version": "v1",
                    "outcome": "won",
                },
                {
                    "call_id": "call-2",
                    "source_revision": "revision-call-2",
                    "scorecard_revision": "revision-scorecard-call-2",
                    "rubric_version": "v1",
                    "outcome": "lost",
                },
            ],
        },
    )
    assert stale_playbook.status_code == 409
    fabricated = client.post(
        "/playbook",
        json={
            "scorecards": [
                _scorecard("fake-1", "Invented", "won").model_dump(mode="json"),
                _scorecard("fake-2", "Invented", "lost").model_dump(mode="json"),
            ]
        },
    )
    assert fabricated.status_code == 422
    assert client.post("/playbook", json={"call_ids": ["call-1", "missing"]}).status_code == 404
    assert client.post("/scorecards", json={"call_id": "broken"}).status_code == 422
    client.app.state.scorecard_store["call-3"] = _scorecard("call-3", "Jordan Lee", "won")
    client.app.state.scorecard_store["call-4"] = _scorecard("call-4", "Jordan Lee", "stalled")
    newer_playbook = client.post(
        "/playbook", json={"call_ids": ["call-3", "call-4"]}
    )
    assert newer_playbook.status_code == 200
    client.app.state.scorecard_store["call-3"] = client.app.state.scorecard_store[
        "call-3"
    ].model_copy(update={"scorecard_revision": "changed-scorecard-revision"})
    assert client.get("/playbook/latest").json() == playbook_payload
    client.app.state.scorecard_store["call-1"] = client.app.state.scorecard_store[
        "call-1"
    ].model_copy(update={"scorecard_revision": "new-scorecard-revision"})
    assert client.get("/playbook/latest").status_code == 404


def test_scorecard_mutations_require_configured_ingest_token(client: TestClient) -> None:
    client.app.state.settings.ingest_token = SecretStr("score-secret")
    client.app.state.judge_factory = lambda: FakeJudge()

    assert client.post("/scorecards", json=_transcript_payload()).status_code == 401
    assert (
        client.post(
            "/scorecards",
            json=_transcript_payload(),
            headers={"X-Slipstream-Ingest-Token": "wrong"},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/scorecards",
            json=_transcript_payload(),
            headers={"X-Slipstream-Ingest-Token": "score-secret"},
        ).status_code
        == 200
    )


def test_scorecard_route_offloads_blocking_judge(client: TestClient) -> None:
    started = Event()
    release = Event()

    class BlockingJudge(FakeJudge):
        def __call__(self, **kwargs):
            started.set()
            assert release.wait(timeout=2)
            return super().__call__(**kwargs)

    client.app.state.judge_factory = lambda: BlockingJudge()
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(client.post, "/scorecards", json=_transcript_payload())
        assert started.wait(timeout=1)
        assert client.get("/health").status_code == 200
        release.set()
        assert future.result(timeout=2).status_code == 200


def test_playbook_rejects_source_change_while_judge_is_running(client: TestClient) -> None:
    started = Event()
    release = Event()

    class BlockingJudge(FakeJudge):
        def __call__(self, **kwargs):
            started.set()
            assert release.wait(timeout=2)
            return super().__call__(**kwargs)

    client.app.state.scorecard_store["call-1"] = _scorecard("call-1", "Sam", "won")
    client.app.state.scorecard_store["call-2"] = _scorecard("call-2", "Sam", "lost")
    client.app.state.judge_factory = lambda: BlockingJudge()
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(
            client.post,
            "/playbook",
            json={"call_ids": ["call-1", "call-2"]},
        )
        assert started.wait(timeout=1)
        client.app.state.scorecard_store["call-1"] = client.app.state.scorecard_store[
            "call-1"
        ].model_copy(update={"scorecard_revision": "changed-while-running"})
        release.set()
        assert future.result(timeout=2).status_code == 409
    assert not client.app.state.playbook_store


def test_scorecard_route_hides_provider_diagnostics(client: TestClient) -> None:
    class FailedJudge:
        def __call__(self, **_: object):
            raise JudgeError("upstream leaked buyer-secret and transcript")

    client.app.state.judge_factory = lambda: FailedJudge()
    response = client.post("/scorecards", json=_transcript_payload())

    assert response.status_code == 502
    assert "buyer-secret" not in response.text
    assert "transcript" not in response.text
    assert "reference" in response.json()["detail"]


def test_scorecard_routes_reject_oversized_work_before_judging(client: TestClient) -> None:
    calls = 0

    def judge_factory():
        nonlocal calls
        calls += 1
        return FakeJudge()

    client.app.state.judge_factory = judge_factory
    payload = _transcript_payload()
    payload["turns"][0]["text"] = "x" * 10_001
    assert client.post("/scorecards", json=payload).status_code == 422
    assert (
        client.post(
            "/playbook",
            content=b" " * (2 * 1024 * 1024 + 1),
            headers={"content-type": "application/json"},
        ).status_code
        == 413
    )
    assert calls == 0


def test_scorecard_route_bounds_admission_queue(client: TestClient) -> None:
    client.app.state.scorecard_admission_slots = asyncio.Semaphore(0)
    client.app.state.judge_factory = lambda: FakeJudge()

    response = client.post("/scorecards", json=_transcript_payload())

    assert response.status_code == 429


def test_cancelled_request_holds_capacity_until_worker_stops() -> None:
    started = Event()
    release = Event()
    stopped = Event()

    def blocking_work() -> str:
        started.set()
        try:
            assert release.wait(timeout=2)
            return "done"
        finally:
            stopped.set()

    async def scenario() -> None:
        state = SimpleNamespace(
            scorecard_admission_slots=asyncio.Semaphore(8),
            scorecard_slots=asyncio.Semaphore(2),
        )
        request = SimpleNamespace(app=SimpleNamespace(state=state))
        task = asyncio.create_task(_run_bounded(request, blocking_work))
        assert await asyncio.to_thread(started.wait, 1)
        task.cancel()
        await asyncio.sleep(0)
        assert state.scorecard_slots._value == 1
        assert state.scorecard_admission_slots._value == 7
        task.cancel()
        await asyncio.sleep(0)
        assert state.scorecard_slots._value == 1
        assert state.scorecard_admission_slots._value == 7
        release.set()
        try:
            await task
        except asyncio.CancelledError:
            pass
        else:
            raise AssertionError("expected cancellation")
        assert await asyncio.to_thread(stopped.wait, 1)
        await asyncio.sleep(0)
        assert state.scorecard_slots._value == 2
        assert state.scorecard_admission_slots._value == 8

    asyncio.run(scenario())


def test_memory_scorecard_store_evicts_oldest_entry(client: TestClient) -> None:
    for index in range(500):
        scorecard = _scorecard(f"old-{index}", "Sam Whitfield", "won")
        client.app.state.scorecard_store[scorecard.call_id] = scorecard
    client.app.state.judge_factory = lambda: FakeJudge()

    response = client.post("/scorecards", json=_transcript_payload())

    assert response.status_code == 200
    assert len(client.app.state.scorecard_store) == 500
    assert "old-0" not in client.app.state.scorecard_store


def test_supabase_scorecard_store_uses_atomic_rpc_and_reads_by_source() -> None:
    scorecard = _scorecard("call-source", "Sam Whitfield", "won")
    client = _FakeScorecardClient(scorecard)

    stored = store_scorecard(client, scorecard, client.source_revision)
    loaded = read_scorecard(client, "call-source")

    assert stored == scorecard
    assert loaded == scorecard
    assert client.rpc_name == "store_conversation_scorecard"
    assert client.rpc_payload == {
        "p_call_id": "call-source",
        "p_scorecard": scorecard.model_dump(mode="json"),
        "p_source_revision": client.source_revision,
    }
    assert read_conversation_revision(client, "call-source") == client.revision
    batch = read_scorecards(client, ["call-source", "missing"])
    assert batch == [("00000000-0000-4000-8000-000000000001", scorecard), None]


def test_supabase_scorecard_store_requires_matching_conversation() -> None:
    client = _FakeScorecardClient(None)
    try:
        store_scorecard(
            client,
            _scorecard("missing", "Sam Whitfield", "won"),
            client.source_revision,
        )
    except ScorecardNotFoundError:
        pass
    else:
        raise AssertionError("expected ScorecardNotFoundError")


def test_durable_scorecard_source_uses_canonical_segments_and_outcome() -> None:
    client = _FakeCanonicalClient()

    transcript, revision = load_scorecard_source(client, "external-call")

    assert transcript.call_id == "00000000-0000-4000-8000-000000000010"
    assert transcript.outcome == "won"
    assert [turn.text for turn in transcript.turns] == ["What changed?", "The audit is due."]
    assert [turn.speaker for turn in transcript.turns] == ["rep", "prospect"]
    assert revision == "canonical-revision"


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


def test_comparison_excludes_models_with_unknown_costs() -> None:
    unknown = {
        **_model_summary("unknown", 10, 10, 10, 0.0),
        "unknown_cost_calls": 1,
    }
    known = {
        **_model_summary("known", 10, 10, 10, 0.1),
        "unknown_cost_calls": 0,
    }

    decision = compare_models([unknown, known])

    assert decision["pick"] == "known"


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
    assert report["decision"]["pick"] is None
    assert all(model["judge_kind"] == "heuristic" for model in report["models"])


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
    outcome: str | None,
    discovery: int = 4,
    next_step: bool = True,
    objection: str = "handled",
    talk_ratio: float = 0.40,
    discovery_evidence: list[Evidence] | None = None,
    source_turns: list[TranscriptTurn] | None = None,
) -> Scorecard:
    evidence = discovery_evidence or [
        Evidence(turn_index=index + 1, quote=f"good quote {index}") for index in range(discovery)
    ]
    return Scorecard(
        call_id=call_id,
        source_external_id=call_id,
        source_revision=f"revision-{call_id}",
        scorecard_revision=f"revision-scorecard-{call_id}",
        source_turns=source_turns,
        rep=rep,
        outcome=outcome,  # type: ignore[arg-type]
        discovery_questions=len(evidence),
        discovery_evidence=evidence,
        next_step_secured=next_step,
        next_step_evidence=Evidence(turn_index=2, quote="next quote") if next_step else None,
        objection_handling=objection,  # type: ignore[arg-type]
        objection_evidence=(
            [Evidence(turn_index=1, quote="objection quote")] if objection != "none_raised" else []
        ),
        rep_talk_ratio=talk_ratio,
        talk_ratio_band=(
            "healthy" if talk_ratio < 0.5 else "heavy" if talk_ratio <= 0.6 else "monologue"
        ),
        went_well=["good quote"],
        to_improve=["improve"],
        summary="good quote 0 summary",
        model="fake",
        rubric_version="v1",
        scored_at=datetime.now(UTC),
    )


def _transcript_payload() -> dict[str, Any]:
    return {
        "call_id": "call-route",
        "request_id": "request-route",
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


class _Result:
    def __init__(self, data: Any) -> None:
        self.data = data


class _FakeQuery:
    def __init__(self, owner: _FakeScorecardClient) -> None:
        self.owner = owner
        self.filters: dict[str, Any] = {}
        self.field = "scorecard"

    def select(self, field: str) -> _FakeQuery:
        self.field = field
        return self

    def eq(self, column: str, value: str) -> _FakeQuery:
        self.filters[column] = value
        return self

    def in_(self, column: str, values: list[str]) -> _FakeQuery:
        self.filters[column] = values
        return self

    def limit(self, _: int) -> _FakeQuery:
        return self

    def execute(self) -> _Result:
        if "," in self.field:
            source_ids = self.filters.get("source_external_id", [])
            if self.owner.scorecard is None or self.owner.scorecard.call_id not in source_ids:
                return _Result([])
            return _Result(
                [
                    {
                        "id": "00000000-0000-4000-8000-000000000001",
                        "source_external_id": self.owner.scorecard.call_id,
                        "scorecard": self.owner.scorecard.model_dump(mode="json"),
                    }
                ]
            )
        matches = (
            self.owner.scorecard is not None
            and self.filters.get("source_external_id") == self.owner.scorecard.call_id
        )
        if not matches:
            return _Result([])
        value = (
            self.owner.scorecard.model_dump(mode="json")
            if self.field == "scorecard"
            else self.owner.revision.isoformat()
        )
        return _Result([{self.field: value}])


class _FakeRpcCall:
    def __init__(self, owner: _FakeScorecardClient) -> None:
        self.owner = owner

    def execute(self) -> _Result:
        return _Result(
            [{"scorecard": self.owner.scorecard.model_dump(mode="json")}]
            if self.owner.scorecard is not None
            else []
        )


class _FakeScorecardClient:
    def __init__(self, scorecard: Scorecard | None) -> None:
        self.scorecard = scorecard
        self.revision = datetime(2026, 9, 12, 8, 0, tzinfo=UTC)
        self.source_revision = "source-revision-token"
        self.rpc_name: str | None = None
        self.rpc_payload: dict[str, Any] | None = None

    def rpc(self, name: str, payload: dict[str, Any]) -> _FakeRpcCall:
        self.rpc_name = name
        self.rpc_payload = payload
        return _FakeRpcCall(self)

    def table(self, _: str) -> _FakeQuery:
        return _FakeQuery(self)


class _FakeCanonicalQuery:
    def __init__(self, table: str) -> None:
        self.table = table

    def select(self, _: str) -> _FakeCanonicalQuery:
        return self

    def eq(self, *_: object) -> _FakeCanonicalQuery:
        return self

    def limit(self, _: int) -> _FakeCanonicalQuery:
        return self

    def order(self, _: str) -> _FakeCanonicalQuery:
        return self

    def execute(self) -> _Result:
        if self.table == "conversations":
            return _Result(
                [
                    {
                        "id": "00000000-0000-4000-8000-000000000010",
                        "updated_at": "2026-09-12T08:00:00Z",
                        "deal_id": "00000000-0000-4000-8000-000000000020",
                        "processing_status": "ready",
                    }
                ]
            )
        if self.table == "transcript_segments":
            return _Result(
                [
                    {"sequence": 0, "speaker": "Sam Whitfield", "body": "What changed?"},
                    {"sequence": 1, "speaker": "Maya Chen", "body": "The audit is due."},
                ]
            )
        return _Result([{"outcome": "won"}])


class _FakeCanonicalClient:
    def rpc(self, name: str, payload: dict[str, Any]):
        assert name == "read_scorecard_source"
        assert payload == {"p_call_id": "external-call"}
        return _StaticRpcCall(
            {
                "id": "00000000-0000-4000-8000-000000000010",
                "processing_status": "ready",
                "rep": "Sam Whitfield",
                "outcome": "won",
                "source_revision": "canonical-revision",
                "segments": [
                    {"sequence": 0, "speaker": "Sam Whitfield", "body": "What changed?"},
                    {"sequence": 1, "speaker": "Maya Chen", "body": "The audit is due."},
                ],
            }
        )

    def table(self, name: str) -> _FakeCanonicalQuery:
        return _FakeCanonicalQuery(name)


class _StaticRpcCall:
    def __init__(self, payload: dict[str, Any]) -> None:
        self.payload = payload

    def execute(self) -> _Result:
        return _Result(self.payload)


class _FakePlaybookQuery:
    def __init__(self, owner: _FakePlaybookClient) -> None:
        self.owner = owner

    def upsert(self, row: dict[str, Any], *, on_conflict: str) -> _FakePlaybookQuery:
        self.owner.row = row
        self.owner.on_conflict = on_conflict
        return self

    def select(self, _: str) -> _FakePlaybookQuery:
        return self

    def order(self, _: str, *, desc: bool) -> _FakePlaybookQuery:
        assert desc is True
        return self

    def limit(self, value: int) -> _FakePlaybookQuery:
        assert value == 50
        return self

    def execute(self) -> _Result:
        if self.owner.row is None:
            return _Result([])
        return _Result([{"playbook": self.owner.row["playbook"]}])


class _FakePlaybookClient:
    def __init__(self) -> None:
        self.row: dict[str, Any] | None = None
        self.rpc_name: str | None = None

    def rpc(self, name: str, payload: dict[str, Any]) -> _StaticRpcCall:
        self.rpc_name = name
        self.row = {"playbook": payload["p_playbook"]}
        return _StaticRpcCall(payload["p_playbook"])

    def table(self, name: str) -> _FakePlaybookQuery:
        assert name == "playbooks"
        return _FakePlaybookQuery(self)
