# OpenRouter live proof

Slipstream's judge-testable proof needs only an OpenRouter key. Keep it in deployment secrets; never paste it into GitHub, Vercel browser variables, screenshots, or chat. The full Origami v3 adapter remains available when a paid key is later added, but it is not required for the hackathon walkthrough.

```bash
cd api
cp demo.env.example .env
# Fill OPENROUTER_API_KEY in .env
uv sync
uv run uvicorn app.main:app --reload
```

First prove that the credential authenticates without generating model tokens:

```bash
curl -s http://localhost:8000/api/v1/integrations/verify
```

`demo_ready: true` means OpenRouter's current-key read succeeded. If an Origami key is optionally configured, `two_key_ready: true` proves its no-spend account read as well. `/ready` fails closed when a configured hosted credential is rejected or its provider is unavailable.

Then open the Leads page and press **Run search**. That single action loads the labelled call-and-email history, derives an evidence-backed ICP through OpenRouter, converts it into a lead brief, generates ten fictional prospects, embeds and scores them against the won-deal centroid, and stores them through the backend. Generated companies and contacts carry invented, plausible names, marked Fictional in the UI and flagged `synthetic` in the API; their domains are reserved `.example` domains derived from the company name, a guard replaces any name that collides with a real Eleno client or fixture company, and no email or LinkedIn address is invented. Repeated requests reuse the current ICP and the same ten stored rows. It never sends an email: approval and delivery remain deliberately separate.

The same proof can be started directly:

```bash
curl -s -X POST http://localhost:8000/api/v1/demo/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"source_leads":true}'
```

The response returns the exact ICP/model provenance, a deterministic proof-job ID, and the safety guardrail. Because generation completes in the request, its status is already `succeeded`; read `/api/v1/leads?icp_profile_id={profile_id}` next.

## Optional production Origami seam

Set `ORIGAMI_API_KEY` to enable the separate `/api/v1/leads/source` route against Origami v3. Real searches are limited to ten rows per request and use a stable idempotency key derived from the exact ICP, brief, count, and quality.

Origami account signup, email verification, accepting service terms, and any payment step must be completed by the account owner. No code change is needed afterward: add the optional secret and restart the API.
