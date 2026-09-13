import json
import math
import re
from pathlib import Path
from typing import Any

from app.core.config import Settings
from app.core.llm import ReasoningResult, structured
from app.schemas.icp import (
    DealRecord,
    IcpEvidenceInventory,
    IcpEvidenceItem,
    IcpProfile,
    IcpSourceSummary,
    StoredIcpProfile,
)
from app.services.embeddings import embed_texts
from app.services.icp_leads_store import IcpLeadsStore

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "icp-derive-v1.md").read_text(
    encoding="utf-8"
)
MAX_MODEL_INPUT_CHARS = 120_000
MAX_PROFILE_VALUES = 12
_HEADCOUNT_RANGE = re.compile(r"^(\d{1,6})\s*-\s*(\d{1,6})$")
_HEADCOUNT_BOUND = re.compile(r"^(under|over)\s*-?\s*(\d{1,6})$", re.IGNORECASE)


def derive_icp(
    store: IcpLeadsStore,
    llm: object,
    embedder: object,
    settings: Settings,
    *,
    include_demo: bool = False,
) -> StoredIcpProfile:
    deals = _fit_model_budget(store.list_icp_deals(include_demo=include_demo))
    won = [deal for deal in deals if deal.outcome == "won"]
    if len(won) < 2:
        raise ValueError("At least two eligible won deals are required to derive an ICP")
    summaries = [_deal_summary_text(deal) for deal in deals]
    embedding_model = settings.effective_embedding_model
    vectors = _embed(embedder, embedding_model, summaries)
    for deal, vector in zip(deals, vectors, strict=True):
        store.update_deal_embedding(str(deal.id), vector, embedding_model)
        deal.embedding = vector
        deal.embedding_model = embedding_model
    user = json.dumps(_cohort_payload(deals), separators=(",", ":"))
    reasoning = _structured(
        llm,
        settings=settings,
        system=PROMPT,
        user=user,
        schema=IcpProfile,
    )
    profile = _ground_profile(reasoning.output, deals).model_copy(
        update={"source_summary": _source_summary(deals)}
    )
    stored = store.insert_icp_profile(
        version=store.max_icp_version() + 1,
        profile=profile,
        model=reasoning.model,
        embedding_model=embedding_model,
    )
    for deal in won:
        attributes = [
            item.attribute
            for item in profile.evidence
            if str(deal.id) in {str(id_) for id_ in item.deal_ids}
        ]
        store.insert_icp_source_deal(
            profile_id=str(stored.id),
            deal_id=str(deal.id),
            evidence={
                "attributes": attributes,
                "deal_snapshot": deal.model_dump(mode="json"),
            },
        )
    store.log_activity(
        "icp.derived",
        details={"profile_id": str(stored.id), "version": stored.version, "won_deals": len(won)},
    )
    return stored


def evidence_inventory(
    store: IcpLeadsStore, *, include_demo: bool = False
) -> IcpEvidenceInventory:
    deals = _fit_model_budget(store.list_icp_deals(include_demo=include_demo))
    summary = _source_summary(deals)
    won_deals = sum(deal.outcome == "won" for deal in deals)
    contrast_deals = sum(deal.outcome in {"lost", "stalled"} for deal in deals)
    return IcpEvidenceInventory(
        **summary.model_dump(),
        won_deals=won_deals,
        contrast_deals=contrast_deals,
        active_deals=sum(deal.outcome == "open" for deal in deals),
        ready_to_derive=won_deals >= 2,
    )


def won_centroid(store: IcpLeadsStore, profile_id: str) -> list[float]:
    deals = store.source_deals_for_profile(profile_id)
    vectors = [deal.embedding for deal in deals if deal.embedding]
    if not vectors:
        raise ValueError("ICP source deals do not have stored embeddings")
    return _centroid(vectors)


def cosine_similarity(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (left_norm * right_norm)


def _centroid(vectors: list[list[float]]) -> list[float]:
    length = len(vectors[0])
    return [sum(vector[index] for vector in vectors) / len(vectors) for index in range(length)]


def _deal_summary_text(deal: DealRecord) -> str:
    signals = deal.metadata.get("icp_signals", {})
    return _bounded(" ".join(
        part
        for part in [
            f"Company: {deal.company_name}",
            f"Industry: {deal.industry or signals.get('industry')}",
            f"Headcount: {deal.employee_count or signals.get('headcount_band')}",
            f"Location: {deal.location}",
            f"Role: {deal.contact_role or signals.get('role')}",
            f"Trigger: {deal.metadata.get('trigger') or signals.get('trigger')}",
            f"Outcome: {deal.outcome}",
            f"Amount: {deal.amount}",
            f"Summary: {deal.summary}",
            *[
                f"{item.channel.title()} {item.direction}: {item.content}"
                for item in deal.interactions
            ],
        ]
        if part and not part.endswith("None")
    ), 4000)


def _deal_payload(deal: DealRecord) -> dict[str, Any]:
    signals = deal.metadata.get("icp_signals", {})
    return {
        "id": str(deal.id),
        "company": _bounded(deal.company_name, 200),
        "industry": _bounded(deal.industry or signals.get("industry"), 120),
        "headcount": deal.employee_count,
        "location": _bounded(deal.location, 120),
        "contact_role": _bounded(deal.contact_role or signals.get("role"), 120),
        "trigger": _bounded(deal.metadata.get("trigger") or signals.get("trigger"), 500),
        "summary": _bounded(deal.summary, 1200),
        "amount": deal.amount,
        "outcome": deal.outcome,
        "interactions": [
            {
                **item.model_dump(mode="json"),
                "source_external_id": _bounded(item.source_external_id, 300),
                "subject": _bounded(item.subject, 300),
                "content": _bounded(item.content, 800),
            }
            for item in deal.interactions[:10]
        ],
    }


def _cohort_payload(deals: list[DealRecord]) -> dict[str, list[dict[str, Any]]]:
    return {
        "won_deals": [_deal_payload(deal) for deal in deals if deal.outcome == "won"],
        "contrast_deals": [
            _deal_payload(deal) for deal in deals if deal.outcome in {"lost", "stalled"}
        ],
        "active_deals": [_deal_payload(deal) for deal in deals if deal.outcome == "open"],
    }


def _fit_model_budget(deals: list[DealRecord]) -> list[DealRecord]:
    ordered = sorted(
        [deal.model_copy(update={"interactions": deal.interactions[:10]}) for deal in deals],
        key=lambda deal: (
            {"won": 0, "lost": 1, "stalled": 1, "open": 2}.get(deal.outcome, 3),
            deal.crm_external_id or str(deal.id),
        ),
    )
    selected: list[DealRecord] = []
    size = len('{"won_deals":[],"contrast_deals":[],"active_deals":[]}')
    for deal in ordered:
        candidate_size = len(json.dumps(_deal_payload(deal), separators=(",", ":"))) + 1
        if size + candidate_size > MAX_MODEL_INPUT_CHARS:
            continue
        selected.append(deal)
        size += candidate_size
    return selected


def _bounded(value: object, limit: int) -> str | None:
    if value is None:
        return None
    return str(value)[:limit]


def _source_summary(deals: list[DealRecord]) -> IcpSourceSummary:
    sources = {
        (item.channel, item.source_external_id)
        for deal in deals
        for item in deal.interactions
    }
    return IcpSourceSummary(
        deals=len(deals),
        calls=sum(channel == "call" for channel, _ in sources),
        emails=sum(channel == "email" for channel, _ in sources),
        outcome_labelled=sum(deal.outcome in {"won", "lost", "stalled"} for deal in deals),
    )


def _ground_profile(profile: IcpProfile, deals: list[DealRecord]) -> IcpProfile:
    won = [deal for deal in deals if deal.outcome == "won"]
    industries = _won_values(won, "industry", "industry")
    roles = _won_values(won, "contact_role", "role")
    triggers = _won_values(won, None, "trigger")
    headcount_band = _won_headcount_band(won)
    industry_text = _plain_list(industries)
    role_text = _plain_list(roles)
    trigger_text = _plain_list(triggers)
    summary_parts = [
        f"Observed win industries are {industry_text}."
        if industries
        else "Industry fit is not yet established from won deals.",
    ]
    if headcount_band != "Not established":
        summary_parts.append(f"Winning accounts had {headcount_band} staff.")
    if roles:
        summary_parts.append(f"Winning conversations involved {role_text}.")
    if triggers:
        summary_parts.append(f"Observed buying triggers included {trigger_text}.")
    summary = " ".join(summary_parts)
    brief_parts = [
        f"Find organisations matching these won-deal industries: {industry_text}."
        if industries
        else "Use the won accounts as seed examples and verify industry fit manually."
    ]
    if headcount_band != "Not established" or roles:
        criteria = []
        if headcount_band != "Not established":
            criteria.append(f"companies with {headcount_band} staff")
        if roles:
            criteria.append(f"contacts in these roles: {role_text}")
        brief_parts.append(f"Prioritise {' and '.join(criteria)}.")
    if triggers:
        brief_parts.append(f"Look for active signals including {trigger_text}.")
    origami_brief = " ".join(brief_parts)
    evidence = _ground_evidence(
        won,
        industries=industries,
        headcount_band=headcount_band,
        roles=roles,
        triggers=triggers,
    )
    return profile.model_copy(
        update={
            "summary": summary,
            "industries": industries,
            "headcount_band": headcount_band,
            "roles": roles,
            "triggers": triggers,
            "disqualifiers": _unique_text(profile.disqualifiers, limit=MAX_PROFILE_VALUES),
            "evidence": evidence,
            "origami_brief": origami_brief,
        }
    )


def _ground_evidence(
    won: list[DealRecord],
    *,
    industries: list[str],
    headcount_band: str,
    roles: list[str],
    triggers: list[str],
) -> list[IcpEvidenceItem]:
    evidence: list[IcpEvidenceItem] = []
    dimensions = [
        (
            "industry",
            industries,
            _supporting_deal_ids(won, "industry", "industry", industries),
        ),
        (
            "headcount_band",
            [] if headcount_band == "Not established" else [headcount_band],
            [
                str(deal.id)
                for deal in won
                if deal.employee_count is not None
                or _deal_headcount_band(deal) is not None
            ],
        ),
        (
            "contact_role",
            roles,
            _supporting_deal_ids(won, "contact_role", "role", roles),
        ),
        ("trigger", triggers, _supporting_deal_ids(won, None, "trigger", triggers)),
    ]
    for attribute, values, deal_ids in dimensions:
        if values and deal_ids:
            evidence.append(
                IcpEvidenceItem(
                    attribute=attribute,
                    deal_ids=deal_ids,
                    why=f"Won deals support these values: {_plain_list(values)}.",
                )
            )
    return evidence


def _supporting_deal_ids(
    deals: list[DealRecord], field: str | None, signal: str, retained_values: list[str]
) -> list[str]:
    limit = 500 if signal == "trigger" else 120
    retained = {value.casefold() for value in retained_values}
    ids: list[str] = []
    for deal in deals:
        signals = deal.metadata.get("icp_signals")
        if not isinstance(signals, dict):
            signals = {}
        primary = getattr(deal, field) if field else deal.metadata.get(signal)
        value = _valid_signal_text(primary, limit) or _valid_signal_text(
            signals.get(signal), limit
        )
        if value is not None and value.casefold() in retained:
            ids.append(str(deal.id))
    return ids


def _deal_headcount_band(deal: DealRecord) -> str | None:
    signals = deal.metadata.get("icp_signals")
    return _valid_headcount_band(
        signals.get("headcount_band") if isinstance(signals, dict) else None
    )


def _won_values(
    deals: list[DealRecord], field: str | None, signal: str
) -> list[str]:
    values: list[object] = []
    limit = 500 if signal == "trigger" else 120
    for deal in deals:
        signals = deal.metadata.get("icp_signals", {})
        if not isinstance(signals, dict):
            signals = {}
        value = getattr(deal, field) if field else deal.metadata.get(signal)
        candidate = _valid_signal_text(value, limit) or _valid_signal_text(
            signals.get(signal), limit
        )
        if candidate is not None:
            values.append(candidate)
    return _unique_text(values, limit=MAX_PROFILE_VALUES)


def _valid_signal_text(value: object, limit: int) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    return text if text and len(text) <= limit else None


def _won_headcount_band(deals: list[DealRecord]) -> str:
    deal_bands: list[str | None] = []
    for deal in deals:
        deal_bands.append(_deal_headcount_band(deal))
    unique_bands = _unique_text(
        [band for band in deal_bands if band is not None], limit=MAX_PROFILE_VALUES
    )
    if len(unique_bands) == 1:
        band = unique_bands[0]
        if all(
            (deal_band == band or deal.employee_count is not None)
            and (
                deal.employee_count is None
                or _headcount_in_band(deal.employee_count, band)
            )
            for deal, deal_band in zip(deals, deal_bands, strict=True)
        ):
            return band
    counts = [deal.employee_count for deal in deals if deal.employee_count is not None]
    if counts and len(counts) == len(deals):
        return f"{min(counts)}-{max(counts)}"
    return "Not established"


def _valid_headcount_band(value: object) -> str | None:
    if not isinstance(value, str) or len(value) > 40:
        return None
    band = value.strip()
    range_match = _HEADCOUNT_RANGE.fullmatch(band)
    if range_match and int(range_match.group(1)) <= int(range_match.group(2)):
        return f"{int(range_match.group(1))}-{int(range_match.group(2))}"
    bound_match = _HEADCOUNT_BOUND.fullmatch(band)
    if bound_match:
        return f"{bound_match.group(1).casefold()}-{int(bound_match.group(2))}"
    return None


def _headcount_in_band(count: int, band: str) -> bool:
    range_match = _HEADCOUNT_RANGE.fullmatch(band)
    if range_match:
        return int(range_match.group(1)) <= count <= int(range_match.group(2))
    bound_match = _HEADCOUNT_BOUND.fullmatch(band)
    if not bound_match:
        return False
    boundary = int(bound_match.group(2))
    return count < boundary if bound_match.group(1).casefold() == "under" else count > boundary


def _unique_text(values: list[object], *, limit: int) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        key = text.casefold()
        if text and key not in seen:
            seen.add(key)
            unique.append(text)
            if len(unique) == limit:
                break
    return unique


def _plain_list(values: list[str]) -> str:
    if len(values) < 2:
        return "".join(values)
    return f"{', '.join(values[:-1])} and {values[-1]}"


def _embed(embedder: object, model: str, texts: list[str]) -> list[list[float]]:
    if callable(embedder):
        return list(embedder(texts))
    return embed_texts(embedder, model, texts)


def _structured(
    llm: object,
    *,
    settings: Settings,
    system: str,
    user: str,
    schema: type[IcpProfile],
) -> ReasoningResult[IcpProfile]:
    if callable(llm):
        output = llm(
            model=settings.reasoning_model,
            system=system,
            user=user,
            schema=schema,
            max_tokens=4000,
        )
        if isinstance(output, ReasoningResult):
            return output
        return ReasoningResult(
            output=output,
            model=settings.reasoning_model,
            provider=settings.reasoning_provider,
        )
    return structured(llm, system=system, user=user, schema=schema)
