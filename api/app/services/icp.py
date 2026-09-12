import json
import math
from pathlib import Path
from typing import Any

from app.core.config import Settings
from app.core.llm import ReasoningResult, structured
from app.schemas.icp import (
    DealRecord,
    IcpEvidenceInventory,
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
    vectors = _embed(embedder, settings.embedding_model, summaries)
    for deal, vector in zip(deals, vectors, strict=True):
        store.update_deal_embedding(str(deal.id), vector, settings.embedding_model)
        deal.embedding = vector
        deal.embedding_model = settings.embedding_model
    user = json.dumps(_cohort_payload(deals), separators=(",", ":"))
    reasoning = _structured(
        llm,
        settings=settings,
        system=PROMPT,
        user=user,
        schema=IcpProfile,
    )
    profile = reasoning.output.model_copy(update={"source_summary": _source_summary(deals)})
    stored = store.insert_icp_profile(
        version=store.max_icp_version() + 1,
        profile=profile,
        model=reasoning.model,
        embedding_model=settings.embedding_model,
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
