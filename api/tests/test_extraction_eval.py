from __future__ import annotations

import copy
import importlib.util
import sys
from pathlib import Path
from typing import Any

from app.core.llm import ReasoningClient, ReasoningResult, Usage
from app.schemas.extraction import (
    CompanyFields,
    ContactFields,
    DealFields,
    EvidenceSpan,
    ExtractionPayload,
    IntegerField,
    NextStep,
    Objection,
    OutcomeField,
    StageField,
    StringField,
)

MODULE_PATH = Path(__file__).resolve().parents[1] / "evals" / "run_extraction_eval.py"
SPEC = importlib.util.spec_from_file_location("run_extraction_eval", MODULE_PATH)
assert SPEC is not None
eval_module = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = eval_module
SPEC.loader.exec_module(eval_module)


def _base_expected() -> dict[str, Any]:
    return {
        "contact": {
            "name": "Maya Chen",
            "role": "Managing Partner",
            "email": "maya@example.test",
            "phone": "+61 3 7010 1101",
        },
        "company": {
            "name": "Northstar Labs",
            "industry": "Architecture and lab planning consultancy",
            "headcount": 42,
            "location": "Southbank, VIC",
        },
        "deal": {"stage": "closed_won", "outcome": "no_show", "value_aud": 58400},
        "promises": ["Send a gap summary", "Include onboarding sequence"],
        "objections": [{"text": "worried we will fail the questionnaire", "handling": "handled"}],
        "next_step": {"description": "Meet for proposal review", "due": "2026-09-03"},
    }


def _base_extraction(call: Any) -> dict[str, Any]:
    evidence = [{"source": "transcript", "sequence": 0, "quote": call.segments[0].body}]
    return {
        "contact": {
            "name": {"value": "Maya  Chen", "evidence": evidence},
            "title": {"value": "managing partner", "evidence": evidence},
            "email": {"value": "MAYA@example.test", "evidence": evidence},
            "phone": {"value": "+61 3 7010 1101", "evidence": evidence},
        },
        "company": {
            "name": {"value": "northstar labs", "evidence": evidence},
            "industry": {
                "value": "Architecture and lab planning consultancy",
                "evidence": evidence,
            },
            "employee_count": {"value": 42, "evidence": evidence},
            "location": {"value": "southbank, vic", "evidence": evidence},
        },
        "deal": {
            "stage": {"value": "customer", "evidence": evidence},
            "outcome": {"value": "stalled", "evidence": evidence},
            "amount": {"value": 58400, "evidence": evidence},
        },
        "promises": [
            {"value": "Send a gap summary", "evidence": evidence},
            {"value": "Include onboarding sequence", "evidence": evidence},
        ],
        "objections": [
            {
                "text": "I am worried we will fail the questionnaire",
                "handling": "handled",
                "evidence": evidence,
            }
        ],
        "next_step": {
            "description": "Meet for proposal review",
            "due_date": "2026-09-03",
            "evidence": evidence,
        },
    }


def _call() -> Any:
    return eval_module.load_cases(only="call-01-northstar-labs")[0].call


def test_norm_and_token_jaccard() -> None:
    assert eval_module.norm("  Sam\u2019s  \u201cQuote\u201d ") == 'sam\'s "quote"'
    assert eval_module.token_jaccard("architecture lab planning", "lab planning practice") == 0.5
    assert eval_module.token_jaccard("", "") == 1.0


def test_each_check_passes_and_fails_on_hand_built_pair() -> None:
    call = _call()
    expected = _base_expected()
    extraction = _base_extraction(call)

    assert all(
        eval_module.CHECKS[name](expected, extraction, call) for name in eval_module.REPORTED
    )

    failures = {
        "contact_name": ("contact", "name", "value", "Mina Chen"),
        "contact_email": ("contact", "email", "value", "wrong@example.test"),
        "contact_phone": ("contact", "phone", "value", "999"),
        "contact_title": ("contact", "title", "value", "CEO"),
        "company_name": ("company", "name", "value", "Other Co"),
        "company_industry": ("company", "industry", "value", "Dental software"),
        "company_industry_exact": ("company", "industry", "value", "Architecture lab planning"),
        "company_headcount": ("company", "employee_count", "value", 41),
        "company_location": ("company", "location", "value", "Richmond, VIC"),
        "deal_stage": ("deal", "stage", "value", "evaluation"),
        "deal_outcome": ("deal", "outcome", "value", "open"),
        "deal_amount": ("deal", "amount", "value", 1),
        "promises": ("promises", None, None, []),
        "objections": ("objections", None, None, [{}, {}, {}]),
        "objection_handling": ("objections", 0, "handling", "ignored"),
    }
    for check, path in failures.items():
        broken = copy.deepcopy(extraction)
        _set_path(broken, path, path[-1])
        assert not eval_module.CHECKS[check](expected, broken, call), check

    broken_next_step = copy.deepcopy(extraction)
    broken_next_step["next_step"] = None
    assert not eval_module.check_next_step(expected, broken_next_step, call)

    broken_grounding = copy.deepcopy(extraction)
    broken_grounding["contact"]["name"]["evidence"][0]["quote"] = "not in the transcript"
    assert not eval_module.check_grounded(expected, broken_grounding, call)


def _set_path(target: dict[str, Any], path: tuple[Any, ...], value: Any) -> None:
    first, second, third, _ = path
    if second is None:
        target[first] = value
        return
    if third is None:
        target[first][second] = value
        return
    target[first][second][third] = value


def _summary(
    total: int, by_check: dict[str, int], *, cost: float, latency: float
) -> dict[str, Any]:
    checks = {}
    for check in eval_module.REPORTED:
        passed = by_check.get(check, total)
        checks[check] = {
            "passed": passed,
            "total": total,
            "pct": passed / total,
            "mean_pct": passed / total,
            "min": passed / total,
            "max": passed / total,
            "mean_passed": passed,
            "max_passed": passed,
        }
    return {
        "checks": checks,
        "parse_failures": 0,
        "mean_latency_ms": latency,
        "total_cost_usd": cost,
        "cost_per_call_usd": cost / total,
        "cost_billed": True,
        "grounding_repaired": 0,
        "grounding_dropped": 0,
        "records": total,
        "repeats": 1,
    }


def test_compare_models_picks_cheapest_model_within_one_call_of_best() -> None:
    total = 10
    expensive_better = {
        "model": "expensive",
        "summary": _summary(total, {}, cost=1.0, latency=900),
    }
    cheap_in_spread = {
        "model": "cheap",
        "summary": _summary(
            total,
            {check: total - 1 for check in eval_module.JUDGED},
            cost=0.1,
            latency=1200,
        ),
    }
    ruled_out = {
        "model": "ruled-out",
        "summary": _summary(total, {eval_module.JUDGED[0]: total - 2}, cost=0.01, latency=100),
    }

    comparison = eval_module.compare_models([cheap_in_spread, expensive_better, ruled_out])

    assert comparison["decision"]["pick"] == "cheap"
    assert comparison["decision"]["passes_gate"] is True
    assert "ruled-out" not in comparison["decision"]["candidates"]


def _field(value: str | None, quote: str, sequence: int = 0) -> StringField:
    return StringField(
        value=value,
        confidence=0.9 if value is not None else 0,
        evidence=[EvidenceSpan(sequence=sequence, quote=quote)] if value is not None else [],
    )


def _int_field(value: int | None, quote: str, sequence: int = 0) -> IntegerField:
    return IntegerField(
        value=value,
        confidence=0.9 if value is not None else 0,
        evidence=[EvidenceSpan(sequence=sequence, quote=quote)] if value is not None else [],
    )


def _quote(call: Any, sequence: int) -> str:
    return call.segments[sequence].body


def _payload_from_labels(case: Any) -> ExtractionPayload:
    expected = case.expected
    call = case.call
    stage = {"closed_won": "customer", "closed_lost": "evaluation", "proposal": "evaluation"}.get(
        expected["deal"]["stage"], expected["deal"]["stage"]
    )
    outcome = {"no_show": "stalled"}.get(expected["deal"]["outcome"], expected["deal"]["outcome"])
    next_step = expected["next_step"]
    return ExtractionPayload(
        contact=ContactFields(
            name=_field(expected["contact"]["name"], _quote(call, 0)),
            email=_field(expected["contact"]["email"], _quote(call, 0)),
            phone=_field(expected["contact"]["phone"], _quote(call, 0)),
            title=_field(expected["contact"]["role"], _quote(call, 1), 1),
        ),
        company=CompanyFields(
            name=_field(expected["company"]["name"], _quote(call, 0)),
            domain=_field(None, _quote(call, 0)),
            industry=_field(expected["company"]["industry"], _quote(call, 1), 1),
            employee_count=_int_field(expected["company"]["headcount"], _quote(call, 1), 1),
            location=_field(expected["company"]["location"], _quote(call, 0)),
        ),
        deal=DealFields(
            stage=StageField(
                value=stage,
                confidence=0.9,
                evidence=[EvidenceSpan(sequence=19, quote=_quote(call, 19))],
            ),
            outcome=OutcomeField(
                value=outcome,
                confidence=0.9,
                evidence=[EvidenceSpan(sequence=19, quote=_quote(call, 19))],
            ),
            amount=_int_field(expected["deal"]["value_aud"], _quote(call, 17), 17),
        ),
        promises=[
            _field(expected["promises"][0], _quote(call, 14), 14),
            _field(expected["promises"][1], _quote(call, 16), 16),
        ],
        objections=[
            Objection(
                text=expected["objections"][0]["text"],
                handling=expected["objections"][0]["handling"],
                confidence=0.9,
                evidence=[EvidenceSpan(sequence=13, quote=_quote(call, 13))],
            )
        ],
        next_step=NextStep(
            description=next_step["description"],
            due_date=next_step["due"],
            owner="Sam Whitfield",
            confidence=0.9,
            evidence=[EvidenceSpan(sequence=19, quote=_quote(call, 19))],
        ),
        summary="Sam agreed to send Maya materials and meet for proposal review.",
    )


def test_run_model_writes_reports_with_fake_structured(monkeypatch, tmp_path: Path) -> None:
    cases = eval_module.load_cases(only="call-01-northstar-labs")
    payload = _payload_from_labels(cases[0])

    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        assert reasoning.model == "fake/model"
        assert system
        assert user
        assert schema is ExtractionPayload
        assert max_tokens == 5000
        assert timeout is None
        return ReasoningResult(
            output=payload,
            model="fake/model",
            provider="openrouter",
            usage=Usage(input_tokens=10, output_tokens=5, cost_usd=0.001),
        )

    monkeypatch.setattr("app.services.extract.structured", fake)
    result = eval_module.run_model(
        model="fake/model",
        provider="openrouter",
        cases=cases,
        repeats=1,
        out_dir=tmp_path,
        stamp="20260912-1200",
        client=ReasoningClient(provider="openrouter", model="fake/model", client=object()),
    )

    record = result["records"][0]
    assert all(record["checks"].values())
    assert record["cost_usd"] == 0.001
    assert Path(result["paths"]["markdown"]).is_file()
    assert Path(result["paths"]["json"]).is_file()
