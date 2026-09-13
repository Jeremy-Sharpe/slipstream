import json
import re
import unicodedata
from collections.abc import Sequence
from functools import lru_cache
from pathlib import Path
from typing import NamedTuple
from uuid import NAMESPACE_URL, uuid5

from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.llm import structured
from app.schemas.icp import StoredIcpProfile
from app.schemas.leads import Lead, LeadIn
from app.services.embeddings import embed_texts
from app.services.icp import cosine_similarity, won_centroid
from app.services.icp_leads_store import IcpLeadsStore

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "demo-leads-v2.md").read_text(
    encoding="utf-8"
)
FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures"
SLUG_MAX_LENGTH = 40


class DemoLeadAttributes(BaseModel):
    company_name: str = Field(min_length=2, max_length=80)
    person_name: str = Field(min_length=2, max_length=80)
    title: str = Field(min_length=2, max_length=100)
    industry: str = Field(min_length=2, max_length=100)
    employee_count: int = Field(ge=1, le=100_000)
    location: str = Field(min_length=2, max_length=100)
    rationale: str = Field(min_length=5, max_length=300)
    relevance_score: float = Field(ge=0, le=1)


class DemoLeadBatch(BaseModel):
    leads: list[DemoLeadAttributes] = Field(min_length=10, max_length=10)


class ProtectedNames(NamedTuple):
    """Real companies and people the generator must never reproduce."""

    companies: frozenset[str]
    people: frozenset[str]


class ResolvedName(NamedTuple):
    company: str
    person: str
    replaced: bool


def company_domain(company_name: str) -> str:
    """A reserved .example domain derived from the company name, never any other TLD."""
    folded = (
        unicodedata.normalize("NFKD", company_name).encode("ascii", "ignore").decode("ascii")
    )
    slug = "-".join(re.findall(r"[a-z0-9]+", folded.lower()))[:SLUG_MAX_LENGTH].strip("-")
    return f"{slug or 'prospect'}.example"


@lru_cache(maxsize=4)
def protected_names(fixtures_dir: Path = FIXTURES_DIR) -> ProtectedNames:
    companies: set[str] = set()
    people: set[str] = set()
    clients = fixtures_dir / "crm" / "clients.json"
    if clients.is_file():
        rows = json.loads(clients.read_text(encoding="utf-8"))
        for row in rows:
            name = row.get("name") if isinstance(row, dict) else None
            if isinstance(name, str) and name.strip():
                companies.add(name.strip().casefold())
    for script in sorted(fixtures_dir.glob("calls/*/script.json")):
        data = json.loads(script.read_text(encoding="utf-8"))
        for key, sink in (("company", companies), ("prospect", people)):
            section = data.get(key) if isinstance(data, dict) else None
            name = section.get("name") if isinstance(section, dict) else None
            if isinstance(name, str) and name.strip():
                sink.add(name.strip().casefold())
    return ProtectedNames(frozenset(companies), frozenset(people))


def resolve_names(
    items: Sequence[DemoLeadAttributes], protected: ProtectedNames
) -> list[ResolvedName]:
    """Replace any generated name that collides with a real name or an earlier row."""
    resolved: list[ResolvedName] = []
    used: set[str] = set()
    for index, item in enumerate(items, start=1):
        company = item.company_name.strip()
        person = item.person_name.strip()
        folded = company.casefold()
        replaced = False
        if (
            folded in used
            or folded in protected.companies
            or any(real in folded for real in protected.companies)
        ):
            company = f"Prospect {index:02d} Pty Ltd"
            replaced = True
        if person.casefold() in protected.people:
            person = f"Contact {index:02d}"
            replaced = True
        used.add(company.casefold())
        resolved.append(ResolvedName(company=company, person=person, replaced=replaced))
    return resolved


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
    names = resolve_names(result.output.leads, protected_names())
    inputs = [
        LeadIn(
            icp_profile_id=str(profile.id),
            company_name=name.company,
            company_domain=company_domain(name.company),
            person_name=name.person,
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
                "name_replaced": name.replaced,
            },
        )
        for index, (item, name) in enumerate(
            zip(result.output.leads, names, strict=True), start=1
        )
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
