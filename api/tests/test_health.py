import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import Settings
from app.core.readiness import (
    EmbeddingUnavailableError,
    LocalEmbeddingReadinessProbe,
    LocalModelReadinessProbe,
    ReasoningUnavailableError,
    StorageReadinessProbe,
    StorageUnavailableError,
)
from app.factory import create_app


def test_health_runs_without_credentials(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["storage"] == "memory"
    assert response.json()["reasoning_provider"] == "openai"
    assert response.json()["reasoning_model"] == "gpt-5.4"
    assert response.json()["reasoning_configured"] is False
    assert response.json()["embedding_provider"] is None
    assert response.json()["embedding_configured"] is False
    assert response.json()["integrations"] == {
        "supabase": False,
        "anthropic": False,
        "openai": False,
        "openrouter": False,
        "local_model": False,
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


def test_readiness_fails_closed_when_configured_local_model_is_missing() -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        local_model_base_url="http://127.0.0.1:1/v1",
    )

    with TestClient(create_app(settings)) as configured_client:
        response = configured_client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {"detail": "Configured reasoning model is unavailable"}


def test_readiness_ignores_an_unused_local_fallback() -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        openrouter_api_key="hosted-key",
        local_model_base_url="http://127.0.0.1:1/v1",
    )

    with TestClient(create_app(settings)) as configured_client:
        response = configured_client.get("/ready")

    assert response.status_code == 200
    assert response.json()["reasoning_provider"] == "openrouter"
    assert response.json()["reasoning_configured"] is True


@pytest.mark.asyncio
async def test_local_readiness_does_not_follow_an_external_redirect() -> None:
    def redirect(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "127.0.0.1"
        return httpx.Response(302, headers={"location": "https://external.example/models"})

    settings = Settings(
        _env_file=None,
        environment="test",
        local_model_base_url="http://127.0.0.1:8081/v1",
    )
    probe = LocalModelReadinessProbe(settings, transport=httpx.MockTransport(redirect))

    with pytest.raises(ReasoningUnavailableError):
        await probe.check()
    await probe.close()


def test_readiness_fails_closed_when_configured_local_embedding_is_missing() -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        local_embedding_base_url="http://127.0.0.1:1/v1",
    )

    with TestClient(create_app(settings)) as configured_client:
        response = configured_client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {"detail": "Configured embedding model is unavailable"}


@pytest.mark.asyncio
async def test_local_embedding_readiness_rejects_wrong_model() -> None:
    def wrong_model(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"data": [{"id": "wrong-model"}]})

    settings = Settings(
        _env_file=None,
        local_embedding_base_url="http://127.0.0.1:8082/v1",
        local_embedding_name="local-nomic",
    )
    probe = LocalEmbeddingReadinessProbe(
        settings, transport=httpx.MockTransport(wrong_model)
    )

    with pytest.raises(EmbeddingUnavailableError):
        await probe.check()
    await probe.close()


@pytest.mark.asyncio
async def test_local_embedding_readiness_proves_vector_and_caches_success() -> None:
    calls: list[str] = []

    def embedding(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        if request.url.path == "/v1/models":
            return httpx.Response(200, json={"data": [{"id": "local-nomic"}]})
        assert request.url.path == "/v1/embeddings"
        return httpx.Response(
            200,
            json={
                "model": "local-nomic",
                "data": [{"object": "embedding", "embedding": [0.1] * 768}],
            },
        )

    settings = Settings(
        _env_file=None,
        local_embedding_base_url="http://127.0.0.1:8082/v1",
        local_embedding_name="local-nomic",
    )
    probe = LocalEmbeddingReadinessProbe(
        settings, transport=httpx.MockTransport(embedding)
    )

    await probe.check()
    await probe.check()

    assert calls == ["/v1/models", "/v1/embeddings"]
    await probe.close()


@pytest.mark.asyncio
async def test_local_embedding_readiness_translates_malformed_json_shape() -> None:
    def malformed(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/models":
            return httpx.Response(200, json={"data": [{"id": "local-nomic"}]})
        return httpx.Response(200, json=None)

    settings = Settings(
        _env_file=None,
        local_embedding_base_url="http://127.0.0.1:8082/v1",
        local_embedding_name="local-nomic",
    )
    probe = LocalEmbeddingReadinessProbe(
        settings, transport=httpx.MockTransport(malformed)
    )

    with pytest.raises(EmbeddingUnavailableError):
        await probe.check()
    await probe.close()


@pytest.mark.asyncio
async def test_local_embedding_readiness_rejects_response_model_mismatch() -> None:
    def mismatch(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/models":
            return httpx.Response(200, json={"data": [{"id": "local-nomic"}]})
        return httpx.Response(
            200,
            json={
                "model": "wrong-model",
                "data": [{"embedding": [0.1] * 768}],
            },
        )

    settings = Settings(
        _env_file=None,
        local_embedding_base_url="http://127.0.0.1:8082/v1",
        local_embedding_name="local-nomic",
    )
    probe = LocalEmbeddingReadinessProbe(
        settings, transport=httpx.MockTransport(mismatch)
    )

    with pytest.raises(EmbeddingUnavailableError):
        await probe.check()
    await probe.close()
