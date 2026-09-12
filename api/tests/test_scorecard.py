from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

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
    JudgeResult,
    derive_playbook,
    heuristic_discovery_count,
    outcome_stats,
    rep_profiles,
    rep_talk_ratio,
    score_call,
    transcript_from_fixture,
    transcript_from_segments,
)
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

    def __call__(self, *, system: str, user: str, schema: type[Any]) -> JudgeResult[Any]:
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
            abs(heuristic_discovery_count(transcript.turns) - expected["discovery_questions"])
            <= 1
        )


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
    assert response.json() == {"detail": "Anthropic integration is not configured"}

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


def test_eval_script_writes_markdown_and_json(tmp_path: Path, capsys) -> None:
    exit_code = eval_main(["--judge", "heuristic", "--out", str(tmp_path), "--limit", "3"])
    output = capsys.readouterr().out

    assert exit_code in {0, 1}
    assert "cases=3" in output
    markdown_files = list(tmp_path.glob("*.md"))
    json_files = list(tmp_path.glob("*.json"))
    assert len(markdown_files) == 1
    assert len(json_files) == 1
    report = json.loads(json_files[0].read_text(encoding="utf-8"))
    assert report["summary"]["cases"] == 3


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


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))
