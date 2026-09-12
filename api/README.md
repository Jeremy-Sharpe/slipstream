# Slipstream API

FastAPI health and configuration scaffold for the conversation-to-CRM pipeline. It starts without credentials and reports memory mode; the ingestion slice adds the repository operations that use this selection.

```bash
uv sync
uv run uvicorn app.main:app --reload
uv run pytest
```

The liveness endpoint is available at `/health` and `/api/v1/health`. `/ready` additionally probes Supabase when configured and returns 503 if storage is unavailable. Both report optional integration configuration without exposing secret values.

## Deployment

`Dockerfile` and `railway.toml` support a Railway service. Set the Railway service root directory to `api/` and its Config File path to `/api/railway.toml`; these are separate monorepo settings. The container honours Railway's injected `PORT` and runs as an unprivileged user.

`deploy/` contains the systemd service, Caddy HTTPS example, one-time provisioner, and locked atomic release script for the project VPS. The deployer creates an immutable Git worktree per revision, builds a separate virtual environment, atomically switches `current`, verifies the exact revision through `/ready`, and rolls back on failure. Provisioning installs the stable entrypoint at `/usr/local/sbin/slipstream-deploy`; use that path for every later release. Add secrets directly to the root-owned mode-0600 `/etc/slipstream/api.env`; never store them in the checkout.
