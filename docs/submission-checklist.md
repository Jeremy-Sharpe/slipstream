# Submission handoff

Use this as the final pre-submit runbook. Everything that can be checked without
unavailable deployment credentials or submitting the external form was verified on
13 September 2026.

## Verified now

- Public repository: `https://github.com/Jeremy-Sharpe/slipstream`
- Production UI: `https://slipstream-hackathon.vercel.app` responds with HTTP 200;
  Campaigns includes the live “Delivery execution” card.
- Production API: `https://slipstream-api.3-104-149-193.sslip.io/ready` reports `ok`
  and the exact deployed Git revision.
- Root `npm run lint` and `npm run build` pass.
- API Ruff checks and all 361 tests pass, including provider readiness, OpenRouter demo bootstrap, scorecard/playbook revision, coach lifecycle,
  email concurrency, campaign leasing/controls and provider-environment isolation coverage.
- All six fixture tests pass.
- All nine Supabase migrations and seven pgTAP suites pass from an empty ephemeral
  database in CI. Coverage includes email ingestion, scorecards, playbooks, unified ICP
  evidence, exact-content delivery reservations, campaign leases and pause/resume RPC
  permissions and state transitions.
- The one-shot Railway scheduler passes seven tests covering secret hygiene, redirect and
  response validation, wall-clock timeout, SIGTERM, empty work and exact request shape.
- The production API exposes campaign create/list/detail/run/pause/resume routes and
  rejects unauthenticated scheduler/control calls. It still reports memory storage and
  `email_delivery: false`, so no live send is claimed.
- The deterministic rubric-sync eval and every deterministic submission check pass.
- The public fallback video is 4:30, 1440×900 H.264 with AAC narration. Its public
  ranged download, sampled frames, stream metadata, loudness and silence profile were
  verified; exact source and checksum are in `docs/video/`.
- `npm run smoke:production -- --revision "$(git rev-parse HEAD)" --exercise-fixture` performs a
  credential-free check of the live Campaigns surface, API revision, public campaign
  reads, OpenAPI contract and unauthenticated control rejection. Its opt-in fixture step
  idempotently ingests Maya's labelled call, extracts evidence-backed CRM fields, drafts
  the grounded follow-up and records an approved-unsent audit state; it cannot deliver.
- The production campaign list contains one synthetic record named “Hackathon demo —
  intentionally unsent”; it is paused, scheduled for 2099, and reports zero sends.
- The latest production ICP is OpenRouter-derived over 13 CRM deals enriched by 12 calls
  and two emails (the canonical fixture cohort contributes one; the paused campaign adds
  one provider-neutral thread). Its customer attributes, headcount band and evidence are
  grounded in won deals and stamped with `openai/gpt-5.4` and `text-embedding-3-small`.
- `POST /api/v1/demo/bootstrap` proves the complete aggregate-to-prospect loop with one
  OpenRouter key. Each profile produces exactly ten visibly fictional `.example`
  prospects with no email or LinkedIn coordinates and scores them against the won-deal
  centroid. The memory store currently retains two profile versions; the UI selects the latest.

## Deployment-only gaps

- The installed Railway CLI is unauthenticated. `scheduler/` is deploy-ready, but the
  service and its `SLIPSTREAM_INGEST_TOKEN` variable still need an account owner.
- The VPS has no Supabase, Resend or Origami credentials. It has a root-owned OpenRouter
  credential; `/ready` must report OpenRouter reasoning and embeddings ready while those
  unrelated integration flags remain false. Do not add secrets to Git, Vercel browser
  variables, screenshots or the public demo terminal.

## Human-only finish line

1. Optionally replace the published automated fallback with a human-presented 3-to-5-minute
   walkthrough using `docs/demo-script.md`. If replacing it, watch the export once with
   sound and confirm it contains no notifications, secrets or unrelated tabs before
   updating the README URL.
2. Pull `main`, then run `npm run evals:dry`. It must report `PASSED`; do not waive a
   failing check.
3. Read the deployed revision from `/ready`, then pass it to `npm run smoke:production --
   --revision <deployed-revision> --exercise-fixture` to confirm both deployments and the
   protected campaign boundary immediately before submitting. Documentation-only commits
   do not require restarting the memory-backed API.
4. If a VPS restart cleared the memory-backed campaign, recreate it on the VPS with
   `sudo bash -lc 'set -a; source /etc/slipstream/api.env; export SLIPSTREAM_INGEST_TOKEN="$INGEST_TOKEN"; export SLIPSTREAM_API_URL=http://127.0.0.1:8000; cd /opt/slipstream/current; npm run seed:demo-campaign'`.
   Loopback avoids the public reverse proxy deadline while CPU inference runs. The command
   refuses durable storage or configured email delivery; the model port remains private.
5. Submit before **Monday 14 September 2026, 12:00 PM Melbourne time**. Name
   **Track 1: Improve an Existing Business Capability** and also enter the
   **Built With ElevenLabs** special track.

If shortlisted, use `docs/pitch.md` and rehearse its Q&A across all four teammates
before the 5:30 PM closing event.
