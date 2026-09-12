from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
CALLS_ROOT = REPO_ROOT / "fixtures" / "calls"

if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.schemas.scorecard import Scorecard  # noqa: E402
from app.services.score import (  # noqa: E402
    DEFAULT_JUDGE_MODEL,
    Judge,
    anthropic_judge,
    cost_usd,
    heuristic_judge,
    score_call,
    transcript_from_fixture,
)


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
    scorecard, result = score_call(transcript, judge)
    record = {
        "call_id": case.call_id,
        "outcome": transcript.outcome,
        "expected": expected,
        "scorecard": scorecard.model_dump(mode="json"),
        "checks": {
            "discovery_tolerance": abs(
                expected["discovery_questions"] - scorecard.discovery_questions
            )
            <= 1,
            "discovery_exact": expected["discovery_questions"] == scorecard.discovery_questions,
            "next_step": expected["next_step_secured"] == scorecard.next_step_secured,
            "objection": expected["objection_handling"] == scorecard.objection_handling,
            "talk_ratio": abs(expected["rep_talk_ratio"] - scorecard.rep_talk_ratio) <= 0.03,
        },
        "tokens": {
            "input": result.input_tokens,
            "output": result.output_tokens,
        },
        "latency_ms": result.latency_ms,
        "model": result.model,
        "cost_usd": cost_usd(result.model, result.input_tokens, result.output_tokens),
    }
    return record


def summarise(records: list[dict[str, Any]]) -> dict[str, Any]:
    dimensions = ["discovery_tolerance", "discovery_exact", "next_step", "objection", "talk_ratio"]
    checks = {
        dimension: _agreement([record["checks"][dimension] for record in records])
        for dimension in dimensions
    }
    total_cost = round(sum(record["cost_usd"] for record in records), 6)
    mean_latency = round(
        sum(record["latency_ms"] for record in records) / len(records) if records else 0,
        2,
    )
    return {
        "cases": len(records),
        "checks": checks,
        "total_cost_usd": total_cost,
        "mean_latency_ms": mean_latency,
        "passes_gate": all(
            checks[dimension]["pct"] >= 75
            for dimension in ["discovery_tolerance", "next_step", "objection", "talk_ratio"]
        ),
    }


def write_report(
    *,
    records: list[dict[str, Any]],
    summary: dict[str, Any],
    out_dir: Path,
    label: str,
) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "-", label)
    markdown_path = out_dir / f"scorecard-{safe_label}-{stamp}.md"
    json_path = out_dir / f"scorecard-{safe_label}-{stamp}.json"
    markdown_path.write_text(_markdown_report(records, summary), encoding="utf-8")
    json_path.write_text(
        json.dumps({"records": records, "summary": summary}, indent=2),
        encoding="utf-8",
    )
    return markdown_path, json_path


def build_judge(kind: str, model: str) -> Judge:
    if kind == "heuristic":
        return heuristic_judge()
    api_key = _anthropic_api_key()
    if api_key is None:
        raise SystemExit("ANTHROPIC_API_KEY is required for --judge anthropic")
    return anthropic_judge(api_key, model)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the Slipstream scorecard eval.")
    parser.add_argument("--judge", choices=["anthropic", "heuristic"], default=None)
    parser.add_argument("--model", default=DEFAULT_JUDGE_MODEL)
    parser.add_argument("--only")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--out", type=Path, default=API_ROOT / "evals" / "results")
    parser.add_argument("--include-demo", action="store_true")
    args = parser.parse_args(argv)
    judge_kind = args.judge or ("anthropic" if _anthropic_api_key() else "heuristic")
    judge = build_judge(judge_kind, args.model)
    cases = load_cases(only=args.only, limit=args.limit, include_demo=args.include_demo)
    records = [evaluate_case(case, judge) for case in cases]
    summary = summarise(records)
    label = "heuristic" if judge_kind == "heuristic" else args.model
    markdown_path, json_path = write_report(
        records=records,
        summary=summary,
        out_dir=args.out,
        label=label,
    )
    report = _markdown_report(records, summary)
    print(report)
    print(f"\nWrote {_display_path(markdown_path)} and {_display_path(json_path)}")
    return 0 if summary["passes_gate"] else 1


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
        "objection expected/got | talk ratio expected/got | latency ms | cost |",
        "|---|---|---:|---|---|---:|---:|---:|",
    ]
    for record in records:
        expected = record["expected"]
        scorecard = Scorecard.model_validate(record["scorecard"])
        lines.append(
            f"| {record['call_id']} | {record['outcome']} | "
            f"{expected['discovery_questions']}/{scorecard.discovery_questions} | "
            f"{expected['next_step_secured']}/{scorecard.next_step_secured} | "
            f"{expected['objection_handling']}/{scorecard.objection_handling} | "
            f"{expected['rep_talk_ratio']:.2f}/{scorecard.rep_talk_ratio:.2f} | "
            f"{record['latency_ms']} | ${record['cost_usd']:.6f} |"
        )
    lines.extend(["", _summary_line(summary)])
    return "\n".join(lines)


def _summary_line(summary: dict[str, Any]) -> str:
    checks = summary["checks"]
    parts = [f"cases={summary['cases']}"]
    dimensions = ["discovery_tolerance", "discovery_exact", "next_step", "objection", "talk_ratio"]
    for dimension in dimensions:
        agreement = checks[dimension]
        parts.append(
            f"{dimension}={agreement['passed']}/{agreement['total']} ({agreement['pct']:.1f}%)"
        )
    parts.append(f"total_cost=${summary['total_cost_usd']:.6f}")
    parts.append(f"mean_latency_ms={summary['mean_latency_ms']:.2f}")
    return "Summary: " + "; ".join(parts)


def _anthropic_api_key() -> str | None:
    if api_key := os.environ.get("ANTHROPIC_API_KEY"):
        return api_key
    env_path = API_ROOT / ".env"
    if not env_path.exists():
        return None
    for line in env_path.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.partition("=")
        if separator and key.strip() == "ANTHROPIC_API_KEY" and value.strip():
            return value.strip().strip('"').strip("'")
    return None


if __name__ == "__main__":
    raise SystemExit(main())
