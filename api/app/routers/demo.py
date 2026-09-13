import asyncio
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import Settings
from app.core.llm import MissingEmbeddingProviderError, MissingReasoningProviderError
from app.schemas.icp import FixtureHistoryCounts, StoredIcpProfile
from app.schemas.leads import LeadSourceAccepted
from app.services import fixture_history
from app.services.demo_leads import demo_job_id, generate_demo_leads
from app.services.dependencies import get_embedding_client, get_settings, get_store
from app.services.icp import derive_icp, evidence_inventory, with_source_deals
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
            latest = store.latest_icp_profile()
            reused = _profile_is_current(latest, inventory, settings)
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
            "Exactly 10 fictional prospects use reserved .example domains and no deliverable "
            "contact details. Email delivery remains disabled until separately configured."
        ),
    )


def _profile_is_current(
    profile: StoredIcpProfile | None, inventory: object, settings: Settings
) -> bool:
    if profile is None or profile.status != "ready" or profile.profile.source_summary is None:
        return False
    source = profile.profile.source_summary
    return (
        profile.model == settings.effective_reasoning_model
        and profile.embedding_model == settings.effective_embedding_model
        and source.deals == getattr(inventory, "deals", -1)
        and source.calls == getattr(inventory, "calls", -1)
        and source.emails == getattr(inventory, "emails", -1)
        and source.outcome_labelled == getattr(inventory, "outcome_labelled", -1)
    )
