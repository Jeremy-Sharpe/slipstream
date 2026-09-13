from __future__ import annotations

import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from pydantic import ValidationError

from schema import CallScript, Expected


ROOT = Path(__file__).parent
CALLS_DIR = ROOT / "calls"
CLIENTS_PATH = ROOT / "crm" / "clients.json"
SELLER_NAME = "Eleno"
FORBIDDEN_BRAND = "Hour" + "glass"
# Real people at the seller. The reps are fictional personas; the seller's staff must never be depicted.
FORBIDDEN_NAMES = ("Liam Albrecht", "Charlie Bessell", "Angus Roberts", "Nathan Luo")
PRICING_RE = re.compile(r"(\$|AUD|\bper seat\b|\bper user\b|\bmonthly fee\b)", re.IGNORECASE)
WORD_RE = re.compile(r"[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?")


@dataclass
class CallBundle:
    call_id: str
    script_path: Path
    expected_path: Path
    script: CallScript
    expected: Expected
    words: int
    rep_talk_ratio: float
    discovery_questions: int


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def word_count(text: str) -> int:
    return len(WORD_RE.findall(text))


def dialogue_text(script: CallScript) -> str:
    return "\n".join(turn.text for turn in script.turns)


def computed_talk_ratio(script: CallScript) -> float:
    rep_words = 0
    total_words = 0
    for turn in script.turns:
        count = word_count(turn.text)
        total_words += count
        if turn.speaker == "rep":
            rep_words += count
    if total_words == 0:
        return 0
    return round(rep_words / total_words, 2)


def computed_discovery_questions(script: CallScript) -> int:
    count = 0
    for turn in script.turns:
        if PRICING_RE.search(turn.text):
            break
        if turn.speaker == "rep" and turn.text.rstrip().endswith("?"):
            count += 1
    return count


def iter_text_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        ignored_parts = {".venv", ".pytest_cache", "__pycache__"}
        if path.is_file() and path.name != "uv.lock" and not ignored_parts.intersection(path.parts):
            yield path


def _client_names(errors: list[str]) -> list[str]:
    if not CLIENTS_PATH.exists():
        errors.append("crm/clients.json is missing")
        return []
    try:
        rows = json.loads(CLIENTS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"crm/clients.json is not valid JSON: {exc}")
        return []
    names = [str(row.get("name", "")).strip() for row in rows if isinstance(row, dict)]
    for row in rows:
        domain = str(row.get("domain", "")) if isinstance(row, dict) else ""
        if not domain.endswith(".example"):
            errors.append(f"crm/clients.json: {row.get('name', '?')} domain must end in .example")
        if isinstance(row, dict) and (row.get("outcome") != "won" or row.get("stage") != "closed_won"):
            errors.append(f"crm/clients.json: {row.get('name', '?')} must be a won, closed_won deal")
        for key in ("employee_count", "amount", "contact", "contact_name"):
            if isinstance(row, dict) and key in row:
                errors.append(f"crm/clients.json: {row.get('name', '?')} must not carry {key}")
    return [name for name in names if name]


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def _assert_contains(label: str, needle: str, haystack: str, errors: list[str]) -> None:
    if _normalise(needle) not in _normalise(haystack):
        errors.append(f"{label} not found in script: {needle!r}")


def load_call(folder: Path, errors: list[str]) -> CallBundle | None:
    script_path = folder / "script.json"
    expected_path = folder / "expected.json"
    call_id = folder.name
    if not script_path.exists() or not expected_path.exists():
        errors.append(f"{call_id}: missing script.json or expected.json")
        return None
    try:
        script = CallScript.model_validate(_read_json(script_path))
        expected = Expected.model_validate(_read_json(expected_path))
    except (json.JSONDecodeError, ValidationError) as exc:
        errors.append(f"{call_id}: schema validation failed: {exc}")
        return None
    words = sum(word_count(turn.text) for turn in script.turns)
    return CallBundle(
        call_id=call_id,
        script_path=script_path,
        expected_path=expected_path,
        script=script,
        expected=expected,
        words=words,
        rep_talk_ratio=computed_talk_ratio(script),
        discovery_questions=computed_discovery_questions(script),
    )


def validate_all() -> tuple[list[CallBundle], list[str]]:
    errors: list[str] = []
    bundles: list[CallBundle] = []
    if not CALLS_DIR.exists():
        return [], ["calls directory is missing"]

    client_names = _client_names(errors)
    for path in iter_text_files(ROOT):
        if path.resolve() == Path(__file__).resolve():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if FORBIDDEN_BRAND in text:
            errors.append(f"forbidden string appears in {path.relative_to(ROOT)}")
        for name in FORBIDDEN_NAMES:
            if name in text:
                errors.append(f"seller staff name appears in {path.relative_to(ROOT)}")
        # Real clients are CRM rows only. No call may quote, name or invent anything about them.
        if CALLS_DIR in path.parents:
            for name in client_names:
                if name.lower() in text.lower():
                    errors.append(f"real client {name} appears in {path.relative_to(ROOT)}")

    call_folders = sorted(path for path in CALLS_DIR.iterdir() if path.is_dir())
    for folder in call_folders:
        bundle = load_call(folder, errors)
        if bundle is not None:
            bundles.append(bundle)

    demo_bundles = [bundle for bundle in bundles if bundle.script.demo]
    history_bundles = [bundle for bundle in bundles if not bundle.script.demo]
    if len(demo_bundles) != 1:
        errors.append(f"expected exactly one demo call, found {len(demo_bundles)}")

    mix = Counter(bundle.script.outcome for bundle in history_bundles)
    expected_mix = Counter({"won": 5, "stalled": 3, "lost": 3, "no_show": 1})
    if mix != expected_mix:
        errors.append(f"outcome mix is {dict(mix)}, expected {dict(expected_mix)}")

    for bundle in bundles:
        call_id = bundle.call_id
        script = bundle.script
        expected = bundle.expected
        transcript = dialogue_text(script)

        if script.call_id != call_id or expected.call_id != call_id:
            errors.append(f"{call_id}: ids must match folder name")
        if script.seller != SELLER_NAME:
            errors.append(f"{call_id}: seller must be {SELLER_NAME}")
        if script.outcome == "no_show":
            if not 60 <= bundle.words <= 120:
                errors.append(f"{call_id}: no-show word count {bundle.words} outside 60 to 120")
        elif not 700 <= bundle.words <= 1300:
            errors.append(f"{call_id}: real call word count {bundle.words} outside 700 to 1300")
        for index, turn in enumerate(script.turns, start=1):
            if len(turn.text) > 600:
                errors.append(f"{call_id}: turn {index} exceeds 600 characters")

        _assert_contains(f"{call_id}: contact name", expected.extraction.contact.name, transcript, errors)
        _assert_contains(f"{call_id}: company name", expected.extraction.company.name, transcript, errors)
        for promise in expected.extraction.promises:
            _assert_contains(f"{call_id}: promise", promise, transcript, errors)
        for objection in expected.extraction.objections:
            _assert_contains(f"{call_id}: objection", objection.text, transcript, errors)
        if not script.demo and expected.risk_flags:
            errors.append(f"{call_id}: non-demo calls must not have risk flags")

        if abs(expected.scorecard.rep_talk_ratio - bundle.rep_talk_ratio) > 0.03:
            errors.append(
                f"{call_id}: expected talk ratio {expected.scorecard.rep_talk_ratio:.2f} "
                f"does not match computed {bundle.rep_talk_ratio:.2f}"
            )
        if abs(expected.scorecard.discovery_questions - bundle.discovery_questions) > 1:
            errors.append(
                f"{call_id}: expected discovery {expected.scorecard.discovery_questions} "
                f"does not match heuristic {bundle.discovery_questions}"
            )

        next_step = expected.extraction.next_step
        if expected.scorecard.next_step_secured:
            if next_step is None or next_step.due is None:
                errors.append(f"{call_id}: secured next step must include a due date")
        elif next_step is not None and next_step.due is not None:
            errors.append(f"{call_id}: unsecured next step must be null or due-less")

        if script.demo:
            if bundle.rep_talk_ratio < 0.60:
                errors.append(f"{call_id}: demo talk ratio {bundle.rep_talk_ratio:.2f} must be >= 0.60")
            if expected.scorecard.discovery_questions > 1:
                errors.append(f"{call_id}: demo discovery must be <= 1")
            if len(expected.risk_flags) != 5:
                errors.append(f"{call_id}: demo call must have exactly five risk flags")
            for risk_flag in expected.risk_flags:
                if risk_flag.turn_index > len(script.turns):
                    errors.append(f"{call_id}: risk flag turn {risk_flag.turn_index} is outside script")
                    continue
                turn_text = script.turns[risk_flag.turn_index - 1].text
                _assert_contains(f"{call_id}: risk flag turn {risk_flag.turn_index}", risk_flag.text, turn_text, errors)

        if script.outcome == "won" and not script.demo:
            if expected.scorecard.discovery_questions < 4:
                errors.append(f"{call_id}: won calls need at least 4 discovery questions")
            if not expected.scorecard.next_step_secured:
                errors.append(f"{call_id}: won calls need a secured next step")
            if bundle.rep_talk_ratio > 0.50:
                errors.append(f"{call_id}: won talk ratio {bundle.rep_talk_ratio:.2f} must be <= 0.50")
        if script.outcome == "lost" and script.trigger is None:
            if not (bundle.rep_talk_ratio >= 0.55 or expected.scorecard.discovery_questions <= 1):
                errors.append(f"{call_id}: lost no-trigger calls need high rep talk or low discovery")

    return bundles, errors


def print_summary(bundles: list[CallBundle]) -> None:
    print("| call_id | demo | outcome | rep | words | discovery | talk_ratio | next_step |")
    print("|---|---:|---|---:|---:|---:|---:|---|")
    for bundle in bundles:
        print(
            f"| {bundle.call_id} | {bundle.script.demo} | {bundle.script.outcome} | {bundle.script.rep} | "
            f"{bundle.words} | {bundle.discovery_questions} | {bundle.rep_talk_ratio:.2f} | "
            f"{bundle.expected.scorecard.next_step_secured} |"
        )
    history_mix = Counter(bundle.script.outcome for bundle in bundles if not bundle.script.demo)
    demo_count = sum(1 for bundle in bundles if bundle.script.demo)
    print(f"\nValidated {len(bundles)} calls: history={dict(sorted(history_mix.items()))}, demo={demo_count}")


def main() -> int:
    bundles, errors = validate_all()
    print_summary(bundles)
    if errors:
        print("\nErrors:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
