import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import Settings
from app.core.readiness import StorageReadinessProbe, StorageUnavailableError
from app.factory import create_app


def test_health_runs_without_credentials(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["storage"] == "memory"
    assert response.json()["integrations"] == {
        "supabase": False,
        "anthropic": False,
        "openai": False,
        "openrouter": False,
        "embeddings": False,
        "elevenlabs": False,
        "origami": False,
        "crm_webhook": False,
        "email_delivery": False,
    }


def test_versioned_health_route(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["service"] == "Slipstream API"


def test_readiness_works_in_local_mode(client: TestClient) -> None:
    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json()["storage"] == "memory"


def test_cors_allows_configured_web_origin(client: TestClient) -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_readiness_fails_closed_when_configured_storage_is_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        supabase_url="https://database.example",
        supabase_service_role_key=SecretStr("sentinel-secret"),
    )

    async def fail(_: StorageReadinessProbe) -> None:
        raise StorageUnavailableError("sentinel-secret must not escape")

    monkeypatch.setattr(StorageReadinessProbe, "check", fail)

    with TestClient(create_app(settings)) as configured_client:
        response = configured_client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {"detail": "Configured storage is unavailable"}
    assert "sentinel-secret" not in response.text
