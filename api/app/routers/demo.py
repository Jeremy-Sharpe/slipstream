import asyncio
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import Settings
from app.core.llm import MissingEmbeddingProviderError, MissingReasoningProviderError
from app.schemas.icp import FixtureHistoryCounts, IcpFreshness, StoredIcpProfile
from app.schemas.leads import LeadSourceAccepted
from app.services import fixture_history
from app.services.demo_leads import demo_job_id, generate_demo_leads
from app.services.dependencies import get_embedding_client, get_settings, get_store
from app.services.icp import (
    cohort_revision,
    derive_icp,
    evidence_inventory,
    icp_freshness,
    with_source_deals,
)
from app.services.icp_leads_store import IcpLeadsStore

router = APIRouter(prefix="/demo", tags=["demo"])
SettingsDep = Annotated[Settings, Depends(get_settings)]
StoreDep = Annotated[IcpLeadsStore, Depends(get_store)]
FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures"


class DemoBootstrapRequest(BaseModel):
    source_leads: bool = True


class DemoBootstrapResponse(BaseModel):
    status: str
    history: FixtureHistoryCounts
    icp: StoredIcpProfile
    reused_icp: bool
    lead_source: LeadSourceAccepted | None = None
    lead_provider: str
    spend_guardrail: str


class DemoLeadEvidence(BaseModel):
    company_name: str
    company_domain: str
    person_name: str
    title: str | None
    industry: str | None
    relevance_score: float | None
    similarity_score: float | None
    rationale: str


class DemoEvidenceResponse(BaseModel):
    status: Literal["verified", "incomplete"]
    claim: str
    icp: StoredIcpProfile
    lead_provider: str
    lead_count: int
    all_fictional: bool
    all_reserved_domains: bool
    no_delivery_coordinates: bool
    models: list[str]
    sample_leads: list[DemoLeadEvidence]
    delivery_enabled: bool
    revenue_dna: IcpFreshness


@router.get("/evidence", response_model=DemoEvidenceResponse)
def evidence(settings: SettingsDep, store: StoreDep) -> DemoEvidenceResponse:
    """Return a bounded, embedding-free proof of the current ICP-to-lead loop."""
    latest = store.latest_icp_profile()
    if latest is None:
        raise HTTPException(status_code=404, detail="No derived ICP is available")
    profile = with_source_deals(store, latest)
    freshness = icp_freshness(store, profile)
    leads = [
        lead
        for lead in store.list_leads(icp_profile_id=str(profile.id))
        if lead.metadata.get("source") == "openrouter_demo"
    ]
    all_fictional = bool(leads) and all(
        lead.metadata.get("synthetic") is True for lead in leads
    )
    all_reserved_domains = bool(leads) and all(
        bool(lead.company_domain and lead.company_domain.endswith(".example"))
        for lead in leads
    )
    no_delivery_coordinates = bool(leads) and all(
        lead.email is None and lead.linkedin_url is None for lead in leads
    )
    models = sorted(
        {
            str(lead.metadata["model"])
            for lead in leads
            if isinstance(lead.metadata.get("model"), str)
            and str(lead.metadata["model"]).strip()
        }
    )
    source = profile.profile.source_summary
    verified = (
        len(leads) == 10
        and all_fictional
        and all_reserved_domains
        and no_delivery_coordinates
        and profile.status == "ready"
        and source is not None
        and source.calls > 0
        and source.emails > 0
        and profile.model == settings.effective_reasoning_model
        and profile.embedding_model == settings.effective_embedding_model
        and models == [settings.effective_reasoning_model]
        and freshness.status == "current"
    )
    samples = [
        DemoLeadEvidence(
            company_name=lead.company_name,
            company_domain=lead.company_domain or "",
            person_name=lead.person_name or "",
            title=lead.title,
            industry=lead.industry,
            relevance_score=lead.origami_relevance_score,
            similarity_score=lead.similarity_score,
            rationale=str(lead.metadata.get("rationale") or ""),
        )
        for lead in leads[:3]
    ]
    return DemoEvidenceResponse(
        status="verified" if verified else "incomplete",
        claim=(
            "The deployed backend derived this mixed-channel ICP and generated ten "
            "non-deliverable fictional prospects through OpenRouter."
        ),
        icp=profile,
        lead_provider="openrouter_demo",
        lead_count=len(leads),
        all_fictional=all_fictional,
        all_reserved_domains=all_reserved_domains,
        no_delivery_coordinates=no_delivery_coordinates,
        models=models,
        sample_leads=samples,
        delivery_enabled=settings.integration_flags["email_delivery"],
        revenue_dna=freshness,
    )


@router.post("/bootstrap", response_model=DemoBootstrapResponse)
async def bootstrap(
    body: DemoBootstrapRequest,
    request: Request,
    settings: SettingsDep,
    store: StoreDep,
) -> DemoBootstrapResponse:
    """Run the judged fixture-to-ICP-to-leads proof with a fixed ten-lead ceiling."""
    verification = await request.app.state.provider_readiness.verify()
    required = ["openrouter"]
    if any(verification.get(provider) is not True for provider in required):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Required demo provider credentials are not verified",
        )

    async with request.app.state.demo_bootstrap_lock:
        try:
            history = await asyncio.to_thread(
                fixture_history.load_fixture_history, store, FIXTURES_DIR
            )
            inventory = evidence_inventory(store, include_demo=False)
            current_revision = cohort_revision(store.list_icp_deals(include_demo=False))
            latest = store.latest_icp_profile()
            reused = _profile_is_current(latest, inventory, settings, current_revision)
            profile = (
                with_source_deals(store, latest)
                if reused and latest is not None
                else await asyncio.to_thread(
                    derive_icp,
                    store,
                    settings,
                    get_embedding_client(request),
                    settings,
                    include_demo=False,
                )
            )
            lead_source = None
            if body.source_leads:
                profile_id = str(profile.id)
                await asyncio.to_thread(
                    generate_demo_leads,
                    store,
                    settings,
                    get_embedding_client(request),
                    settings,
                    profile=profile,
                )
                lead_source = LeadSourceAccepted(
                    origami_job_id=demo_job_id(profile, settings.effective_reasoning_model),
                    icp_profile_id=profile_id,
                    status="succeeded",
                )
        except (MissingEmbeddingProviderError, MissingReasoningProviderError) as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenRouter reasoning or embeddings are unavailable",
            ) from error
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
            ) from error

    return DemoBootstrapResponse(
        status="lead search started" if lead_source else "ICP ready",
        history=history,
        icp=profile,
        reused_icp=reused,
        lead_source=lead_source,
        lead_provider="openrouter_demo",
        spend_guardrail=(
            "Exactly 10 fictional prospects carry invented names on reserved .example domains "
            "with no deliverable contact details. Email delivery remains disabled until "
            "separately configured."
        ),
    )


def _profile_is_current(
    profile: StoredIcpProfile | None,
    inventory: object,
    settings: Settings,
    current_revision: str,
) -> bool:
    if profile is None or profile.status != "ready" or profile.profile.source_summary is None:
        return False
    source = profile.profile.source_summary
    return (
        profile.model == settings.effective_reasoning_model
        and profile.embedding_model == settings.effective_embedding_model
        and profile.profile.cohort_revision == current_revision
        and source.deals == getattr(inventory, "deals", -1)
        and source.calls == getattr(inventory, "calls", -1)
        and source.emails == getattr(inventory, "emails", -1)
        and source.outcome_labelled == getattr(inventory, "outcome_labelled", -1)
    )
