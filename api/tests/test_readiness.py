import httpx
import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.core.readiness import StorageReadinessProbe, StorageUnavailableError


def configured_settings() -> Settings:
    return Settings(
        _env_file=None,
        environment="test",
        supabase_url="https://database.example",
        supabase_service_role_key=SecretStr("sentinel-secret"),
    )


@pytest.mark.asyncio
async def test_successful_probe_is_briefly_cached() -> None:
    requests = 0

    def respond(request: httpx.Request) -> httpx.Response:
        nonlocal requests
        requests += 1
        assert request.headers["apikey"] == "sentinel-secret"
        return httpx.Response(200, json=[])

    probe = StorageReadinessProbe(configured_settings(), httpx.MockTransport(respond))
    try:
        await probe.check()
        await probe.check()
    finally:
        await probe.close()

    assert requests == 1


@pytest.mark.asyncio
async def test_probe_sanitises_transport_failure() -> None:
    def fail(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sentinel-secret connection failed")

    probe = StorageReadinessProbe(configured_settings(), httpx.MockTransport(fail))
    try:
        with pytest.raises(StorageUnavailableError) as error:
            await probe.check()
    finally:
        await probe.close()

    assert "sentinel-secret" not in str(error.value)
