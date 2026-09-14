import httpx
from supabase import Client, ClientOptions, create_client

from app.core.config import Settings


def create_supabase(settings: Settings) -> Client | None:
    """Build the app-scoped service-role client, or None in local mode."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    client = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key.get_secret_value(),
        options=ClientOptions(
            postgrest_client_timeout=10,
            function_client_timeout=10,
        ),
    )
    client.postgrest.session = without_http2(client.postgrest.session)
    return client


def without_http2(session: httpx.Client) -> httpx.Client:
    """Same base URL, headers and timeout over HTTP/1.1.

    PostgREST closes idle HTTP/2 connections and httpx only notices on the next
    request, which then fails with "Server disconnected". HTTP/1.1 connections
    are checked for liveness before reuse, so a long-idle API keeps working.
    """
    return httpx.Client(
        base_url=session.base_url,
        headers=dict(session.headers),
        timeout=session.timeout,
        follow_redirects=session.follow_redirects,
        http2=False,
    )
