# Submission handoff

Use this as the final pre-submit runbook. Everything that can be checked without the
finished video was verified on 12 September 2026.

## Verified now

- Public repository: `https://github.com/Jeremy-Sharpe/slipstream`
- Production UI: `https://slipstream-hackathon.vercel.app` responds with HTTP 200.
- Production API: `https://slipstream-api.3-104-149-193.sslip.io/ready` reports `ok`
  and the exact deployed Git revision.
- Root `npm run lint` and `npm run build` pass.
- API Ruff checks and all 176 tests pass, including scorecard/playbook revision, coach lifecycle,
  email concurrency and provider-environment isolation coverage.
- All six fixture tests pass.
- The email migration executes against PostgreSQL and its committed Supabase test
  covers permissions, idempotency, rollback, CRM-field preservation, and message and
  byte boundaries. The scorecard migration adds a service-role-only, stale-write-safe
  conversation update. The playbook migration adds an atomic revision-checked cohort
  upsert. All four migrations and all three pgTAP suites pass in ephemeral Supabase CI.
- The deterministic rubric-sync eval passes. Every deterministic submission check
  except the required demo-video URL passes.

## Human-only finish line

1. Record the 3-to-5-minute walkthrough using `docs/demo-script.md`. Show the live
   app working end to end; do not submit slides or narration over static screens.
2. Watch the exported video once with sound. Confirm it shows the production URL,
   stays within 3:00-5:00, and contains no notifications, secrets, or unrelated tabs.
3. Upload it somewhere judges can open without signing in.
4. Replace `Demo video: (added at submission)` in `README.md` with the public URL.
5. Pull `main`, then run `npm run evals:dry`. It must report `PASSED`; do not waive a
   failing check.
6. Confirm both production URLs return HTTP 200 and the API `/ready` revision matches
   the latest GitHub `main` commit.
7. Submit before **Monday 14 September 2026, 12:00 PM Melbourne time**. Name
   **Track 1: Improve an Existing Business Capability** and also enter the
   **Built With ElevenLabs** special track.

If shortlisted, use `docs/pitch.md` and rehearse its Q&A across all four teammates
before the 5:30 PM closing event.
