from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.llm import structured
from app.schemas.icp import StoredIcpProfile
from app.schemas.leads import Lead, LeadIn
from app.services.embeddings import embed_texts
from app.services.icp import cosine_similarity, won_centroid
from app.services.icp_leads_store import IcpLeadsStore

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "demo-leads-v1.md").read_text(
    encoding="utf-8"
)


class DemoLeadAttributes(BaseModel):
    title: str = Field(min_length=2, max_length=100)
    industry: str = Field(min_length=2, max_length=100)
    employee_count: int = Field(ge=1, le=100_000)
    location: str = Field(min_length=2, max_length=100)
    rationale: str = Field(min_length=5, max_length=300)
    relevance_score: float = Field(ge=0, le=1)


class DemoLeadBatch(BaseModel):
    leads: list[DemoLeadAttributes] = Field(min_length=10, max_length=10)


def generate_demo_leads(
    store: IcpLeadsStore,
    llm: object,
    embedder: object,
    settings: Settings,
    *,
    profile: StoredIcpProfile,
) -> list[Lead]:
    existing = [
        lead
        for lead in store.list_leads(icp_profile_id=str(profile.id))
        if lead.metadata.get("source") == "openrouter_demo"
    ]
    if len(existing) == 10:
        return existing

    result = structured(
        llm,
        system=PROMPT,
        user=profile.origami_brief,
        schema=DemoLeadBatch,
    )
    inputs = [
        LeadIn(
            icp_profile_id=str(profile.id),
            company_name=f"ICP Match {index:02d} (fictional)",
            company_domain=f"icp-match-{index:02d}.example",
            person_name=f"Demo Contact {index:02d}",
            title=item.title,
            industry=item.industry,
            employee_count=item.employee_count,
            location=item.location,
            origami_row_id=f"openrouter-demo:{profile.id}:{index:02d}",
            origami_relevance_score=item.relevance_score,
            embedding_model=settings.effective_embedding_model,
            metadata={
                "source": "openrouter_demo",
                "synthetic": True,
                "model": result.model,
                "rationale": item.rationale,
            },
        )
        for index, item in enumerate(result.output.leads, start=1)
    ]
    texts = [
        " ".join(
            [
                lead.company_name,
                lead.title or "",
                lead.industry or "",
                str(lead.employee_count or ""),
                lead.location or "",
                str(lead.metadata.get("rationale") or ""),
            ]
        )
        for lead in inputs
    ]
    vectors = (
        list(embedder(texts))
        if callable(embedder)
        else embed_texts(embedder, settings.effective_embedding_model, texts)
    )
    centroid = won_centroid(store, str(profile.id))
    stored = []
    for lead, vector in zip(inputs, vectors, strict=True):
        lead.embedding = vector
        lead.similarity_score = max(-1.0, min(1.0, cosine_similarity(vector, centroid)))
        stored.append(store.upsert_lead(lead))
    store.log_activity(
        "leads.demo_generated",
        details={
            "profile_id": str(profile.id),
            "count": len(stored),
            "model": result.model,
            "synthetic": True,
        },
    )
    return stored


def demo_job_id(profile: StoredIcpProfile, model: str) -> str:
    return f"openrouter-demo-{uuid5(NAMESPACE_URL, f'{profile.id}:{model}')}"
