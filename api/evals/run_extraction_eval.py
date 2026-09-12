from __future__ import annotations

import argparse
import contextlib
import json
import os
import re
import sys
import threading
import time
from collections.abc import Callable, Iterator
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Literal
from unittest import mock

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.core.config import Settings  # noqa: E402
from app.core.llm import (  # noqa: E402
    MissingReasoningProviderError,
    ReasoningClient,
    Usage,
    create_anthropic_client,
    create_openai_client,
    create_openrouter_client,
)
from app.routers.calls import _fixture_transcript, _read_fixture, _record  # noqa: E402
from app.services import extract as extract_module  # noqa: E402
from app.services.extract import ExtractionUnavailableError, extract_with_model  # noqa: E402

FIXTURES_ROOT = API_ROOT.parent / "fixtures" / "calls"
DEFAULT_MODELS = [
    "anthropic/claude-haiku-4.5",
    "anthropic/claude-sonnet-5",
    "anthropic/claude-opus-5",
    "openai/gpt-5.4-nano",
    "openai/gpt-5.4-mini",
    "openai/gpt-5.4",
    "deepseek/deepseek-v3.2",
    "meta-llama/llama-4-maverick",
    "mistralai/mistral-medium-3.1",
]
SINGLE_MODEL_DEFAULT = "deepseek/deepseek-v3.2"
JUDGED = [
    "contact_name",
    "contact_email",
    "company_name",
    "company_headcount",
    "deal_outcome",
    "deal_amount",
    "next_step",
    "promises",
    "objection_handling",
]
REPORTED = [
    *JUDGED,
    "contact_phone",
    "contact_title",
    "company_industry",
    "company_industry_exact",
    "company_location",
    "deal_stage",
    "objections",
    "grounded",
]
CHECK = "\u2713"
CROSS = "\u2717"
Provider = Literal["openrouter", "openai", "anthropic"]

_USAGE_LOCAL = threading.local()
_STRUCTURED_PATCH_LOCK = threading.Lock()
_PATCH_DEPTH = 0
_PATCHER: Any = None
_ORIGINAL_STRUCTURED: Callable[..., Any] | None = None


@dataclass(frozen=True)
class EvalCase:
    call_id: str
    outcome: str
    expected: dict[str, Any]
    call: Any


def norm(value: object) -> str:
    text = "" if value is None else str(value)
    replacements = str.maketrans(
        {
            "\u2018": "'",
            "\u2019": "'",
            "\u201c": '"',
            "\u201d": '"',
            "\u2013": "-",
            "\u2014": "-",
        }
    )
    return re.sub(r"\s+", " ", text.translate(replacements).casefold()).strip()


def token_jaccard(left: object, right: object) -> float:
    left_tokens = set(re.findall(r"[a-z0-9]+", norm(left)))
    right_tokens = set(re.findall(r"[a-z0-9]+", norm(right)))
    if not left_tokens and not right_tokens:
        return 1.0
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / len(left_tokens | right_tokens)


def digits(value: object) -> str:
    return re.sub(r"\D+", "", "" if value is None else str(value))


def _value(data: dict[str, Any], *path: str) -> Any:
    current: Any = data
    for part in path:
        if current is None:
            return None
        current = current.get(part) if isinstance(current, dict) else getattr(current, part)
    return current


def _expected_stage(expected: dict[str, Any]) -> str | None:
    stage = _value(expected, "deal", "stage")
    return {
        "closed_won": "customer",
        "closed_lost": "evaluation",
        "proposal": "evaluation",
    }.get(stage, stage)


def _expected_outcome(expected: dict[str, Any]) -> str | None:
    outcome = _value(expected, "deal", "outcome")
    return {"no_show": "stalled"}.get(outcome, outcome)


def check_contact_name(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return norm(_value(expected, "contact", "name")) == norm(
        _value(extraction, "contact", "name", "value")
    )


def check_contact_email(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return norm(_value(expected, "contact", "email")) == norm(
        _value(extraction, "contact", "email", "value")
    )


def check_contact_phone(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return digits(_value(expected, "contact", "phone")) == digits(
        _value(extraction, "contact", "phone", "value")
    )


def check_contact_title(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return norm(_value(expected, "contact", "role")) == norm(
        _value(extraction, "contact", "title", "value")
    )


def check_company_name(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return norm(_value(expected, "company", "name")) == norm(
        _value(extraction, "company", "name", "value")
    )


def check_company_industry(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return (
        token_jaccard(
            _value(expected, "company", "industry"),
            _value(extraction, "company", "industry", "value"),
        )
        >= 0.5
    )


def check_company_industry_exact(
    expected: dict[str, Any], extraction: dict[str, Any], call: Any
) -> bool:
    del call
    return norm(_value(expected, "company", "industry")) == norm(
        _value(extraction, "company", "industry", "value")
    )


def check_company_headcount(
    expected: dict[str, Any], extraction: dict[str, Any], call: Any
) -> bool:
    del call
    return _value(expected, "company", "headcount") == _value(
        extraction, "company", "employee_count", "value"
    )


def check_company_location(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return norm(_value(expected, "company", "location")) == norm(
        _value(extraction, "company", "location", "value")
    )


def check_deal_stage(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return _expected_stage(expected) == _value(extraction, "deal", "stage", "value")


def check_deal_outcome(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return _expected_outcome(expected) == _value(extraction, "deal", "outcome", "value")


def check_deal_amount(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return _value(expected, "deal", "value_aud") == _value(extraction, "deal", "amount", "value")


def check_next_step(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    expected_next = expected.get("next_step")
    extracted_next = extraction.get("next_step")
    if bool(expected_next) != bool(extracted_next):
        return False
    if not expected_next or not extracted_next:
        return True
    expected_due = expected_next.get("due")
    if expected_due is None:
        return True
    return str(extracted_next.get("due_date")) == str(expected_due)


def check_promises(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return abs(len(extraction.get("promises", [])) - len(expected.get("promises", []))) <= 1


def check_objections(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del call
    return abs(len(extraction.get("objections", [])) - len(expected.get("objections", []))) <= 1


def check_objection_handling(
    expected: dict[str, Any], extraction: dict[str, Any], call: Any
) -> bool:
    del call
    expected_objections = expected.get("objections", [])
    extracted_objections = extraction.get("objections", [])
    if not expected_objections:
        return not extracted_objections
    if not extracted_objections:
        return False
    matched = 0
    for expected_objection in expected_objections:
        best = max(
            extracted_objections,
            key=lambda objection: token_jaccard(
                expected_objection.get("text", ""), objection.get("text", "")
            ),
        )
        if token_jaccard(expected_objection.get("text", ""), best.get("text", "")) < 0.4:
            return False
        if expected_objection.get("handling") != best.get("handling"):
            return False
        matched += 1
    return matched > 0


def _evidence_spans(extraction: dict[str, Any]) -> Iterator[dict[str, Any]]:
    for section in ("contact", "company"):
        for field in extraction.get(section, {}).values():
            yield from field.get("evidence", [])
    for field in extraction.get("deal", {}).values():
        if isinstance(field, dict):
            yield from field.get("evidence", [])
    for promise in extraction.get("promises", []):
        yield from promise.get("evidence", [])
    for objection in extraction.get("objections", []):
        yield from objection.get("evidence", [])
    next_step = extraction.get("next_step")
    if next_step:
        yield from next_step.get("evidence", [])


def check_grounded(expected: dict[str, Any], extraction: dict[str, Any], call: Any) -> bool:
    del expected
    segments = {segment.sequence: segment.body for segment in call.segments}
    for span in _evidence_spans(extraction):
        if span.get("source") != "transcript":
            return False
        quote = span.get("quote")
        sequence = span.get("sequence")
        if not isinstance(quote, str) or quote not in segments.get(sequence, ""):
            return False
    return True


CHECKS: dict[str, Callable[[dict[str, Any], dict[str, Any], Any], bool]] = {
    "contact_name": check_contact_name,
    "contact_email": check_contact_email,
    "contact_phone": check_contact_phone,
    "contact_title": check_contact_title,
    "company_name": check_company_name,
    "company_industry": check_company_industry,
    "company_industry_exact": check_company_industry_exact,
    "company_headcount": check_company_headcount,
    "company_location": check_company_location,
    "deal_stage": check_deal_stage,
    "deal_outcome": check_deal_outcome,
    "deal_amount": check_deal_amount,
    "next_step": check_next_step,
    "promises": check_promises,
    "objections": check_objections,
    "objection_handling": check_objection_handling,
    "grounded": check_grounded,
}


def compute_checks(
    expected: dict[str, Any], extraction: dict[str, Any], call: Any
) -> dict[str, bool]:
    return {name: CHECKS[name](expected, extraction, call) for name in REPORTED}


def _load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as input_file:
        payload = json.load(input_file)
    if not isinstance(payload, dict):
        raise ValueError(f"{path} did not contain a JSON object")
    return payload


def load_cases(
    *, only: str | None = None, limit: int | None = None, include_demo: bool = False
) -> list[EvalCase]:
    cases: list[EvalCase] = []
    for script_path in sorted(FIXTURES_ROOT.glob("*/script.json")):
        payload = _read_fixture(script_path)
        if only is not None and payload["call_id"] != only:
            continue
        if payload.get("demo") is True and not include_demo:
            continue
        expected = _load_json(script_path.with_name("expected.json"))["extraction"]
        transcript = _fixture_transcript(payload)
        call = _record(
            source_external_id=payload["call_id"],
            subject=payload["company"]["name"],
            occurred_at=datetime.fromisoformat(payload["scheduled_at"]),
            transcript=transcript,
            fixture=True,
        )
        cases.append(
            EvalCase(
                call_id=payload["call_id"],
                outcome=payload["outcome"],
                expected=expected,
                call=call,
            )
        )
        if limit is not None and len(cases) >= limit:
            break
    return cases


def parse_dotenv(path: Path) -> dict[str, str]:
    if not path.is_file():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        value = value.strip().strip("\"'")
        values[key.strip()] = value
    return values


def choose_provider(provider: str | None, env: dict[str, str]) -> Provider:
    if provider is not None:
        return provider  # type: ignore[return-value]
    if env.get("OPENROUTER_API_KEY"):
        return "openrouter"
    if env.get("OPENAI_API_KEY"):
        return "openai"
    if env.get("ANTHROPIC_API_KEY"):
        return "anthropic"
    raise SystemExit(
        "No reasoning provider key found. Set OPENROUTER_API_KEY, OPENAI_API_KEY, "
        "or ANTHROPIC_API_KEY in the environment or api/.env."
    )


def build_reasoning_client(
    *, provider: Provider, model: str, settings: Settings
) -> ReasoningClient:
    if provider == "openrouter":
        return ReasoningClient(
            provider="openrouter",
            model=model,
            client=create_openrouter_client(settings),
        )
    if provider == "openai":
        model_id = model.removeprefix("openai/")
        return ReasoningClient(
            provider="openai",
            model=model_id,
            client=create_openai_client(settings),
        )
    model_id = model.removeprefix("anthropic/")
    return ReasoningClient(
        provider="anthropic",
        model=model_id,
        client=create_anthropic_client(settings),
    )


def _recording_structured(*args: Any, **kwargs: Any) -> Any:
    if _ORIGINAL_STRUCTURED is None:
        raise RuntimeError("Structured usage recorder is not installed")
    original = _ORIGINAL_STRUCTURED
    result = original(*args, **kwargs)
    _USAGE_LOCAL.last_usage = result.usage
    return result


@contextlib.contextmanager
def record_structured_usage() -> Iterator[None]:
    global _ORIGINAL_STRUCTURED, _PATCH_DEPTH, _PATCHER
    with _STRUCTURED_PATCH_LOCK:
        if _PATCH_DEPTH == 0:
            _ORIGINAL_STRUCTURED = extract_module.structured
            _PATCHER = mock.patch.object(extract_module, "structured", _recording_structured)
            _PATCHER.start()
        _PATCH_DEPTH += 1
    try:
        yield
    finally:
        with _STRUCTURED_PATCH_LOCK:
            _PATCH_DEPTH -= 1
            if _PATCH_DEPTH == 0:
                _PATCHER.stop()
                _PATCHER = None
                _ORIGINAL_STRUCTURED = None


def _usage_dict(usage: Usage | None) -> dict[str, Any]:
    if usage is None:
        return {"input": None, "output": None}
    return {"input": usage.input_tokens, "output": usage.output_tokens}


def _failed_record(
    *,
    case: EvalCase,
    model: str,
    error: Exception,
    latency_ms: int,
) -> dict[str, Any]:
    return {
        "call_id": case.call_id,
        "repeat": None,
        "outcome": case.outcome,
        "expected": case.expected,
        "extraction": None,
        "checks": {name: False for name in REPORTED},
        "grounding": {"repaired": 0, "dropped": 0},
        "tokens": {"input": None, "output": None},
        "latency_ms": latency_ms,
        "model": model,
        "cost_usd": None,
        "failed": True,
        "error": _error_text(error),
    }


def _error_text(error: BaseException) -> str:
    cause = error.__cause__
    if cause is None:
        return str(error)
    return f"{error}: {type(cause).__name__}: {str(cause)[:400]}"


def run_case(case: EvalCase, client: ReasoningClient, *, repeat: int) -> dict[str, Any]:
    _USAGE_LOCAL.last_usage = None
    started = time.perf_counter()
    try:
        result = extract_with_model(case.call, client)
    except (ExtractionUnavailableError, MissingReasoningProviderError) as error:
        latency_ms = round((time.perf_counter() - started) * 1000)
        record = _failed_record(
            case=case,
            model=client.model,
            error=error,
            latency_ms=latency_ms,
        )
        record["repeat"] = repeat
        return record
    latency_ms = round((time.perf_counter() - started) * 1000)
    usage = getattr(_USAGE_LOCAL, "last_usage", None)
    extraction = result.model_dump(mode="json")
    checks = compute_checks(case.expected, extraction, case.call)
    return {
        "call_id": case.call_id,
        "repeat": repeat,
        "outcome": case.outcome,
        "expected": case.expected,
        "extraction": extraction,
        "checks": checks,
        "grounding": result.grounding.model_dump(mode="json"),
        "tokens": _usage_dict(usage),
        "latency_ms": latency_ms,
        "model": result.model,
        "cost_usd": usage.cost_usd if usage is not None else None,
        "failed": False,
        "error": None,
    }


def summarize_records(records: list[dict[str, Any]]) -> dict[str, Any]:
    repeat_ids = sorted({record["repeat"] for record in records if record["repeat"] is not None})
    checks: dict[str, dict[str, Any]] = {}
    for check in REPORTED:
        passed = sum(1 for record in records if record["checks"].get(check) is True)
        total = len(records)
        repeat_passed = []
        repeat_pct = []
        for repeat_id in repeat_ids:
            repeat_records = [record for record in records if record["repeat"] == repeat_id]
            repeat_total = len(repeat_records)
            repeat_count = sum(
                1 for record in repeat_records if record["checks"].get(check) is True
            )
            repeat_passed.append(repeat_count)
            repeat_pct.append(repeat_count / repeat_total if repeat_total else 0)
        checks[check] = {
            "passed": passed,
            "total": total,
            "pct": passed / total if total else 0,
            "mean_pct": sum(repeat_pct) / len(repeat_pct) if repeat_pct else 0,
            "min": min(repeat_pct) if repeat_pct else 0,
            "max": max(repeat_pct) if repeat_pct else 0,
            "mean_passed": sum(repeat_passed) / len(repeat_passed) if repeat_passed else 0,
            "max_passed": max(repeat_passed) if repeat_passed else 0,
        }
    costs = [record["cost_usd"] for record in records if record["cost_usd"] is not None]
    total_cost = sum(float(cost) for cost in costs)
    return {
        "checks": checks,
        "parse_failures": sum(1 for record in records if record["failed"]),
        "mean_latency_ms": (
            sum(record["latency_ms"] for record in records) / len(records) if records else 0
        ),
        "total_cost_usd": total_cost,
        "cost_per_call_usd": total_cost / len(records) if records and costs else None,
        "cost_billed": bool(costs),
        "grounding_repaired": sum(record["grounding"]["repaired"] for record in records),
        "grounding_dropped": sum(record["grounding"]["dropped"] for record in records),
        "records": len(records),
        "repeats": len(repeat_ids),
    }


def slug_model(model: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", model.casefold()).strip("-")


def _cost_text(value: float | None) -> str:
    if value is None:
        return "not billed"
    return f"${value:.4f}"


def render_model_markdown(model_result: dict[str, Any]) -> str:
    model = model_result["model"]
    records = model_result.get("records", [])
    summary = model_result["summary"]
    lines = [
        f"# Extraction eval: {model}",
        "",
        "| call | outcome | " + " | ".join(JUDGED) + " | repaired | dropped | latency_ms | cost |",
        "|---|---|" + "|".join("---" for _ in JUDGED) + "|---:|---:|---:|---:|",
    ]
    for record in records:
        marks = [CHECK if record["checks"].get(check) else CROSS for check in JUDGED]
        lines.append(
            f"| {record['call_id']} | {record['outcome']} | "
            + " | ".join(marks)
            + f" | {record['grounding']['repaired']} | {record['grounding']['dropped']}"
            + f" | {record['latency_ms']} | {_cost_text(record['cost_usd'])} |"
        )
    judged_pct = sum(summary["checks"][check]["pct"] for check in JUDGED) / len(JUDGED)
    lines.extend(
        [
            "",
            (
                f"Summary: {summary['parse_failures']} parse failures, "
                f"{summary['mean_latency_ms']:.0f} ms mean latency, "
                f"{_cost_text(summary['total_cost_usd'])} total cost, "
                f"{judged_pct:.1%} mean judged pass rate."
            ),
        ]
    )
    if not summary["cost_billed"]:
        lines.append("Cost was not billed by this provider; latency is used for sorting.")
    return "\n".join(lines) + "\n"


def render_comparison_markdown(comparison: dict[str, Any]) -> str:
    lines = [
        "# Extraction eval comparison",
        "",
        "| model | "
        + " | ".join(JUDGED)
        + " | grounded | parse failures | mean latency | total cost | cost/call |",
        "|---|" + "|".join("---:" for _ in JUDGED) + "|---:|---:|---:|---:|---:|",
    ]
    for model_result in comparison["models"]:
        if model_result.get("skipped"):
            lines.append(
                f"| {model_result['model']} | "
                + " | ".join("skipped" for _ in JUDGED)
                + " | skipped | skipped | skipped | skipped | skipped |"
            )
            continue
        summary = model_result["summary"]
        row = [
            model_result["model"],
            *[f"{summary['checks'][check]['pct']:.0%}" for check in JUDGED],
            f"{summary['checks']['grounded']['pct']:.0%}",
            str(summary["parse_failures"]),
            f"{summary['mean_latency_ms']:.0f} ms",
            _cost_text(summary["total_cost_usd"]) if summary["cost_billed"] else "not billed",
            _cost_text(summary["cost_per_call_usd"]),
        ]
        lines.append("| " + " | ".join(row) + " |")
    decision = comparison["decision"]
    lines.extend(["", "## Decision"])
    if decision["pick"] is None:
        lines.append("No model was picked.")
    else:
        gate = "passes" if decision["passes_gate"] else "misses"
        lines.append(f"Pick: {decision['pick']} ({gate} the 75% judged-check gate).")
    if comparison.get("cost_note"):
        lines.append(comparison["cost_note"])
    return "\n".join(lines) + "\n"


def write_model_reports(
    *, model_result: dict[str, Any], out_dir: Path, stamp: str
) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = slug_model(model_result["model"])
    json_path = out_dir / f"extraction-{slug}-{stamp}.json"
    md_path = out_dir / f"extraction-{slug}-{stamp}.md"
    json_path.write_text(json.dumps(model_result, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(render_model_markdown(model_result), encoding="utf-8")
    return md_path, json_path


def write_comparison_report(
    *, comparison: dict[str, Any], out_dir: Path, stamp: str
) -> tuple[Path, Path, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / f"extraction-comparison-{stamp}.json"
    md_path = out_dir / f"extraction-comparison-{stamp}.md"
    markdown = render_comparison_markdown(comparison)
    json_path.write_text(json.dumps(comparison, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(markdown, encoding="utf-8")
    return md_path, json_path, markdown


def run_model(
    *,
    model: str,
    provider: Provider = "openrouter",
    settings: Settings | None = None,
    cases: list[EvalCase] | None = None,
    repeats: int = 1,
    out_dir: Path | None = None,
    stamp: str | None = None,
    client: ReasoningClient | None = None,
    record_usage: bool = True,
) -> dict[str, Any]:
    settings = settings or Settings(_env_file=API_ROOT / ".env")
    cases = cases if cases is not None else load_cases()
    out_dir = out_dir or API_ROOT / "evals" / "results"
    stamp = stamp or datetime.now().strftime("%Y%m%d-%H%M")
    reasoning = client or build_reasoning_client(
        provider=provider,
        model=model,
        settings=settings,
    )

    def execute() -> dict[str, Any]:
        records = [
            run_case(case, reasoning, repeat=repeat)
            for repeat in range(1, repeats + 1)
            for case in cases
        ]
        model_result = {
            "model": model,
            "provider": provider,
            "records": records,
            "summary": summarize_records(records),
        }
        md_path, json_path = write_model_reports(
            model_result=model_result, out_dir=out_dir, stamp=stamp
        )
        model_result["paths"] = {"markdown": str(md_path), "json": str(json_path)}
        return model_result

    if record_usage:
        with record_structured_usage():
            return execute()
    return execute()


def compare_models(model_results: list[dict[str, Any]]) -> dict[str, Any]:
    completed = [result for result in model_results if not result.get("skipped")]
    decision = {"pick": None, "passes_gate": False, "candidates": []}
    if not completed:
        return {"models": model_results, "decision": decision, "cost_note": ""}

    best_by_check = {
        check: max(result["summary"]["checks"][check]["mean_passed"] for result in completed)
        for check in JUDGED
    }
    candidates = [
        result
        for result in completed
        if all(
            result["summary"]["checks"][check]["mean_passed"] >= best_by_check[check] - 1
            for check in JUDGED
        )
    ]

    def sort_key(result: dict[str, Any]) -> tuple[int, float, float, str]:
        summary = result["summary"]
        if summary["cost_billed"]:
            return (0, summary["total_cost_usd"], summary["mean_latency_ms"], result["model"])
        return (1, summary["mean_latency_ms"], 0, result["model"])

    pick = min(candidates, key=sort_key) if candidates else None
    passes_gate = False
    if pick is not None:
        passes_gate = all(pick["summary"]["checks"][check]["pct"] >= 0.75 for check in JUDGED)
        decision = {
            "pick": pick["model"],
            "passes_gate": passes_gate,
            "candidates": [candidate["model"] for candidate in candidates],
        }
    cost_note = ""
    if completed and all(not result["summary"]["cost_billed"] for result in completed):
        cost_note = "Cost was not billed for any model; eligible models were sorted by latency."
    return {"models": model_results, "decision": decision, "cost_note": cost_note}


def resolve_models(args: argparse.Namespace) -> list[str]:
    if args.model is not None:
        return [args.model]
    if args.models == "default":
        return DEFAULT_MODELS
    return [model.strip() for model in args.models.split(",") if model.strip()]


def run_models(
    *,
    models: list[str],
    provider: Provider,
    settings: Settings,
    cases: list[EvalCase],
    repeats: int,
    max_usd: float,
    concurrency: int,
    out_dir: Path,
    stamp: str,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any] | None] = [None] * len(models)
    next_index = 0
    running: dict[Future[dict[str, Any]], int] = {}
    accumulated_cost = 0.0

    def submit(executor: ThreadPoolExecutor) -> None:
        nonlocal next_index
        while (
            next_index < len(models) and len(running) < concurrency and accumulated_cost <= max_usd
        ):
            index = next_index
            next_index += 1
            future = executor.submit(
                run_model,
                model=models[index],
                provider=provider,
                settings=settings,
                cases=cases,
                repeats=repeats,
                out_dir=out_dir,
                stamp=stamp,
                record_usage=False,
            )
            running[future] = index

    with record_structured_usage():
        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            submit(executor)
            while running:
                done, _ = wait(running, return_when=FIRST_COMPLETED)
                for future in done:
                    index = running.pop(future)
                    result = future.result()
                    results[index] = result
                    if result["summary"]["cost_billed"]:
                        accumulated_cost += result["summary"]["total_cost_usd"]
                submit(executor)

    for index in range(next_index, len(models)):
        results[index] = {
            "model": models[index],
            "provider": provider,
            "skipped": True,
            "reason": "budget",
            "records": [],
            "summary": None,
        }
    return [result for result in results if result is not None]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the extraction eval over labelled fixtures.")
    parser.add_argument("--provider", choices=["openrouter", "openai", "anthropic"])
    parser.add_argument("--models", default="default")
    parser.add_argument("--model", help=f"single-model shorthand, e.g. {SINGLE_MODEL_DEFAULT}")
    parser.add_argument("--repeats", type=int, default=1)
    parser.add_argument("--max-usd", type=float, default=5.0)
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--only")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--include-demo", action="store_true")
    parser.add_argument("--out", type=Path, default=API_ROOT / "evals" / "results")
    parser.add_argument("--stamp")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    dotenv = parse_dotenv(API_ROOT / ".env")
    env = {**dotenv, **os.environ}
    try:
        provider = choose_provider(args.provider, env)
    except SystemExit as error:
        print(error, file=sys.stderr)
        return 2
    settings = Settings(_env_file=API_ROOT / ".env")
    models = resolve_models(args)
    cases = load_cases(only=args.only, limit=args.limit, include_demo=args.include_demo)
    stamp = args.stamp or datetime.now().strftime("%Y%m%d-%H%M")
    results = run_models(
        models=models,
        provider=provider,
        settings=settings,
        cases=cases,
        repeats=args.repeats,
        max_usd=args.max_usd,
        concurrency=args.concurrency,
        out_dir=args.out,
        stamp=stamp,
    )
    comparison = compare_models(results)
    comparison_md, comparison_json, markdown = write_comparison_report(
        comparison=comparison, out_dir=args.out, stamp=stamp
    )
    print(markdown)
    for result in results:
        paths = result.get("paths")
        if paths:
            print(paths["markdown"])
            print(paths["json"])
    print(comparison_md)
    print(comparison_json)
    decision = comparison["decision"]
    return 0 if decision["pick"] is not None and decision["passes_gate"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
