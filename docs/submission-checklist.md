# Submission handoff

Use this as the final pre-submit runbook. Everything that can be checked without the
finished video or unavailable deployment credentials was verified on 13 September 2026.

## Verified now

- Public repository: `https://github.com/Jeremy-Sharpe/slipstream`
- Production UI: `https://slipstream-hackathon.vercel.app` responds with HTTP 200;
  Campaigns includes the live “Delivery execution” card.
- Production API: `https://slipstream-api.3-104-149-193.sslip.io/ready` reports `ok`
  and the exact deployed Git revision.
- Root `npm run lint` and `npm run build` pass.
- API Ruff checks and all 289 tests pass, including scorecard/playbook revision, coach lifecycle,
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
- The deterministic rubric-sync eval passes. Every deterministic submission check
  except the required demo-video URL passes.
- `npm run smoke:production -- --revision "$(git rev-parse HEAD)"` performs a
  credential-free, non-mutating check of the live Campaigns surface, API revision,
  public campaign reads, OpenAPI contract and unauthenticated control rejection.
- The production campaign list contains one synthetic record named “Hackathon demo —
  intentionally unsent”; it is paused, scheduled for 2099, and reports zero sends.

## Deployment-only gaps

- The installed Railway CLI is unauthenticated. `scheduler/` is deploy-ready, but the
  service and its `SLIPSTREAM_INGEST_TOKEN` variable still need an account owner.
- The VPS has no Supabase, Resend, Origami or model credentials. Do not add them to Git,
  Vercel browser variables, screenshots or the public demo terminal.

## Human-only finish line

1. Record the 3-to-5-minute walkthrough using `docs/demo-script.md`. Show the live
   app working end to end; do not submit slides or narration over static screens.
2. Watch the exported video once with sound. Confirm it shows the production URL,
   stays within 3:00-5:00, and contains no notifications, secrets, or unrelated tabs.
3. Upload it somewhere judges can open without signing in.
4. Replace `Demo video: (added at submission)` in `README.md` with the public URL.
5. Pull `main`, then run `npm run evals:dry`. It must report `PASSED`; do not waive a
   failing check.
6. Run `npm run smoke:production -- --revision "$(git rev-parse HEAD)"` to confirm both
   deployments and the protected campaign boundary immediately before submitting.
7. If a VPS restart cleared the memory-backed campaign, recreate it on the VPS with
   `sudo bash -lc 'set -a; source /etc/slipstream/api.env; export SLIPSTREAM_INGEST_TOKEN="$INGEST_TOKEN"; cd /opt/slipstream/current; npm run seed:demo-campaign'`.
   The command refuses durable storage or configured email delivery.
8. Submit before **Monday 14 September 2026, 12:00 PM Melbourne time**. Name
   **Track 1: Improve an Existing Business Capability** and also enter the
   **Built With ElevenLabs** special track.

If shortlisted, use `docs/pitch.md` and rehearse its Q&A across all four teammates
before the 5:30 PM closing event.
