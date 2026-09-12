from supabase import Client, create_client

from app.core.config import Settings


def create_supabase(settings: Settings) -> Client | None:
    """Build the app-scoped service-role client, or None in local mode."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key.get_secret_value(),
    )
