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

## ICP, leads and outreach

The ICP lane loads the labelled fixture calls as CRM history, derives the ideal customer profile from fixture-sourced won deals, starts an Origami lead search from the generated brief, scores returned leads against the won-deal centroid, and drafts one-click outreach emails that are marked sent on approval.

Every row written by this lane carries `metadata.source = "fixtures"` where the table has metadata, and ICP derivation reads only deals with that marker. The demo call is loaded with `metadata.demo = true` and is excluded from ICP derivation by default.

Embeddings use `EMBEDDING_MODEL`, defaulting to OpenAI `text-embedding-3-small`, matching the schema's 1536-dimensional vectors. Reasoning uses `REASONING_MODEL`, defaulting to `gpt-5.4`, and selects the provider from the model name.

Use a Claude model such as `claude-opus-5` with `ANTHROPIC_API_KEY`, an OpenAI model such as `gpt-5.4` or `o4-mini` with `OPENAI_API_KEY`, or an OpenRouter model such as `meta-llama/llama-4-maverick` with `OPENROUTER_API_KEY`. Origami calls use `ORIGAMI_BASE_URL`, defaulting to `https://origami.chat/api/v3`.

Endpoints are registered both bare and under `/api/v1`: `POST /icp/history/load`, `POST /icp/derive`, `GET /icp/latest`, `POST /leads/source`, `GET /leads/source/{job_id}`, `GET /leads`, `POST /leads/{lead_id}/outreach`, and `POST /leads/{lead_id}/outreach/approve`.

Run the local demo sequence after starting the API with configured Anthropic, OpenAI and Origami keys:

```bash
curl -s -X POST http://localhost:8000/icp/history/load -H 'Content-Type: application/json' -d '{}'
curl -s -X POST http://localhost:8000/icp/derive -H 'Content-Type: application/json' -d '{"include_demo": false}'
curl -s -X POST http://localhost:8000/leads/source -H 'Content-Type: application/json' -d '{"count": 10, "quality": "fast"}'
curl -s http://localhost:8000/leads
curl -s -X POST http://localhost:8000/leads/<lead_id>/outreach -H 'Content-Type: application/json' -d '{"rep_name": "Sam Whitfield"}'
curl -s -X POST http://localhost:8000/leads/<lead_id>/outreach/approve -H 'Content-Type: application/json' -d '{"actor": "anna"}'
```
