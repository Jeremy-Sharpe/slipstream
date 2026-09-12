from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import Settings
from app.core.readiness import (
    EmbeddingUnavailableError,
    ReasoningUnavailableError,
    StorageUnavailableError,
)

router = APIRouter(tags=["operations"])


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    version: str
    revision: str
    environment: str
    storage: Literal["supabase", "memory"]
    integrations: dict[str, bool]
    reasoning_provider: Literal["anthropic", "openai", "openrouter", "local"]
    reasoning_model: str
    reasoning_configured: bool
    embedding_provider: Literal["openai", "openrouter", "local"] | None
    embedding_model: str
    embedding_configured: bool
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
        reasoning_provider=settings.reasoning_provider,
        reasoning_model=settings.effective_reasoning_model,
        reasoning_configured=settings.reasoning_configured,
        embedding_provider=settings.embedding_provider,
        embedding_model=settings.effective_embedding_model,
        embedding_configured=settings.integration_flags["embeddings"],
        timestamp=datetime.now(UTC),
    )


@router.get("/ready", response_model=HealthResponse)
async def readiness(request: Request) -> HealthResponse:
    try:
        await request.app.state.readiness.check()
        await request.app.state.reasoning_readiness.check()
        await request.app.state.embedding_readiness.check()
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
    except EmbeddingUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configured embedding model is unavailable",
        ) from error
    return await health(request)
