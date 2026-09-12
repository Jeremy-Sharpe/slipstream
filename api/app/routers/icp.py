from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import Settings
from app.core.llm import MissingEmbeddingProviderError, MissingReasoningProviderError
from app.schemas.icp import (
    FixtureHistoryCounts,
    IcpDeriveRequest,
    IcpEvidenceInventory,
    StoredIcpProfile,
)
from app.services import fixture_history
from app.services.dependencies import get_embedding_client, get_settings, get_store
from app.services.icp import derive_icp, evidence_inventory
from app.services.icp_leads_store import IcpLeadsStore

router = APIRouter(prefix="/icp", tags=["icp"])
FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures"
SettingsDep = Annotated[Settings, Depends(get_settings)]
StoreDep = Annotated[IcpLeadsStore, Depends(get_store)]


@router.post("/history/load", response_model=FixtureHistoryCounts)
def load_history(store: StoreDep) -> FixtureHistoryCounts:
    return fixture_history.load_fixture_history(store, FIXTURES_DIR)


@router.post("/derive", response_model=StoredIcpProfile)
def derive(
    body: IcpDeriveRequest,
    request: Request,
    settings: SettingsDep,
    store: StoreDep,
) -> StoredIcpProfile:
    _require(settings, "embeddings")
    _require(settings, settings.reasoning_provider)
    try:
        return derive_icp(
            store,
            settings,
            get_embedding_client(request),
            settings,
            include_demo=body.include_demo,
        )
    except (MissingEmbeddingProviderError, MissingReasoningProviderError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error


@router.get("/evidence", response_model=IcpEvidenceInventory)
def evidence(store: StoreDep, include_demo: bool = False) -> IcpEvidenceInventory:
    return evidence_inventory(store, include_demo=include_demo)


@router.get("/latest", response_model=StoredIcpProfile)
def latest(store: StoreDep) -> StoredIcpProfile:
    profile = store.latest_icp_profile()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ready ICP profile found",
        )
    return profile


def _require(settings: Settings, integration: str) -> None:
    if not settings.integration_flags[integration]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{integration} integration is not configured",
        )
