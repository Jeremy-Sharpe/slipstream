import json
import math
from pathlib import Path
from typing import Any

from app.core.config import Settings
from app.core.llm import ReasoningResult, structured
from app.schemas.icp import DealRecord, IcpProfile, StoredIcpProfile
from app.services.embeddings import embed_texts
from app.services.icp_leads_store import IcpLeadsStore

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "icp-derive-v1.md").read_text(
    encoding="utf-8"
)


def derive_icp(
    store: IcpLeadsStore,
    llm: object,
    embedder: object,
    settings: Settings,
    *,
    include_demo: bool = False,
) -> StoredIcpProfile:
    deals = store.list_fixture_deals(include_demo=include_demo)
    won = [deal for deal in deals if deal.outcome == "won"]
    if len(won) < 2:
        raise ValueError("At least two fixture won deals are required to derive an ICP")
    summaries = [_deal_summary_text(deal) for deal in deals]
    vectors = _embed(embedder, settings.embedding_model, summaries)
    for deal, vector in zip(deals, vectors, strict=True):
        store.update_deal_embedding(str(deal.id), vector, settings.embedding_model)
        deal.embedding = vector
        deal.embedding_model = settings.embedding_model
    user = json.dumps(
        {
            "won_deals": [_deal_payload(deal) for deal in won],
            "contrast_deals": [_deal_payload(deal) for deal in deals if deal.outcome != "won"],
        },
        indent=2,
    )
    reasoning = _structured(
        llm,
        settings=settings,
        system=PROMPT,
        user=user,
        schema=IcpProfile,
    )
    profile = reasoning.output
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
            evidence={"attributes": attributes},
        )
    store.log_activity(
        "icp.derived",
        details={"profile_id": str(stored.id), "version": stored.version, "won_deals": len(won)},
    )
    return stored


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
    return " ".join(
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
        ]
        if part and not part.endswith("None")
    )


def _deal_payload(deal: DealRecord) -> dict[str, Any]:
    signals = deal.metadata.get("icp_signals", {})
    return {
        "id": str(deal.id),
        "company": deal.company_name,
        "industry": deal.industry or signals.get("industry"),
        "headcount": deal.employee_count,
        "location": deal.location,
        "contact_role": deal.contact_role or signals.get("role"),
        "trigger": deal.metadata.get("trigger") or signals.get("trigger"),
        "summary": deal.summary,
        "amount": deal.amount,
        "outcome": deal.outcome,
    }


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
