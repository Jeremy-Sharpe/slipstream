from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import Settings
from app.core.readiness import ReasoningUnavailableError, StorageUnavailableError

router = APIRouter(tags=["operations"])


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    version: str
    revision: str
    environment: str
    storage: Literal["supabase", "memory"]
    integrations: dict[str, bool]
    timestamp: datetime


def _settings(request: Request) -> Settings:
    return request.app.state.settings


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    settings = _settings(request)
    return HealthResponse(
        service=settings.app_name,
        version=settings.app_version,
        revision=settings.release_sha,
        environment=settings.environment,
        storage=settings.storage_mode,
        integrations=settings.integration_flags,
        timestamp=datetime.now(UTC),
    )


@router.get("/ready", response_model=HealthResponse)
async def readiness(request: Request) -> HealthResponse:
    try:
        await request.app.state.readiness.check()
        await request.app.state.reasoning_readiness.check()
    except StorageUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configured storage is unavailable",
        ) from error
    except ReasoningUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configured reasoning model is unavailable",
        ) from error
    return await health(request)
