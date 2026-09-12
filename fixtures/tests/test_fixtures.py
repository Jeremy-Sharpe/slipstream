from collections import Counter

from generate_audio import build_chunks, call_dirs, load_seller
from validate import validate_all


def test_fixture_validation_passes():
    _, errors = validate_all()
    assert errors == []


def test_outcome_mix_and_rubric_spread():
    bundles, errors = validate_all()
    assert errors == []
    history = [bundle for bundle in bundles if not bundle.script.demo]
    assert Counter(bundle.script.outcome for bundle in history) == Counter(
        {"won": 5, "stalled": 3, "lost": 3, "no_show": 1}
    )
    assert any(bundle.expected.scorecard.objection_handling == "ignored" for bundle in bundles)
    assert any(bundle.expected.scorecard.objection_handling == "partial" for bundle in bundles)
    assert any(bundle.expected.scorecard.objection_handling == "handled" for bundle in bundles)
    assert min(bundle.expected.scorecard.discovery_questions for bundle in history if bundle.script.outcome == "won") >= 4
    assert max(bundle.rep_talk_ratio for bundle in history if bundle.script.outcome == "won") <= 0.50
    assert all(bundle.rep_talk_ratio >= 0.60 for bundle in history if bundle.script.outcome == "lost")


def test_demo_call_risk_flags():
    bundles, errors = validate_all()
    assert errors == []
    demo_calls = [bundle for bundle in bundles if bundle.script.demo]
    assert len(demo_calls) == 1
    demo = demo_calls[0]
    assert demo.call_id == "call-13-marlowe-finch-demo"
    assert demo.rep_talk_ratio >= 0.60
    assert demo.expected.scorecard.discovery_questions <= 1
    assert len(demo.expected.risk_flags) == 5
    for risk_flag in demo.expected.risk_flags:
        assert risk_flag.text.lower() in demo.script.turns[risk_flag.turn_index - 1].text.lower()


def test_audio_chunking_stays_under_limit():
    seller = load_seller()
    bundles, errors = validate_all()
    assert errors == []
    for bundle in bundles:
        chunks = build_chunks(bundle.script, seller)
        assert chunks
        assert all(chunk.character_count <= 1800 for chunk in chunks)


def test_demo_audio_selection():
    dirs = call_dirs(only=None, demo_only=True)
    assert [path.name for path in dirs] == ["call-13-marlowe-finch-demo"]
