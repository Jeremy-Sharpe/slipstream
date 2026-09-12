from typing import Any

from app.core.config import Settings
from app.schemas.leads import Lead, LeadIn
from app.schemas.origami import Job
from app.services.embeddings import embed_texts
from app.services.icp import cosine_similarity, won_centroid
from app.services.icp_leads_store import IcpLeadsStore
from app.services.origami import OrigamiClient, map_rows_to_leads, poll_until_done

MAX_SEARCH_RESULT_ROWS = 100


async def start_search(
    store: IcpLeadsStore,
    origami: OrigamiClient,
    settings: Settings,
    *,
    icp_profile_id: str | None = None,
    count: int = 10,
    quality: str = "fast",
) -> tuple[Job, str]:
    profile = (
        store.get_icp_profile(icp_profile_id) if icp_profile_id else store.latest_icp_profile()
    )
    if profile is None:
        raise ValueError("No ready ICP profile found")
    _require_matching_embedding_model(profile.embedding_model, settings)
    job = await origami.create_search(profile.origami_brief, count, quality)
    return job, str(profile.id)


async def complete_search(
    store: IcpLeadsStore,
    origami: OrigamiClient,
    embedder: object,
    settings: Settings,
    *,
    icp_profile_id: str,
    job_id: str,
) -> list[Lead]:
    profile = store.get_icp_profile(icp_profile_id)
    if profile is None:
        raise ValueError("ICP profile not found")
    embedding_model = settings.effective_embedding_model
    _require_matching_embedding_model(profile.embedding_model, settings)
    job = await poll_until_done(origami, job_id)
    result = job.result or {}
    list_id = result.get("list_id")
    raw_row_ids = result.get("row_ids")
    if not isinstance(list_id, str) or not list_id.strip():
        raise RuntimeError("Origami returned a malformed search result")
    if (
        not isinstance(raw_row_ids, list)
        or len(raw_row_ids) > MAX_SEARCH_RESULT_ROWS
        or not all(isinstance(row_id, str) and row_id.strip() for row_id in raw_row_ids)
        or len(set(raw_row_ids)) != len(raw_row_ids)
    ):
        raise RuntimeError("Origami returned a malformed search result")
    row_ids = raw_row_ids
    rows = await origami.read_rows(list_id, row_ids) if list_id and row_ids else []
    csv_text = await origami.export_csv(list_id, row_ids) if row_ids else None
    leads = map_rows_to_leads(rows, csv_text)
    if not leads:
        store.log_activity(
            "leads.sourced",
            details={
                "profile_id": icp_profile_id,
                "job_id": job_id,
                "count": 0,
                "credits": job.credits,
            },
        )
        return []
    vectors = _embed(
        embedder,
        embedding_model,
        [_lead_summary_text(lead) for lead in leads],
    )
    centroid = won_centroid(store, icp_profile_id)
    stored: list[Lead] = []
    for lead, vector in zip(leads, vectors, strict=True):
        lead.icp_profile_id = icp_profile_id
        lead.embedding = vector
        lead.embedding_model = embedding_model
        lead.similarity_score = max(-1.0, min(1.0, cosine_similarity(vector, centroid)))
        lead.origami_relevance_score = _normalise_relevance(lead.origami_relevance_score)
        lead.metadata["source"] = "origami"
        stored.append(store.upsert_lead(lead))
    store.log_activity(
        "leads.sourced",
        details={
            "profile_id": icp_profile_id,
            "job_id": job_id,
            "count": len(stored),
            "credits": job.credits,
        },
    )
    return stored


async def source_leads(
    store: IcpLeadsStore,
    origami: OrigamiClient,
    embedder: object,
    settings: Settings,
    *,
    icp_profile_id: str,
    count: int = 10,
    quality: str = "fast",
) -> list[Lead]:
    job, profile_id = await start_search(
        store,
        origami,
        settings,
        icp_profile_id=icp_profile_id,
        count=count,
        quality=quality,
    )
    return await complete_search(
        store, origami, embedder, settings, icp_profile_id=profile_id, job_id=job.id
    )


def _embed(embedder: object, model: str, texts: list[str]) -> list[list[float]]:
    if callable(embedder):
        return list(embedder(texts))
    return embed_texts(embedder, model, texts)


def _require_matching_embedding_model(profile_model: str, settings: Settings) -> None:
    if profile_model != settings.effective_embedding_model:
        raise ValueError(
            "ICP embedding model does not match the configured embedding model; "
            "derive a new ICP before sourcing leads"
        )


def _lead_summary_text(lead: LeadIn) -> str:
    return " ".join(
        part
        for part in [
            f"Company: {lead.company_name}",
            f"Domain: {lead.company_domain}",
            f"Person: {lead.person_name}",
            f"Title: {lead.title}",
            f"Industry: {lead.industry}",
            f"Headcount: {lead.employee_count}",
            f"Location: {lead.location}",
            f"Research: {_research_fields(lead.metadata)}",
        ]
        if part and not part.endswith("None")
    )


def _research_fields(metadata: dict[str, Any]) -> dict[str, Any]:
    row = metadata.get("origami_row")
    if isinstance(row, dict):
        return {key: value for key, value in row.items() if key not in {"cells"}}
    return {}


def _normalise_relevance(value: float | None) -> float | None:
    if value is None:
        return None
    if value > 1:
        return max(0.0, min(1.0, value / 100))
    return max(0.0, min(1.0, value))
