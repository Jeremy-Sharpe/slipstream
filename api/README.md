# Slipstream API

FastAPI health and configuration scaffold for the conversation-to-CRM pipeline. It starts without credentials and reports memory mode; the ingestion slice adds the repository operations that use this selection.

```bash
uv sync
uv run uvicorn app.main:app --reload
uv run pytest
```

The liveness endpoint is available at `/health` and `/api/v1/health`. `/ready` additionally probes Supabase when configured and returns 503 if storage is unavailable. Both report optional integration configuration without exposing secret values.

## Deployment

`Dockerfile` and `railway.toml` support a Railway service. Leave the Railway service root at `/` and set its Config File path to `/api/railway.toml` so the image includes both `api/` and the deterministic `fixtures/` dataset. The container honours Railway's injected `PORT` and runs as an unprivileged user. Build the same image locally from the repository root with `docker build -f api/Dockerfile .`.

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

## Live coach protocol

`POST /api/v1/coach/scribe-token` exchanges the server-side ElevenLabs key for a
15-minute, single-use `realtime_scribe` token. When `INGEST_TOKEN` is configured,
send it in `X-Slipstream-Ingest-Token`. The client connects directly to the returned
ElevenLabs WebSocket using `scribe_v2_realtime`, then forwards only committed turns
to `WS /api/v1/coach/live`; the provider key never enters the client.

The first WebSocket message must be a `start` event. Send the ingest token in this
message rather than the URL so proxies do not log it:

```json
{
  "type": "start",
  "source_external_id": "desktop-session-123",
  "subject": "Acme discovery",
  "occurred_at": "2026-09-12T10:00:00Z",
  "rep_name": "Jordan",
  "deal_context": "Accounting firm evaluating workflow automation",
  "ingest_token": "only-required-when-configured"
}
```

After `ready`, forward each stable Scribe transcript as an ordered, non-overlapping
event. Mark the participant role so the server coaches only after prospect turns:

```json
{
  "type": "transcript",
  "sequence": 0,
  "speaker": "Donnie",
  "role": "prospect",
  "text": "The manual work takes twelve hours a week.",
  "start_ms": 0,
  "end_ms": 2400
}
```

The server acknowledges it with `committed` and may emit a grounded `suggestion`.
Suggestions are bounded by server time to one per 15 seconds and 25 per call. If the
connection drops, reconnect with the same source ID and continue at the
`resume_from_sequence` returned by `ready`; the in-process checkpoint survives the
socket, though not a server restart. A `stop` event persists the complete transcript
through the normal call repository and returns `completed` with the canonical call
object. Without a reasoning key, the same protocol uses local coaching rules; without
an ElevenLabs key, fixture or already-transcribed turns still exercise the full
endpoint.

## Email ingestion

`POST /api/v1/emails` accepts provider-neutral inbound and outbound messages. Every
message includes its provider, mailbox ID and mailbox address, so provider-local
message and thread IDs cannot collide across connected accounts. Recipients are
labelled `to`, `cc` or `bcc`; automatic replies require exactly one safe external
`to` recipient and never select a Bcc recipient.

Read a thread with
`GET /api/v1/emails/{provider}/mailboxes/{mailbox_id}/threads/{thread_id}` and create
a reply with `POST` to the same URL plus `/draft-reply`. All three operations require
`X-Slipstream-Ingest-Token` when `INGEST_TOKEN` is configured. Drafts are versioned
by the exact target message, so a newly arrived message creates a new draft without
mutating an approved one. Thread reads are capped at 5,000 messages and 8 MiB of
serialized data; oversized threads return 413 without transferring message bodies.

With Supabase configured, `20260912010000_email_ingestion.sql` installs the
`ingest_email_conversation` transaction used by the API. It takes an advisory lock
on the mailbox-scoped source ID, preserves existing CRM names and deal ownership,
and commits the contact, deal and conversation together. Memory mode remains an
explicit credential-free demo path and is not durable across restarts.

`supabase test db supabase/tests/email_ingestion.sql` exercises the migration against
local PostgreSQL, including rollback, idempotency, role permissions, CRM-field
preservation and the exact 5,000-message overflow boundary.
