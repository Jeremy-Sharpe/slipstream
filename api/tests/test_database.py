import httpx
from pydantic import SecretStr

from app.core.config import Settings
from app.core.database import create_supabase, without_http2


def _http2_enabled(client: httpx.Client) -> bool:
    return bool(client._transport._pool._http2)  # type: ignore[attr-defined]


def test_without_http2_keeps_base_url_headers_and_timeout() -> None:
    original = httpx.Client(
        base_url="https://example.supabase.co/rest/v1",
        headers={"apikey": "service-key", "Authorization": "Bearer service-key"},
        timeout=10,
        follow_redirects=True,
        http2=True,
    )
    assert _http2_enabled(original)

    replaced = without_http2(original)

    assert not _http2_enabled(replaced)
    assert replaced.base_url == original.base_url
    assert replaced.headers["apikey"] == "service-key"
    assert replaced.headers["Authorization"] == "Bearer service-key"
    assert replaced.timeout == original.timeout
    assert replaced.follow_redirects is True


def test_create_supabase_serves_postgrest_over_http1() -> None:
    settings = Settings(
        _env_file=None,
        supabase_url="https://example.supabase.co",
        supabase_service_role_key=SecretStr("service-key"),
    )

    client = create_supabase(settings)

    assert client is not None
    session = client.postgrest.session
    assert not _http2_enabled(session)
    assert session.headers["apikey"] == "service-key"
    assert str(session.base_url).startswith("https://example.supabase.co/rest/v1")
