from __future__ import annotations

import hashlib
import json
import logging
import math
import re
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.schemas.scorecard import (
    BehaviourPattern,
    BehaviourQuote,
    Evidence,
    JudgedPlaybook,
    JudgedScorecard,
    Outcome,
    OutcomeStats,
    PatternRate,
    Playbook,
    PlaybookSource,
    RepProfile,
    Scorecard,
    TalkRatioBand,
    Transcript,
    TranscriptTurn,
    WinningPattern,
)

RUBRIC_VERSION = "v1"
DISCOVERY_FLOOR = 4
MAX_BEHAVIOUR_QUOTES = 3
MIN_CONTAINED_QUOTE_CHARS = 25
DEFAULT_JUDGE_MODEL = "deepseek/deepseek-v3.2"
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
QUOTE_CHAR_MAP = str.maketrans(
    {
        "\u2018": "'",
        "\u2019": "'",
        "\u201a": "'",
        "\u201b": "'",
        "\u2032": "'",
        "\u00b4": "'",
        "\u0060": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u201e": '"',
        "\u201f": '"',
        "\u2033": '"',
        "\u2026": "...",
    }
)
QUOTE_SPACE_RE = re.compile(r"\s+")
QUOTE_EDGE_RE = re.compile(r"^[\s\"'.,;:!?]+|[\s\"'.,;:!?]+$")
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
    def __init__(
        self,
        message: str,
        *,
        input_tokens: int = 0,
        output_tokens: int = 0,
        latency_ms: int = 0,
        model: str | None = None,
        cost_usd: float | None = None,
        cost_complete: bool = False,
        parse_retries: int = 0,
    ) -> None:
        super().__init__(message)
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
        self.latency_ms = latency_ms
        self.model = model
        self.cost_usd = cost_usd
        self.cost_complete = cost_complete
        self.parse_retries = parse_retries


@dataclass(frozen=True)
class JudgeResult[T]:
    output: T
    input_tokens: int
    output_tokens: int
    latency_ms: int
    model: str
    parse_retries: int = 0
    cost_usd: float | None = None
    cost_complete: bool = False


class Judge(Protocol):
    def __call__(self, *, system: str, user: str, schema: type[T]) -> JudgeResult[T]: ...


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
    try:
        response = client.post(
            OPENROUTER_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
        )
    except httpx.HTTPError as error:
        raise JudgeError("OpenRouter request failed") from error
    if response.status_code >= 400:
        raise JudgeError(f"OpenRouter request failed with status {response.status_code}")
    try:
        payload = response.json()
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise JudgeError("OpenRouter returned an invalid response") from error
    if not isinstance(payload, dict):
        raise JudgeError("OpenRouter returned an invalid response")
    return payload


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
        except Exception as error:
            raise JudgeError(
                "Anthropic request failed",
                latency_ms=int((datetime.now(UTC) - started_at).total_seconds() * 1000),
                model=model,
            ) from error
        latency_ms = int((datetime.now(UTC) - started_at).total_seconds() * 1000)
        request_cost = cost_usd(model, response.usage.input_tokens, response.usage.output_tokens)
        if response.parsed_output is None:
            raise JudgeError(
                "Anthropic returned no structured scorecard",
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                latency_ms=latency_ms,
                model=model,
                cost_usd=request_cost,
                cost_complete=request_cost is not None,
            )
        return JudgeResult(
            output=response.parsed_output,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            latency_ms=latency_ms,
            model=model,
            cost_usd=request_cost,
            cost_complete=request_cost is not None,
        )

    judge.close = client.close  # type: ignore[attr-defined]
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
        attempt_costs: list[float | None] = []
        served_model = model
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                response = _post_openrouter(client, api_key, model, messages, schema)
            except JudgeError as error:
                attempt_costs.append(None)
                error.input_tokens = input_tokens
                error.output_tokens = output_tokens
                error.latency_ms = int((datetime.now(UTC) - started_at).total_seconds() * 1000)
                error.model = served_model
                error.cost_usd = _known_total(attempt_costs)
                error.cost_complete = _cost_complete(attempt_costs)
                error.parse_retries = parse_retries
                raise
            served_model = str(response.get("model") or model)
            # Reserve this attempt before parsing provider-controlled usage. Any
            # malformed response has unknown spend rather than inheriting a
            # misleadingly complete total from earlier attempts.
            attempt_costs.append(None)
            try:
                usage = response.get("usage") or {}
                if not isinstance(usage, dict):
                    raise TypeError("usage is not an object")
                attempt_input_tokens = int(usage.get("prompt_tokens") or 0)
                attempt_output_tokens = int(usage.get("completion_tokens") or 0)
                if attempt_input_tokens < 0 or attempt_output_tokens < 0:
                    raise ValueError("usage tokens are negative")
                usage_complete = (
                    usage.get("prompt_tokens") is not None
                    and usage.get("completion_tokens") is not None
                )
                input_tokens += attempt_input_tokens
                output_tokens += attempt_output_tokens
                billed_attempt = float(usage["cost"]) if usage.get("cost") is not None else None
                if billed_attempt is not None and (
                    billed_attempt < 0 or not math.isfinite(billed_attempt)
                ):
                    raise ValueError("usage cost is invalid")
                attempt_costs[-1] = (
                    billed_attempt
                    if billed_attempt is not None
                    else _openrouter_cost(
                        served_model,
                        model,
                        attempt_input_tokens,
                        attempt_output_tokens,
                        price_table,
                    )
                    if usage_complete
                    else None
                )
                choices = response["choices"]
                if not isinstance(choices, list) or not choices:
                    raise ValueError("choices is empty")
                choice = choices[0]
                message = choice["message"]
                if not isinstance(message, dict) or message.get("refusal"):
                    raise ValueError("message was refused")
                if choice.get("finish_reason") not in (None, "stop"):
                    raise ValueError("response was incomplete")
                content = message.get("content")
                if not isinstance(content, str) or not content.strip():
                    raise ValueError("content is empty")
            except (KeyError, TypeError, ValueError) as error:
                raise JudgeError(
                    "OpenRouter returned an invalid response",
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    latency_ms=int((datetime.now(UTC) - started_at).total_seconds() * 1000),
                    model=served_model,
                    cost_usd=_known_total(attempt_costs),
                    cost_complete=_cost_complete(attempt_costs),
                    parse_retries=parse_retries,
                ) from error
            try:
                output = schema.model_validate_json(_json_content(content))
            except (json.JSONDecodeError, ValidationError) as error:
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
                cost_usd=_known_total(attempt_costs),
                cost_complete=_cost_complete(attempt_costs),
            )
        raise JudgeError(
            "OpenRouter response did not match the scorecard schema",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=int((datetime.now(UTC) - started_at).total_seconds() * 1000),
            model=served_model,
            cost_usd=_known_total(attempt_costs),
            cost_complete=_cost_complete(attempt_costs),
            parse_retries=parse_retries,
        ) from last_error

    judge.close = client.close  # type: ignore[attr-defined]
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
            cost_usd=0.0,
            cost_complete=True,
        )

    return judge


def build_judge(settings: Any) -> Judge:
    model = str(settings.scorecard_judge_model)
    if settings.openrouter_api_key is not None:
        return openrouter_judge(settings.openrouter_api_key.get_secret_value(), model)
    if settings.anthropic_api_key is not None:
        anthropic_model = (
            _anthropic_model_id(model)
            if model.startswith(("anthropic/", "claude-"))
            else "claude-haiku-4-5"
        )
        return anthropic_judge(
            settings.anthropic_api_key.get_secret_value(),
            anthropic_model,
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
        WEEKDAY_RE.search(tail_text) or DATE_RE.search(tail_text) or NEXT_STEP_RE.search(tail_text)
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
        evidence.quote for scorecard in examples for evidence in scorecard.discovery_evidence[:1]
    ][:3]
    patterns = (
        [
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
        if call_ids and quotes and len(call_ids) == len(quotes)
        else []
    )
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
    *,
    scoring_started_at: datetime | None = None,
) -> tuple[Scorecard, JudgeResult[JudgedScorecard]]:
    system = load_prompt("scorecard-v1").replace("{{rubric}}", load_rubric())
    user = f"Transcript:\n{render_transcript(transcript)}"
    result = judge(system=system, user=user, schema=JudgedScorecard)
    judged = result.output
    discovery_evidence = _valid_evidence(
        judged.discovery_questions,
        transcript,
        required_speaker="rep",
        unique_by_turn=True,
    )
    next_step_evidence = (
        _valid_evidence_item(judged.next_step_evidence, transcript)
        if judged.next_step_secured
        else None
    )
    objection_evidence = _valid_evidence(judged.objection_evidence, transcript)
    objection_handling = (
        judged.objection_handling
        if judged.objection_handling != "none_raised" and objection_evidence
        else "none_raised"
    )
    ratio = rep_talk_ratio(transcript.turns)
    next_step_secured = judged.next_step_secured and next_step_evidence is not None
    went_well, to_improve, summary = _grounded_coaching(
        len(discovery_evidence), next_step_secured, objection_handling, ratio
    )
    scorecard = Scorecard(
        call_id=transcript.call_id,
        request_id=transcript.request_id,
        source_external_id=transcript.call_id,
        source_revision=hashlib.sha256(transcript.model_dump_json().encode("utf-8")).hexdigest(),
        source_turns=transcript.turns,
        rep=transcript.rep,
        outcome=transcript.outcome,
        discovery_questions=len(discovery_evidence),
        discovery_evidence=discovery_evidence,
        next_step_secured=next_step_secured,
        next_step_evidence=next_step_evidence,
        objection_handling=objection_handling,
        objection_evidence=objection_evidence if objection_handling != "none_raised" else [],
        rep_talk_ratio=ratio,
        talk_ratio_band=talk_ratio_band(ratio),
        went_well=went_well,
        to_improve=to_improve,
        summary=summary,
        model=result.model,
        rubric_version=RUBRIC_VERSION,
        scored_at=scoring_started_at or datetime.now(UTC),
    )
    return (
        stamp_scorecard_revision(scorecard),
        result,
    )


def stamp_scorecard_revision(scorecard: Scorecard) -> Scorecard:
    payload = scorecard.model_dump_json(exclude={"scorecard_revision"})
    return scorecard.model_copy(
        update={"scorecard_revision": hashlib.sha256(payload.encode("utf-8")).hexdigest()}
    )


def outcome_stats(scorecards: list[Scorecard]) -> list[OutcomeStats]:
    eligible = [
        scorecard for scorecard in scorecards if scorecard.outcome in {"won", "lost", "stalled"}
    ]
    return [
        _outcome_stat("won", [scorecard for scorecard in eligible if scorecard.outcome == "won"]),
        _outcome_stat(
            "not_won",
            [scorecard for scorecard in eligible if scorecard.outcome in {"lost", "stalled"}],
        ),
    ]


def rep_profiles(scorecards: list[Scorecard]) -> list[RepProfile]:
    eligible = [
        scorecard for scorecard in scorecards if scorecard.outcome in {"won", "lost", "stalled"}
    ]
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
    if any(scorecard.outcome not in {"won", "lost", "stalled"} for scorecard in scorecards):
        raise ValueError("Playbook accepts only won, lost, and stalled scorecards")
    sources: list[PlaybookSource] = []
    for scorecard in scorecards:
        if (
            scorecard.source_external_id is None
            or scorecard.source_revision is None
            or scorecard.scorecard_revision is None
        ):
            raise ValueError("Playbook source needs verifiable scorecard provenance")
        sources.append(
            PlaybookSource(
                call_id=scorecard.call_id,
                source_external_id=scorecard.source_external_id,
                source_revision=scorecard.source_revision,
                scorecard_revision=scorecard.scorecard_revision,
                rubric_version=scorecard.rubric_version,
                outcome=scorecard.outcome,
            )
        )
    labelled = [card for card in scorecards if card.outcome in {"won", "lost", "stalled"}]
    if not any(card.outcome == "won" for card in labelled) or not any(
        card.outcome in {"lost", "stalled"} for card in labelled
    ):
        raise JudgeError("Playbook requires won and not-won evidence")
    stats = outcome_stats(scorecards)
    reps = rep_profiles(scorecards)
    system = load_prompt("playbook-v2")
    user = (
        "Deterministic stats:\n"
        f"{_stats_table(stats)}\n\n"
        "Allowed quotes, by call id. Every quote you cite must be copied from this list:\n"
        f"{_allowed_quotes(scorecards)}\n\n"
        "Scorecards JSON:\n"
        f"{json.dumps([scorecard.model_dump(mode='json') for scorecard in scorecards])}"
    )
    result = judge(system=system, user=user, schema=JudgedPlaybook)
    patterns = _valid_patterns(result.output.patterns, scorecards)
    cohort_payload = json.dumps(
        [
            source.model_dump(mode="json")
            for source in sorted(sources, key=lambda item: item.call_id)
        ],
        sort_keys=True,
        separators=(",", ":"),
    )
    return (
        Playbook(
            cohort_revision=hashlib.sha256(cohort_payload.encode("utf-8")).hexdigest(),
            sources=sources,
            stats=stats,
            reps=reps,
            patterns=patterns,
            behaviours=behaviour_patterns(scorecards),
            coaching_focus=result.output.coaching_focus,
            model=result.model,
            generated_at=datetime.now(UTC),
        ),
        result,
    )


def cost_usd(model: str, input_tokens: int, output_tokens: int) -> float | None:
    prices = PRICES_PER_MTOK.get(model) or load_openrouter_prices().get(model)
    if prices is None:
        return None
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
) -> float | None:
    price_table = dict(prices) or load_openrouter_prices()
    price = price_table.get(served_model) or price_table.get(requested_model)
    if price is None:
        LOGGER.warning("No OpenRouter price found for %s", served_model)
        return None
    input_price, output_price = price
    return round(
        (input_tokens / 1_000_000 * input_price) + (output_tokens / 1_000_000 * output_price),
        6,
    )


def _known_total(costs: list[float | None]) -> float | None:
    known = [cost for cost in costs if cost is not None]
    if not known:
        return None
    return round(sum(known), 6)


def _cost_complete(costs: list[float | None]) -> bool:
    return bool(costs) and all(cost is not None for cost in costs)


def _anthropic_model_id(model: str) -> str:
    if model.startswith("anthropic/"):
        model = model.removeprefix("anthropic/")
    return model.split(":", maxsplit=1)[0].replace(".", "-")


def _valid_evidence(
    items: list[Evidence],
    transcript: Transcript,
    required_speaker: str | None = None,
    *,
    unique_by_turn: bool = False,
) -> list[Evidence]:
    valid: list[Evidence] = []
    seen: set[int | tuple[int, str]] = set()
    for item in items:
        evidence = _valid_evidence_item(item, transcript, required_speaker)
        key = (
            evidence.turn_index
            if evidence is not None and unique_by_turn
            else (evidence.turn_index, evidence.quote)
            if evidence is not None
            else None
        )
        if evidence is not None and key not in seen:
            valid.append(evidence)
            seen.add(key)
    return valid


def _valid_evidence_item(
    item: Evidence | None,
    transcript: Transcript,
    required_speaker: str | None = None,
) -> Evidence | None:
    if item is None or item.turn_index > len(transcript.turns):
        return None
    turn = transcript.turns[item.turn_index - 1]
    if not item.quote.strip() or item.quote not in turn.text:
        return None
    if required_speaker is not None and turn.speaker != required_speaker:
        return None
    return item


def _grounded_coaching(
    discovery_questions: int,
    next_step_secured: bool,
    objection_handling: str,
    talk_ratio: float,
) -> tuple[list[str], list[str], str]:
    went_well: list[str] = []
    to_improve: list[str] = []
    if discovery_questions >= 3:
        went_well.append(f"Asked {discovery_questions} evidenced discovery questions.")
    else:
        to_improve.append("Ask at least three discovery questions before discussing price.")
    if next_step_secured:
        went_well.append("Secured an evidenced next step.")
    else:
        to_improve.append("Confirm a concrete next step with the prospect.")
    if objection_handling == "handled":
        went_well.append("Handled an objection with transcript evidence.")
    elif objection_handling in {"partial", "ignored"}:
        to_improve.append("Address the evidenced objection more directly.")
    if talk_ratio > 0.60:
        to_improve.append("Reduce rep talk time and create more room for the prospect.")
    summary = (
        f"The rep asked {discovery_questions} evidenced discovery questions, "
        f"{'secured' if next_step_secured else 'did not secure'} an evidenced next step, "
        f"and had a {talk_ratio:.0%} talk ratio."
    )
    return went_well, to_improve, summary


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
        if len(pattern.call_ids) != len(pattern.quotes):
            continue
        canonical: list[str] = []
        for call_id, quote in zip(pattern.call_ids, pattern.quotes, strict=True):
            scorecard = by_call_id.get(call_id)
            supported = _supported_quote(quote, scorecard) if scorecard else None
            if supported is None:
                break
            canonical.append(supported)
        else:
            valid.append(pattern.model_copy(update={"quotes": canonical}))
    return valid


def _quote_is_supported(quote: str, scorecard: Scorecard) -> bool:
    return _supported_quote(quote, scorecard) is not None


def _supported_quote(
    quote: str,
    scorecard: Scorecard,
) -> str | None:
    """The evidence quote the judge's quote stands for, or None.

    The judge re-types a quote rather than copying it byte for byte: curly
    quotes become straight ones, a run of whitespace collapses, a full stop or
    an ellipsis is added or dropped, a call id is prefixed. So both sides are
    normalised before comparison, and a judge quote that wraps a substantial
    evidence quote counts as well as one contained by it. The stored quote is
    always our own evidence text, so nothing the judge added around it is
    shown. A quote matching no evidence span is dropped.
    """
    needle = _normalise_quote(quote)
    if not needle:
        return None
    for _, evidence in _evidence_items(scorecard):
        haystack = _normalise_quote(evidence.quote)
        if not haystack:
            continue
        if needle in haystack:
            return evidence.quote
        if len(haystack) >= MIN_CONTAINED_QUOTE_CHARS and haystack in needle:
            return evidence.quote
    return None


def _normalise_quote(quote: str) -> str:
    collapsed = QUOTE_SPACE_RE.sub(" ", quote.translate(QUOTE_CHAR_MAP))
    return QUOTE_EDGE_RE.sub("", collapsed).casefold()


def _evidence_items(scorecard: Scorecard) -> list[tuple[str, Evidence]]:
    items = [("discovery", item) for item in scorecard.discovery_evidence]
    items += [("objection", item) for item in scorecard.objection_evidence]
    if scorecard.next_step_evidence is not None:
        items.append(("next step", scorecard.next_step_evidence))
    return items


def _allowed_quotes(scorecards: list[Scorecard]) -> str:
    blocks: list[str] = []
    for scorecard in scorecards:
        lines = [f"{scorecard.call_id} ({scorecard.outcome}):"]
        items = _evidence_items(scorecard)
        if not items:
            lines.append("  (no evidence quotes: do not cite this call)")
        for position, (label, evidence) in enumerate(items, start=1):
            lines.append(f"  {position}. [{label}, turn {evidence.turn_index}] {evidence.quote}")
        blocks.append("\n".join(lines))
    return "\n".join(blocks)


def behaviour_patterns(scorecards: list[Scorecard]) -> list[BehaviourPattern]:
    """Behaviours that split won calls from the rest, computed without a model.

    The judge can return nothing the evidence supports; these always hold, so
    the playbook is never empty while a cohort has won and not-won calls.
    Ordered by the gap between the two rates, widest first.
    """
    won = [card for card in scorecards if card.outcome == "won"]
    other = [card for card in scorecards if card.outcome in {"lost", "stalled"}]
    patterns = [
        _behaviour_pattern(
            key="dated-next-step",
            behaviour="Secured a dated next step",
            clause="secured a dated next step",
            detail="",
            won=won,
            other=other,
            test=lambda card: card.next_step_secured,
            quote=lambda card: card.next_step_evidence,
        ),
        _behaviour_pattern(
            key=f"discovery-floor-{DISCOVERY_FLOOR}",
            behaviour=f"{DISCOVERY_FLOOR} or more discovery questions",
            clause=f"asked {DISCOVERY_FLOOR} or more discovery questions",
            detail=(
                f"won calls averaged {_mean(card.discovery_questions for card in won):.1f} "
                "discovery questions against "
                f"{_mean(card.discovery_questions for card in other):.1f}"
            ),
            won=won,
            other=other,
            test=lambda card: card.discovery_questions >= DISCOVERY_FLOOR,
            quote=lambda card: next(iter(card.discovery_evidence), None),
        ),
        _behaviour_pattern(
            key="objection-handled",
            behaviour="Objection handled on the call",
            clause="answered the objection outright",
            detail="",
            won=won,
            other=other,
            test=lambda card: card.objection_handling == "handled",
            quote=lambda card: next(iter(card.objection_evidence), None),
        ),
        _behaviour_pattern(
            key="healthy-talk-ratio",
            behaviour="Rep talk ratio in the healthy band",
            clause="stayed in the healthy talk-ratio band",
            detail=(
                "winning reps spoke "
                f"{_percent_of_one(_mean(card.rep_talk_ratio for card in won))} of the call "
                f"against {_percent_of_one(_mean(card.rep_talk_ratio for card in other))}"
            ),
            won=won,
            other=other,
            test=lambda card: card.talk_ratio_band == "healthy",
            quote=lambda card: None,
        ),
    ]
    pricing = _pricing_behaviour(won, other)
    if pricing is not None:
        patterns.append(pricing)
    return sorted(patterns, key=lambda item: (-_behaviour_gap(item), item.key))


def _pricing_behaviour(
    won: list[Scorecard],
    other: list[Scorecard],
) -> BehaviourPattern | None:
    """Discovery before pricing, only where the stored turns can prove it."""
    derivable_won = [card for card in won if _first_pricing_turn(card) is not None]
    derivable_other = [card for card in other if _first_pricing_turn(card) is not None]
    if not derivable_won or not derivable_other:
        return None
    return _behaviour_pattern(
        key="discovery-before-pricing",
        behaviour="Discovery before the first pricing mention",
        clause="asked a discovery question before pricing came up",
        detail="counted only over the calls where pricing was mentioned",
        won=derivable_won,
        other=derivable_other,
        test=lambda card: _discovery_before_pricing_quote(card) is not None,
        quote=_discovery_before_pricing_quote,
    )


def _first_pricing_turn(scorecard: Scorecard) -> int | None:
    for index, turn in enumerate(scorecard.source_turns or [], start=1):
        if PRICING_RE.search(turn.text):
            return index
    return None


def _discovery_before_pricing_quote(scorecard: Scorecard) -> Evidence | None:
    pricing_turn = _first_pricing_turn(scorecard)
    if pricing_turn is None:
        return None
    return next(
        (item for item in scorecard.discovery_evidence if item.turn_index < pricing_turn),
        None,
    )


def _behaviour_pattern(
    *,
    key: str,
    behaviour: str,
    clause: str,
    detail: str,
    won: list[Scorecard],
    other: list[Scorecard],
    test: Callable[[Scorecard], bool],
    quote: Callable[[Scorecard], Evidence | None],
) -> BehaviourPattern:
    won_hits = [card for card in won if test(card)]
    other_hits = [card for card in other if test(card)]
    quotes: list[BehaviourQuote] = []
    for card in won_hits:
        evidence = quote(card)
        if evidence is None:
            continue
        quotes.append(
            BehaviourQuote(
                call_id=card.call_id,
                turn_index=evidence.turn_index,
                quote=evidence.quote,
            )
        )
        if len(quotes) == MAX_BEHAVIOUR_QUOTES:
            break
    takeaway = (
        f"Won calls {clause} {len(won_hits)} of {len(won)} times "
        f"({_percent(len(won_hits), len(won))}), the rest "
        f"{len(other_hits)} of {len(other)} ({_percent(len(other_hits), len(other))})"
    )
    takeaway = f"{takeaway}; {detail}." if detail else f"{takeaway}."
    return BehaviourPattern(
        key=key,
        behaviour=behaviour,
        takeaway=takeaway,
        won=PatternRate(n=len(won_hits), of=len(won)),
        other=PatternRate(n=len(other_hits), of=len(other)),
        quotes=quotes,
    )


def _behaviour_gap(pattern: BehaviourPattern) -> float:
    return _share(pattern.won.n, pattern.won.of) - _share(pattern.other.n, pattern.other.of)


def _share(part: int, whole: int) -> float:
    return part / whole if whole else 0.0


def _percent(part: int, whole: int) -> str:
    return f"{round(_share(part, whole) * 100)}%"


def _percent_of_one(value: float) -> str:
    return f"{round(value * 100)}%"
