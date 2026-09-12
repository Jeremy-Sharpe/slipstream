from __future__ import annotations

import json
import logging
import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.schemas.scorecard import (
    Evidence,
    JudgedPlaybook,
    JudgedScorecard,
    Outcome,
    OutcomeStats,
    Playbook,
    RepProfile,
    Scorecard,
    TalkRatioBand,
    Transcript,
    TranscriptTurn,
    WinningPattern,
)

RUBRIC_VERSION = "v1"
DEFAULT_JUDGE_MODEL = "anthropic/claude-sonnet-5"
PRICES_PER_MTOK = {
    "claude-sonnet-5": (2.0, 10.0),
    "claude-haiku-4-5": (1.0, 5.0),
    "claude-opus-5": (5.0, 25.0),
    "anthropic/claude-sonnet-5": (2.0, 10.0),
    "anthropic/claude-haiku-4.5": (1.0, 5.0),
    "anthropic/claude-opus-5": (5.0, 25.0),
}
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
PRICING_RE = re.compile(r"(\$|AUD|\bper seat\b|\bper user\b|\bmonthly fee\b)", re.IGNORECASE)
WORD_RE = re.compile(r"[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?")
TRANSCRIPT_LINE_RE = re.compile(r"^\[(\d+)\] (.+?) \((rep|prospect)\): (.*)$", re.MULTILINE)
WEEKDAY_RE = re.compile(
    r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    re.IGNORECASE,
)
DATE_RE = re.compile(r"\b(\d{1,2}\s+[A-Z][a-z]+|\d{1,2}/\d{1,2}|\d{4}-\d{2}-\d{2})\b")
NEXT_STEP_RE = re.compile(r"\b(calendar|invite|send|meet|meeting|review|proposal)\b", re.IGNORECASE)
AGREEMENT_RE = re.compile(
    r"\b(yes|works|agreed|sounds good|that would|comfortable|lock|let's|lets|thanks|will do)\b",
    re.IGNORECASE,
)
REFUSAL_RE = re.compile(
    r"\b(no for now|saying no|stay as|no firm path|not ready|won't|can't)\b",
    re.IGNORECASE,
)
T = TypeVar("T")
APP_ROOT = Path(__file__).resolve().parents[1]
API_ROOT = Path(__file__).resolve().parents[2]
LOGGER = logging.getLogger(__name__)


class JudgeError(RuntimeError):
    pass


@dataclass(frozen=True)
class JudgeResult[T]:
    output: T
    input_tokens: int
    output_tokens: int
    latency_ms: int
    model: str
    parse_retries: int = 0
    cost_usd: float = 0.0


class Judge(Protocol):
    def __call__(self, *, system: str, user: str, schema: type[T]) -> JudgeResult[T]:
        ...


def load_prompt(name: str) -> str:
    return (APP_ROOT / "prompts" / f"{name}.md").read_text(encoding="utf-8")


def load_rubric() -> str:
    return (API_ROOT / "evals" / "rubric.md").read_text(encoding="utf-8")


def load_openrouter_prices() -> dict[str, tuple[float, float]]:
    path = API_ROOT / "evals" / "openrouter-prices.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        item["id"]: (float(item["prompt_per_mtok"]), float(item["completion_per_mtok"]))
        for item in data
        if not str(item["id"]).endswith(":batch")
    }


def strict_schema(model: type[BaseModel]) -> dict[str, Any]:
    schema = model.model_json_schema()
    _make_schema_strict(schema)
    return schema


def _word_count(text: str) -> int:
    return len(WORD_RE.findall(text))


def rep_talk_ratio(turns: list[TranscriptTurn]) -> float:
    rep_words = 0
    total_words = 0
    for turn in turns:
        count = _word_count(turn.text)
        total_words += count
        if turn.speaker == "rep":
            rep_words += count
    if total_words == 0:
        return 0
    return round(rep_words / total_words, 2)


def talk_ratio_band(ratio: float) -> TalkRatioBand:
    if ratio < 0.50:
        return "healthy"
    if ratio <= 0.60:
        return "heavy"
    return "monologue"


def heuristic_discovery_count(turns: list[TranscriptTurn]) -> int:
    count = 0
    for turn in turns:
        if PRICING_RE.search(turn.text):
            break
        if turn.speaker == "rep" and turn.text.rstrip().endswith("?"):
            count += 1
    return count


def transcript_from_fixture(script_path: Path) -> Transcript:
    data = json.loads(script_path.read_text(encoding="utf-8"))
    return Transcript(
        call_id=data["call_id"],
        rep=data["rep"],
        outcome=data.get("outcome"),
        turns=[
            TranscriptTurn(speaker=turn["speaker"], name=turn["name"], text=turn["text"])
            for turn in data["turns"]
        ],
    )


def transcript_from_segments(
    call_id: str,
    rep: str,
    outcome: Outcome | None,
    rows: Iterable[Mapping[str, Any]],
) -> Transcript:
    ordered = sorted(rows, key=lambda row: row.get("sequence", 0))
    rep_key = rep.casefold()
    turns: list[TranscriptTurn] = []
    for row in ordered:
        label = str(row.get("speaker") or "")
        label_key = label.casefold()
        is_rep = label_key == rep_key or rep_key in label_key or "rep" in label_key
        speaker = "rep" if is_rep else "prospect"
        name = rep if is_rep else label or "Prospect"
        turns.append(TranscriptTurn(speaker=speaker, name=name, text=str(row.get("body") or "")))
    return Transcript(call_id=call_id, rep=rep, outcome=outcome, turns=turns)


def render_transcript(transcript: Transcript) -> str:
    return "\n".join(
        f"[{index}] {turn.name} ({turn.speaker}): {turn.text}"
        for index, turn in enumerate(transcript.turns, start=1)
    )


def _make_schema_strict(node: Any) -> None:
    if isinstance(node, dict):
        properties = node.get("properties")
        if isinstance(properties, dict):
            node["additionalProperties"] = False
            node["required"] = list(properties)
        for value in node.values():
            _make_schema_strict(value)
    elif isinstance(node, list):
        for item in node:
            _make_schema_strict(item)


def _post_openrouter(
    client: httpx.Client,
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
    schema: type[BaseModel],
) -> dict[str, Any]:
    body = {
        "model": model,
        "messages": messages,
        "max_tokens": 4000,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": _snake_name(schema.__name__),
                "strict": True,
                "schema": strict_schema(schema),
            },
        },
        "provider": {"require_parameters": True},
    }
    response = client.post(
        OPENROUTER_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        json=body,
    )
    if response.status_code >= 400:
        message = response.text.replace(api_key, "[redacted]")
        raise JudgeError(f"OpenRouter API returned {response.status_code}: {message}")
    return response.json()


def _json_content(content: str) -> str:
    stripped = content.strip()
    if not stripped.startswith("```"):
        return stripped
    lines = stripped.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _snake_name(name: str) -> str:
    value = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", value).lower()


def anthropic_judge(api_key: str, model: str) -> Judge:
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)

    def judge(*, system: str, user: str, schema: type[T]) -> JudgeResult[T]:
        started_at = datetime.now(UTC)
        try:
            response = client.messages.parse(
                model=model,
                max_tokens=4000,
                system=system,
                messages=[{"role": "user", "content": user}],
                output_format=schema,
            )
        except anthropic.APIStatusError as error:
            message = f"Anthropic API returned {error.status_code}: {error.message}"
            raise JudgeError(message) from error
        latency_ms = int((datetime.now(UTC) - started_at).total_seconds() * 1000)
        return JudgeResult(
            output=response.parsed_output,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            latency_ms=latency_ms,
            model=model,
            cost_usd=cost_usd(model, response.usage.input_tokens, response.usage.output_tokens),
        )

    return judge


def openrouter_judge(
    api_key: str,
    model: str,
    *,
    prices: Mapping[str, tuple[float, float]] | None = None,
    transport: httpx.BaseTransport | None = None,
    timeout: float = 120.0,
) -> Judge:
    price_table = dict(prices or {})
    client = httpx.Client(transport=transport, timeout=timeout)

    def judge(*, system: str, user: str, schema: type[T]) -> JudgeResult[T]:
        started_at = datetime.now(UTC)
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        parse_retries = 0
        input_tokens = 0
        output_tokens = 0
        billed_usd: float | None = None
        served_model = model
        last_error: Exception | None = None
        for attempt in range(2):
            response = _post_openrouter(client, api_key, model, messages, schema)
            served_model = str(response.get("model") or model)
            usage = response.get("usage", {})
            input_tokens += int(usage.get("prompt_tokens") or 0)
            output_tokens += int(usage.get("completion_tokens") or 0)
            if usage.get("cost") is not None:
                billed_usd = (billed_usd or 0.0) + float(usage["cost"])
            content = str(response["choices"][0]["message"].get("content") or "")
            try:
                output = schema.model_validate_json(_json_content(content))
            except (KeyError, json.JSONDecodeError, ValidationError) as error:
                last_error = error
                if attempt == 1:
                    break
                parse_retries = 1
                messages.append(
                    {"role": "user", "content": "Return only the JSON object for the schema."}
                )
                continue
            latency_ms = int((datetime.now(UTC) - started_at).total_seconds() * 1000)
            return JudgeResult(
                output=output,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                model=served_model,
                parse_retries=parse_retries,
                cost_usd=round(billed_usd, 6)
                if billed_usd is not None
                else _openrouter_cost(
                    served_model,
                    model,
                    input_tokens,
                    output_tokens,
                    price_table,
                ),
            )
        raise JudgeError(f"OpenRouter response did not match schema: {last_error}") from last_error

    return judge


def heuristic_judge() -> Judge:
    def judge(*, system: str, user: str, schema: type[T]) -> JudgeResult[T]:
        started_at = datetime.now(UTC)
        if schema is JudgedScorecard:
            output = _heuristic_scorecard(user)
        elif schema is JudgedPlaybook:
            output = _heuristic_playbook(user)
        else:
            raise JudgeError(f"Unsupported heuristic schema: {schema.__name__}")
        latency_ms = int((datetime.now(UTC) - started_at).total_seconds() * 1000)
        return JudgeResult(
            output=output,
            input_tokens=max(1, len(system.split()) + len(user.split())),
            output_tokens=max(1, len(output.model_dump_json().split())),
            latency_ms=latency_ms,
            model="heuristic",
        )

    return judge


def build_judge(settings: Any) -> Judge:
    model = str(settings.scorecard_judge_model)
    if settings.openrouter_api_key is not None:
        return openrouter_judge(settings.openrouter_api_key.get_secret_value(), model)
    if settings.anthropic_api_key is not None:
        return anthropic_judge(
            settings.anthropic_api_key.get_secret_value(),
            _anthropic_model_id(model),
        )
    raise RuntimeError("No scorecard judge is configured")


def _payload_after_marker(user: str, marker: str) -> Any:
    _, _, payload = user.partition(marker)
    if not payload:
        raise JudgeError(f"Heuristic input is missing {marker.strip()}")
    return json.loads(payload.strip())


def _parse_rendered_transcript(user: str) -> list[TranscriptTurn]:
    turns: list[TranscriptTurn] = []
    for match in TRANSCRIPT_LINE_RE.finditer(user):
        turns.append(
            TranscriptTurn(
                speaker=match.group(3),  # type: ignore[arg-type]
                name=match.group(2),
                text=match.group(4),
            )
        )
    if not turns:
        raise JudgeError("Heuristic input is missing rendered transcript lines")
    return turns


def _heuristic_scorecard(user: str) -> JudgedScorecard:
    turns = _parse_rendered_transcript(user)
    discovery: list[Evidence] = []
    for index, turn in enumerate(turns, start=1):
        if PRICING_RE.search(turn.text):
            break
        if turn.speaker == "rep" and turn.text.rstrip().endswith("?"):
            discovery.append(Evidence(turn_index=index, quote=turn.text))
    next_step_evidence = _heuristic_next_step_evidence(turns)
    summary_parts = [
        f"The rep asked {len(discovery)} discovery questions before pricing.",
        "The offline heuristic does not assess objections.",
    ]
    if next_step_evidence is not None:
        summary_parts.append("A concrete next step appears near the end of the call.")
    return JudgedScorecard(
        discovery_questions=discovery,
        next_step_secured=next_step_evidence is not None,
        next_step_evidence=next_step_evidence,
        objection_handling="none_raised",
        objection_evidence=[],
        went_well=["Discovery was measured using the fixture heuristic."],
        to_improve=["Use the real judge to assess objection quality."],
        summary=" ".join(summary_parts),
    )


def _heuristic_next_step_evidence(turns: list[TranscriptTurn]) -> Evidence | None:
    if len(turns) <= 4:
        return None
    tail = list(enumerate(turns[-3:], start=max(1, len(turns) - 2)))
    tail_text = " ".join(turn.text for _, turn in tail)
    prospect_turns = [(index, turn) for index, turn in tail if turn.speaker == "prospect"]
    if not prospect_turns:
        return None
    last_prospect_index, last_prospect = prospect_turns[-1]
    has_marker = (
        WEEKDAY_RE.search(tail_text)
        or DATE_RE.search(tail_text)
        or NEXT_STEP_RE.search(tail_text)
    )
    prospect_agreed = AGREEMENT_RE.search(last_prospect.text) and not REFUSAL_RE.search(
        last_prospect.text
    )
    if has_marker and prospect_agreed:
        return Evidence(turn_index=last_prospect_index, quote=last_prospect.text)
    return None


def _heuristic_playbook(user: str) -> JudgedPlaybook:
    payload = _payload_after_marker(user, "Scorecards JSON:\n")
    scorecards = [Scorecard.model_validate(item) for item in payload]
    won = [scorecard for scorecard in scorecards if scorecard.outcome == "won"]
    examples = won[:3] or scorecards[:3]
    call_ids = [scorecard.call_id for scorecard in examples]
    quotes = [
        evidence.quote
        for scorecard in examples
        for evidence in scorecard.discovery_evidence[:1]
    ][:3]
    patterns = [
        WinningPattern(
            behaviour="Ask discovery questions before pricing",
            why_it_matters=(
                "Won calls tend to establish trigger, pain and buying context before "
                "commercial detail."
            ),
            call_ids=call_ids,
            quotes=quotes,
        )
    ]
    return JudgedPlaybook(
        patterns=patterns,
        coaching_focus=[
            "Coach reps to identify the buying trigger before discussing price.",
            "Use clear next steps with an owner and timeframe.",
        ],
    )


def score_call(
    transcript: Transcript,
    judge: Judge,
) -> tuple[Scorecard, JudgeResult[JudgedScorecard]]:
    system = load_prompt("scorecard-v1").replace("{{rubric}}", load_rubric())
    user = (
        "Transcript:\n"
        f"{render_transcript(transcript)}"
    )
    result = judge(system=system, user=user, schema=JudgedScorecard)
    judged = result.output
    discovery_evidence = _valid_evidence(judged.discovery_questions, transcript)
    next_step_evidence = _valid_evidence_item(judged.next_step_evidence, transcript)
    objection_evidence = _valid_evidence(judged.objection_evidence, transcript)
    ratio = rep_talk_ratio(transcript.turns)
    return (
        Scorecard(
            call_id=transcript.call_id,
            rep=transcript.rep,
            outcome=transcript.outcome,
            discovery_questions=len(discovery_evidence),
            discovery_evidence=discovery_evidence,
            next_step_secured=judged.next_step_secured and next_step_evidence is not None,
            next_step_evidence=next_step_evidence,
            objection_handling=judged.objection_handling,
            objection_evidence=objection_evidence,
            rep_talk_ratio=ratio,
            talk_ratio_band=talk_ratio_band(ratio),
            went_well=judged.went_well,
            to_improve=judged.to_improve,
            summary=judged.summary,
            model=result.model,
            rubric_version=RUBRIC_VERSION,
            scored_at=datetime.now(UTC),
        ),
        result,
    )


def outcome_stats(scorecards: list[Scorecard]) -> list[OutcomeStats]:
    eligible = [scorecard for scorecard in scorecards if scorecard.outcome != "no_show"]
    return [
        _outcome_stat("won", [scorecard for scorecard in eligible if scorecard.outcome == "won"]),
        _outcome_stat(
            "not_won",
            [scorecard for scorecard in eligible if scorecard.outcome != "won"],
        ),
    ]


def rep_profiles(scorecards: list[Scorecard]) -> list[RepProfile]:
    eligible = [scorecard for scorecard in scorecards if scorecard.outcome != "no_show"]
    reps = sorted({scorecard.rep for scorecard in eligible})
    return [
        RepProfile(
            rep=rep,
            calls=len(rep_scorecards),
            won=sum(1 for scorecard in rep_scorecards if scorecard.outcome == "won"),
            mean_discovery=_mean(scorecard.discovery_questions for scorecard in rep_scorecards),
            next_step_rate=_rate(scorecard.next_step_secured for scorecard in rep_scorecards),
            mean_talk_ratio=_mean(scorecard.rep_talk_ratio for scorecard in rep_scorecards),
        )
        for rep in reps
        if (rep_scorecards := [scorecard for scorecard in eligible if scorecard.rep == rep])
    ]


def derive_playbook(
    scorecards: list[Scorecard],
    judge: Judge,
) -> tuple[Playbook, JudgeResult[JudgedPlaybook]]:
    stats = outcome_stats(scorecards)
    reps = rep_profiles(scorecards)
    system = load_prompt("playbook-v1")
    user = (
        "Deterministic stats:\n"
        f"{_stats_table(stats)}\n\n"
        "Scorecards JSON:\n"
        f"{json.dumps([scorecard.model_dump(mode='json') for scorecard in scorecards])}"
    )
    result = judge(system=system, user=user, schema=JudgedPlaybook)
    patterns = _valid_patterns(result.output.patterns, scorecards)
    return (
        Playbook(
            stats=stats,
            reps=reps,
            patterns=patterns,
            coaching_focus=result.output.coaching_focus,
            model=result.model,
            generated_at=datetime.now(UTC),
        ),
        result,
    )


def cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    prices = PRICES_PER_MTOK.get(model) or load_openrouter_prices().get(model)
    if prices is None:
        return 0.0
    input_price, output_price = prices
    input_cost = input_tokens / 1_000_000 * input_price
    output_cost = output_tokens / 1_000_000 * output_price
    return round(input_cost + output_cost, 6)


def _openrouter_cost(
    served_model: str,
    requested_model: str,
    input_tokens: int,
    output_tokens: int,
    prices: Mapping[str, tuple[float, float]],
) -> float:
    price_table = dict(prices) or load_openrouter_prices()
    price = price_table.get(served_model) or price_table.get(requested_model)
    if price is None:
        LOGGER.warning("No OpenRouter price found for %s", served_model)
        return 0.0
    input_price, output_price = price
    return round(
        (input_tokens / 1_000_000 * input_price)
        + (output_tokens / 1_000_000 * output_price),
        6,
    )


def _anthropic_model_id(model: str) -> str:
    if model.startswith("anthropic/"):
        model = model.removeprefix("anthropic/")
    return model.split(":", maxsplit=1)[0].replace(".", "-")


def _valid_evidence(items: list[Evidence], transcript: Transcript) -> list[Evidence]:
    valid: list[Evidence] = []
    for item in items:
        evidence = _valid_evidence_item(item, transcript)
        if evidence is not None:
            valid.append(evidence)
    return valid


def _valid_evidence_item(item: Evidence | None, transcript: Transcript) -> Evidence | None:
    if item is None or item.turn_index > len(transcript.turns):
        return None
    turn = transcript.turns[item.turn_index - 1]
    if item.quote not in turn.text:
        return None
    return item


def _outcome_stat(outcome_group: str, scorecards: list[Scorecard]) -> OutcomeStats:
    return OutcomeStats(
        outcome_group=outcome_group,  # type: ignore[arg-type]
        calls=len(scorecards),
        mean_discovery=_mean(scorecard.discovery_questions for scorecard in scorecards),
        next_step_rate=_rate(scorecard.next_step_secured for scorecard in scorecards),
        objection_handled_rate=_rate(
            scorecard.objection_handling == "handled" for scorecard in scorecards
        ),
        mean_talk_ratio=_mean(scorecard.rep_talk_ratio for scorecard in scorecards),
    )


def _mean(values: Iterable[int | float]) -> float:
    items = list(values)
    if not items:
        return 0.0
    return round(sum(items) / len(items), 2)


def _rate(values: Iterable[bool]) -> float:
    items = list(values)
    if not items:
        return 0.0
    return round(sum(1 for item in items if item) / len(items), 2)


def _stats_table(stats: list[OutcomeStats]) -> str:
    rows = [
        "| outcome_group | calls | mean_discovery | next_step_rate | "
        "objection_handled_rate | mean_talk_ratio |"
    ]
    rows.append("|---|---:|---:|---:|---:|---:|")
    for stat in stats:
        rows.append(
            f"| {stat.outcome_group} | {stat.calls} | {stat.mean_discovery:.2f} | "
            f"{stat.next_step_rate:.2f} | {stat.objection_handled_rate:.2f} | "
            f"{stat.mean_talk_ratio:.2f} |"
        )
    return "\n".join(rows)


def _valid_patterns(
    patterns: list[WinningPattern],
    scorecards: list[Scorecard],
) -> list[WinningPattern]:
    by_call_id = {scorecard.call_id: scorecard for scorecard in scorecards}
    valid: list[WinningPattern] = []
    for pattern in patterns:
        if any(call_id not in by_call_id for call_id in pattern.call_ids):
            continue
        if all(
            _quote_is_supported(quote, pattern.call_ids, by_call_id)
            for quote in pattern.quotes
        ):
            valid.append(pattern)
    return valid


def _quote_is_supported(
    quote: str,
    call_ids: list[str],
    scorecards: dict[str, Scorecard],
) -> bool:
    for call_id in call_ids:
        scorecard = scorecards[call_id]
        evidence_quotes = [
            evidence.quote
            for evidence in [
                *scorecard.discovery_evidence,
                *scorecard.objection_evidence,
                *([scorecard.next_step_evidence] if scorecard.next_step_evidence else []),
            ]
        ]
        quote_in_evidence = any(quote in evidence_quote for evidence_quote in evidence_quotes)
        if quote in scorecard.summary or quote_in_evidence:
            return True
    return False
