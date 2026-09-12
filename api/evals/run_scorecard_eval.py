from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections.abc import Sequence
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
CALLS_ROOT = REPO_ROOT / "fixtures" / "calls"

if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.schemas.scorecard import Scorecard  # noqa: E402
from app.services.score import (  # noqa: E402
    DEFAULT_JUDGE_MODEL,
    Judge,
    JudgeError,
    anthropic_judge,
    cost_usd,
    heuristic_judge,
    openrouter_judge,
    score_call,
    transcript_from_fixture,
)

JudgeKind = Literal["openrouter", "anthropic", "heuristic"]
DEFAULT_BAKEOFF_MODELS = [
    "anthropic/claude-haiku-4.5",
    "anthropic/claude-sonnet-5",
    "anthropic/claude-opus-5",
    "openai/gpt-5.4-nano",
    "openai/gpt-5.4-mini",
    "openai/gpt-5.4",
    "deepseek/deepseek-v3.2",
    "qwen/qwen3.6-27b",
    "meta-llama/llama-4-maverick",
    "moonshotai/kimi-k2.6",
    "mistralai/mistral-medium-3.1",
]
JUDGED_DIMENSIONS = ["discovery_tolerance", "next_step", "objection"]
REPORT_DIMENSIONS = [
    "discovery_tolerance",
    "discovery_exact",
    "next_step",
    "objection",
    "talk_ratio",
]


@dataclass(frozen=True)
class EvalCase:
    call_id: str
    script_path: Path
    expected_path: Path
    demo: bool


def load_cases(
    *,
    only: str | None = None,
    limit: int | None = None,
    include_demo: bool = False,
) -> list[EvalCase]:
    cases: list[EvalCase] = []
    for folder in sorted(path for path in CALLS_ROOT.iterdir() if path.is_dir()):
        script_path = folder / "script.json"
        expected_path = folder / "expected.json"
        script = _read_json(script_path)
        demo = bool(script.get("demo", False))
        if demo and not include_demo:
            continue
        if only is not None and folder.name != only:
            continue
        cases.append(EvalCase(folder.name, script_path, expected_path, demo))
    if limit is not None:
        return cases[:limit]
    return cases


def evaluate_case(case: EvalCase, judge: Judge) -> dict[str, Any]:
    transcript = transcript_from_fixture(case.script_path)
    expected = _read_json(case.expected_path)["scorecard"]
    try:
        scorecard, result = score_call(transcript, judge)
    except JudgeError as error:
        return _failed_record(case, expected, str(error))
    return {
        "call_id": case.call_id,
        "outcome": transcript.outcome,
        "expected": expected,
        "scorecard": scorecard.model_dump(mode="json"),
        "checks": _checks(expected, scorecard),
        "tokens": {
            "input": result.input_tokens,
            "output": result.output_tokens,
        },
        "latency_ms": result.latency_ms,
        "model": result.model,
        "cost_usd": result.cost_usd
        or cost_usd(result.model, result.input_tokens, result.output_tokens),
        "parse_retries": result.parse_retries,
        "judge_failed": False,
        "error": None,
    }


def summarise(records: list[dict[str, Any]]) -> dict[str, Any]:
    checks = {
        dimension: _agreement([record["checks"][dimension] for record in records])
        for dimension in REPORT_DIMENSIONS
    }
    total_cost = round(sum(record["cost_usd"] for record in records), 6)
    mean_latency = round(
        sum(record["latency_ms"] for record in records) / len(records) if records else 0,
        2,
    )
    return {
        "cases": len(records),
        "checks": checks,
        "parse_failures": sum(1 for record in records if record["judge_failed"]),
        "parse_retries": sum(int(record["parse_retries"]) for record in records),
        "total_cost_usd": total_cost,
        "mean_latency_ms": mean_latency,
        "cost_per_call_usd": round(total_cost / len(records), 6) if records else 0.0,
        "passes_gate": all(checks[dimension]["pct"] >= 75 for dimension in JUDGED_DIMENSIONS),
    }


def summarise_model_runs(model: str, repeats: list[dict[str, Any]]) -> dict[str, Any]:
    if not repeats:
        return {"model": model, "skipped": "budget"}
    calls = sum(repeat["summary"]["cases"] for repeat in repeats)
    total_cost = round(sum(repeat["summary"]["total_cost_usd"] for repeat in repeats), 6)
    checks = {}
    for dimension in REPORT_DIMENSIONS:
        values = [repeat["summary"]["checks"][dimension]["pct"] for repeat in repeats]
        passed = [repeat["summary"]["checks"][dimension]["passed"] for repeat in repeats]
        checks[dimension] = {
            "mean_pct": round(sum(values) / len(values), 1),
            "min_pct": round(min(values), 1),
            "max_pct": round(max(values), 1),
            "mean_passed": round(sum(passed) / len(passed), 2),
            "max_passed": max(passed),
        }
    return {
        "model": model,
        "skipped": None,
        "repeats": len(repeats),
        "cases_per_repeat": repeats[0]["summary"]["cases"],
        "calls": calls,
        "checks": checks,
        "parse_failures": sum(repeat["summary"]["parse_failures"] for repeat in repeats),
        "mean_latency_ms": round(
            sum(repeat["summary"]["mean_latency_ms"] for repeat in repeats) / len(repeats),
            2,
        ),
        "total_cost_usd": total_cost,
        "cost_per_call_usd": round(total_cost / calls, 6) if calls else 0.0,
    }


def compare_models(model_summaries: list[dict[str, Any]]) -> dict[str, Any]:
    candidates = [summary for summary in model_summaries if not summary.get("skipped")]
    if not candidates:
        return {"pick": None, "rule_outs": {}, "best": {}, "reason": "all models skipped or failed"}
    best = {
        dimension: max(summary["checks"][dimension]["mean_passed"] for summary in candidates)
        for dimension in JUDGED_DIMENSIONS
    }
    within_spread = []
    rule_outs: dict[str, list[str]] = {}
    for summary in candidates:
        ruled_out = [
            dimension
            for dimension in JUDGED_DIMENSIONS
            if summary["checks"][dimension]["mean_passed"] < best[dimension] - 1
        ]
        if ruled_out:
            rule_outs[summary["model"]] = ruled_out
        else:
            within_spread.append(summary)
    if not within_spread:
        return {
            "pick": None,
            "rule_outs": rule_outs,
            "best": best,
            "reason": "no model within spread",
        }
    pick = sorted(
        within_spread,
        key=lambda summary: (
            summary["total_cost_usd"],
            -_mean_agreement(summary),
            summary["model"],
        ),
    )[0]
    return {
        "pick": pick["model"],
        "runners_up": [summary["model"] for summary in within_spread if summary is not pick],
        "rule_outs": rule_outs,
        "best": best,
        "reason": "cheapest model within one call of the best on every judged dimension",
    }


def write_report(
    *,
    records: list[dict[str, Any]],
    summary: dict[str, Any],
    out_dir: Path,
    label: str,
    stamp: str | None = None,
) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    report_stamp = stamp or datetime.now().strftime("%Y%m%d-%H%M")
    safe_label = _slug(label)
    markdown_path = out_dir / f"scorecard-{safe_label}-{report_stamp}.md"
    json_path = out_dir / f"scorecard-{safe_label}-{report_stamp}.json"
    markdown_path.write_text(_markdown_report(records, summary), encoding="utf-8")
    json_path.write_text(
        json.dumps({"records": records, "summary": summary}, indent=2),
        encoding="utf-8",
    )
    return markdown_path, json_path


def write_comparison_report(
    *,
    model_summaries: list[dict[str, Any]],
    decision: dict[str, Any],
    out_dir: Path,
    stamp: str,
) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    markdown_path = out_dir / f"scorecard-comparison-{stamp}.md"
    json_path = out_dir / f"scorecard-comparison-{stamp}.json"
    markdown_path.write_text(_comparison_markdown(model_summaries, decision), encoding="utf-8")
    json_path.write_text(
        json.dumps({"models": model_summaries, "decision": decision}, indent=2),
        encoding="utf-8",
    )
    return markdown_path, json_path


def build_judge(kind: JudgeKind, model: str) -> Judge:
    if kind == "heuristic":
        return heuristic_judge()
    if kind == "openrouter":
        api_key = _api_key("OPENROUTER_API_KEY")
        if api_key is None:
            raise SystemExit("OPENROUTER_API_KEY is required for --judge openrouter")
        return openrouter_judge(api_key, model)
    api_key = _api_key("ANTHROPIC_API_KEY")
    if api_key is None:
        raise SystemExit("ANTHROPIC_API_KEY is required for --judge anthropic")
    return anthropic_judge(api_key, _anthropic_model_id(model))


def run_model(
    *,
    kind: JudgeKind,
    model: str,
    cases: list[EvalCase],
    repeats: int,
) -> dict[str, Any]:
    repeat_results = []
    for repeat in range(1, repeats + 1):
        judge = build_judge(kind, model)
        records = [evaluate_case(case, judge) for case in cases]
        repeat_results.append(
            {
                "repeat": repeat,
                "records": records,
                "summary": summarise(records),
            }
        )
    return {
        "model": model,
        "repeats": repeat_results,
        "summary": summarise_model_runs(model, repeat_results),
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the Slipstream scorecard eval.")
    parser.add_argument("--judge", choices=["openrouter", "anthropic", "heuristic"], default=None)
    parser.add_argument("--model", default=DEFAULT_JUDGE_MODEL)
    parser.add_argument("--models")
    parser.add_argument("--repeats", type=int, default=1)
    parser.add_argument("--max-usd", type=float, default=5.0)
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--only")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--out", type=Path, default=API_ROOT / "evals" / "results")
    parser.add_argument("--include-demo", action="store_true")
    args = parser.parse_args(argv)
    judge_kind = args.judge or _default_judge_kind()
    models = _models(args.models, args.model)
    cases = load_cases(only=args.only, limit=args.limit, include_demo=args.include_demo)
    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    results = _run_models(
        kind=judge_kind,
        models=models,
        cases=cases,
        repeats=args.repeats,
        max_usd=args.max_usd,
        concurrency=args.concurrency,
    )
    model_summaries = []
    written_paths: list[Path] = []
    for result in results:
        if result.get("skipped"):
            model_summaries.append({"model": result["model"], "skipped": result["skipped"]})
            continue
        records = [
            record
            for repeat in result["repeats"]
            for record in repeat["records"]
        ]
        summary = result["summary"]
        model_summaries.append(summary)
        markdown_path, json_path = write_report(
            records=records,
            summary=summary,
            out_dir=args.out,
            label=result["model"],
            stamp=stamp,
        )
        written_paths.extend([markdown_path, json_path])
    decision = compare_models(model_summaries)
    comparison_md, comparison_json = write_comparison_report(
        model_summaries=model_summaries,
        decision=decision,
        out_dir=args.out,
        stamp=stamp,
    )
    written_paths.extend([comparison_md, comparison_json])
    print(_comparison_markdown(model_summaries, decision))
    print("\nWrote " + ", ".join(str(_display_path(path)) for path in written_paths))
    return 0 if _passes_exit_gate(model_summaries, decision) else 1


def _run_models(
    *,
    kind: JudgeKind,
    models: list[str],
    cases: list[EvalCase],
    repeats: int,
    max_usd: float,
    concurrency: int,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    accumulated_cost = 0.0
    next_index = 0
    with ThreadPoolExecutor(max_workers=max(1, concurrency)) as executor:
        pending = {}
        while next_index < len(models) and len(pending) < max(1, concurrency):
            model = models[next_index]
            pending[
                executor.submit(
                    run_model,
                    kind=kind,
                    model=model,
                    cases=cases,
                    repeats=repeats,
                )
            ] = model
            next_index += 1
        while pending:
            future = next(as_completed(pending))
            pending.pop(future)
            result = future.result()
            accumulated_cost += result["summary"]["total_cost_usd"]
            results.append(result)
            while (
                next_index < len(models)
                and accumulated_cost <= max_usd
                and len(pending) < max(1, concurrency)
            ):
                model = models[next_index]
                pending[
                    executor.submit(
                        run_model,
                        kind=kind,
                        model=model,
                        cases=cases,
                        repeats=repeats,
                    )
                ] = model
                next_index += 1
        for model in models[next_index:]:
            results.append({"model": model, "skipped": "budget"})
    order = {model: index for index, model in enumerate(models)}
    return sorted(results, key=lambda result: order[result["model"]])


def _checks(expected: dict[str, Any], scorecard: Scorecard) -> dict[str, bool]:
    return {
        "discovery_tolerance": abs(
            expected["discovery_questions"] - scorecard.discovery_questions
        )
        <= 1,
        "discovery_exact": expected["discovery_questions"] == scorecard.discovery_questions,
        "next_step": expected["next_step_secured"] == scorecard.next_step_secured,
        "objection": expected["objection_handling"] == scorecard.objection_handling,
        "talk_ratio": abs(expected["rep_talk_ratio"] - scorecard.rep_talk_ratio) <= 0.03,
    }


def _failed_record(case: EvalCase, expected: dict[str, Any], error: str) -> dict[str, Any]:
    return {
        "call_id": case.call_id,
        "outcome": None,
        "expected": expected,
        "scorecard": None,
        "checks": {dimension: False for dimension in REPORT_DIMENSIONS},
        "tokens": {"input": 0, "output": 0},
        "latency_ms": 0,
        "model": None,
        "cost_usd": 0.0,
        "parse_retries": 1,
        "judge_failed": True,
        "error": error,
    }


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _display_path(path: Path) -> Path:
    try:
        return path.relative_to(API_ROOT)
    except ValueError:
        return path


def _agreement(values: list[bool]) -> dict[str, Any]:
    passed = sum(1 for value in values if value)
    total = len(values)
    pct = round((passed / total * 100) if total else 0, 1)
    return {"passed": passed, "total": total, "pct": pct}


def _markdown_report(records: list[dict[str, Any]], summary: dict[str, Any]) -> str:
    lines = [
        "# Scorecard Eval",
        "",
        "| call | outcome | discovery expected/got | next step expected/got | "
        "objection expected/got | talk ratio expected/got | latency ms | cost | parse retries |",
        "|---|---|---:|---|---|---:|---:|---:|---:|",
    ]
    for record in records:
        expected = record["expected"]
        if record["scorecard"] is None:
            lines.append(
                f"| {record['call_id']} | failed | {expected['discovery_questions']}/- | "
                f"{expected['next_step_secured']}/- | {expected['objection_handling']}/- | "
                f"{expected['rep_talk_ratio']:.2f}/- | 0 | $0.000000 | {record['parse_retries']} |"
            )
            continue
        scorecard = Scorecard.model_validate(record["scorecard"])
        lines.append(
            f"| {record['call_id']} | {record['outcome']} | "
            f"{expected['discovery_questions']}/{scorecard.discovery_questions} | "
            f"{expected['next_step_secured']}/{scorecard.next_step_secured} | "
            f"{expected['objection_handling']}/{scorecard.objection_handling} | "
            f"{expected['rep_talk_ratio']:.2f}/{scorecard.rep_talk_ratio:.2f} | "
            f"{record['latency_ms']} | ${record['cost_usd']:.6f} | "
            f"{record['parse_retries']} |"
        )
    lines.extend(["", _summary_line(summary)])
    return "\n".join(lines)


def _comparison_markdown(model_summaries: list[dict[str, Any]], decision: dict[str, Any]) -> str:
    lines = [
        "# Scorecard Comparison",
        "",
        "| model | discovery within 1 | discovery exact | next step | objection | talk ratio | "
        "parse failures | mean latency ms | total cost USD | cost per call |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for summary in model_summaries:
        if summary.get("skipped"):
            lines.append(
                f"| {summary['model']} | skipped: {summary['skipped']} | - | - | - | "
                "- | - | - | - | - |"
            )
            continue
        checks = summary["checks"]
        lines.append(
            f"| {summary['model']} | {_range(checks['discovery_tolerance'])} | "
            f"{_range(checks['discovery_exact'])} | {_range(checks['next_step'])} | "
            f"{_range(checks['objection'])} | {_range(checks['talk_ratio'])} | "
            f"{summary['parse_failures']} | {summary['mean_latency_ms']:.2f} | "
            f"${summary['total_cost_usd']:.6f} | ${summary['cost_per_call_usd']:.6f} |"
        )
    lines.extend(["", "## Decision", ""])
    if decision["pick"] is None:
        lines.append(f"No pick: {decision['reason']}.")
        return "\n".join(lines)
    lines.append(f"Pick: `{decision['pick']}`.")
    if decision.get("runners_up"):
        lines.append(f"Runners-up within spread: {', '.join(decision['runners_up'])}.")
    if decision["rule_outs"]:
        for model, dimensions in decision["rule_outs"].items():
            lines.append(f"`{model}` ruled out by: {', '.join(dimensions)}.")
    return "\n".join(lines)


def _summary_line(summary: dict[str, Any]) -> str:
    if "cases" not in summary:
        return _model_summary_line(summary)
    parts = [f"cases={summary['cases']}"]
    for dimension in REPORT_DIMENSIONS:
        agreement = summary["checks"][dimension]
        parts.append(
            f"{dimension}={agreement['passed']}/{agreement['total']} ({agreement['pct']:.1f}%)"
        )
    parts.append(f"parse_failures={summary['parse_failures']}")
    parts.append(f"parse_retries={summary['parse_retries']}")
    parts.append(f"total_cost=${summary['total_cost_usd']:.6f}")
    parts.append(f"mean_latency_ms={summary['mean_latency_ms']:.2f}")
    return "Summary: " + "; ".join(parts)


def _model_summary_line(summary: dict[str, Any]) -> str:
    parts = [
        f"repeats={summary['repeats']}",
        f"cases_per_repeat={summary['cases_per_repeat']}",
    ]
    for dimension in REPORT_DIMENSIONS:
        check = summary["checks"][dimension]
        parts.append(f"{dimension}={_range(check)}")
    parts.append(f"parse_failures={summary['parse_failures']}")
    parts.append(f"total_cost=${summary['total_cost_usd']:.6f}")
    parts.append(f"mean_latency_ms={summary['mean_latency_ms']:.2f}")
    return "Summary: " + "; ".join(parts)


def _range(check: dict[str, Any]) -> str:
    if check["min_pct"] == check["max_pct"]:
        return f"{check['mean_pct']:.1f}%"
    return f"{check['mean_pct']:.1f}% ({check['min_pct']:.1f}-{check['max_pct']:.1f})"


def _mean_agreement(summary: dict[str, Any]) -> float:
    return sum(summary["checks"][dimension]["mean_pct"] for dimension in JUDGED_DIMENSIONS) / len(
        JUDGED_DIMENSIONS
    )


def _models(models_arg: str | None, model_arg: str) -> list[str]:
    if models_arg == "default":
        return DEFAULT_BAKEOFF_MODELS
    if models_arg:
        return [model.strip() for model in models_arg.split(",") if model.strip()]
    return [model_arg]


def _default_judge_kind() -> JudgeKind:
    if _api_key("OPENROUTER_API_KEY"):
        return "openrouter"
    if _api_key("ANTHROPIC_API_KEY"):
        return "anthropic"
    return "heuristic"


def _api_key(name: str) -> str | None:
    if api_key := os.environ.get(name):
        return api_key
    env_path = API_ROOT / ".env"
    if not env_path.exists():
        return None
    for line in env_path.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.partition("=")
        if separator and key.strip() == name and value.strip():
            return value.strip().strip('"').strip("'")
    return None


def _slug(label: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", label.replace("/", "-").replace(":", "-"))


def _anthropic_model_id(model: str) -> str:
    if model.startswith("anthropic/"):
        model = model.removeprefix("anthropic/")
    return model.split(":", maxsplit=1)[0]


def _passes_exit_gate(model_summaries: list[dict[str, Any]], decision: dict[str, Any]) -> bool:
    if decision["pick"] is None:
        return False
    picked = next(summary for summary in model_summaries if summary["model"] == decision["pick"])
    return all(picked["checks"][dimension]["mean_pct"] >= 75 for dimension in JUDGED_DIMENSIONS)


if __name__ == "__main__":
    raise SystemExit(main())
