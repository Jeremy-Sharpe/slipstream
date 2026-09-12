# Slipstream API

FastAPI service for the conversation-to-CRM pipeline. It starts without any credentials in deterministic local mode; adding both Supabase variables moves storage to the hosted database.

```bash
uv sync
uv run uvicorn app.main:app --reload
uv run pytest
```

The health endpoint is available at `/health` and `/api/v1/health`. It reports which optional integrations are configured without exposing secret values.

## Deployment

`Dockerfile` and `railway.toml` support a Railway service whose root directory is `api/`. `deploy/` contains the systemd service, Caddy HTTPS example, and idempotent pull-and-restart script for the project VPS. Copy secrets into `/etc/slipstream/api.env`; never store them in the checkout.
