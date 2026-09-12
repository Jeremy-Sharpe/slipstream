# Campaign automation

Slipstream campaigns turn an explicit, approved set of email drafts into a resumable delivery run. Campaign creation and execution are server-only operations; status reads are public so the browser can display progress without receiving the ingest token.

## Safety contract

- A campaign contains 1–25 distinct draft IDs. Every draft must still be `approved`, unsent, and contain a recipient, subject, and body when the campaign is created.
- Creating a campaign with the same client-generated UUID and identical payload is idempotent. Reusing that UUID for different work returns `409`.
- A scheduler claims at most eight due drafts per request. A 75-second lease prevents two workers from sending the same chunk concurrently.
- Each provider call retains the draft's stable delivery idempotency key. Ambiguous network outcomes become retryable and reconciliation-required rather than being reported as sent.
- Successful, terminal failure, retryable, and reconciliation-required outcomes are persisted per draft. Later scheduler calls resume only due work.
- The delivery endpoint checks both the server token and provider configuration before claiming anything.

The durable implementation is migration `20260913020000_email_campaigns.sql`. Without Supabase credentials the same contract runs in memory for evaluation, and `/ready` reports that storage boundary.

## Create a campaign

Only approved draft IDs should be enrolled. Keep the token in the server or scheduler environment, never in `NEXT_PUBLIC_*` variables or browser code.

```bash
curl --fail-with-body \
  -X POST "$SLIPSTREAM_API_URL/api/v1/campaigns" \
  -H "Content-Type: application/json" \
  -H "X-Slipstream-Ingest-Token: $SLIPSTREAM_INGEST_TOKEN" \
  -d '{
    "campaign_id": "3ba7550e-759c-4f13-bc91-70d5e0453e7a",
    "name": "September ICP follow-up",
    "created_by": "anna",
    "scheduled_for": "2026-09-13T09:00:00+10:00",
    "draft_ids": [
      "8b5983f6-07c8-47fb-9bab-a28cb7023932"
    ]
  }'
```

Browser-safe status reads:

```bash
curl --fail-with-body "$SLIPSTREAM_API_URL/api/v1/campaigns?limit=50"
curl --fail-with-body "$SLIPSTREAM_API_URL/api/v1/campaigns/3ba7550e-759c-4f13-bc91-70d5e0453e7a"
```

## Pause and resume

Pause prevents the scheduler from claiming any new chunk. A chunk already running is bounded to 50 seconds and cannot be paused mid-provider-call, so the pause endpoint returns `409` while a worker owns the campaign; retry after that run finishes. Repeating the same pause or resume action is safe.

```bash
curl --fail-with-body \
  -X POST "$SLIPSTREAM_API_URL/api/v1/campaigns/3ba7550e-759c-4f13-bc91-70d5e0453e7a/pause" \
  -H "X-Slipstream-Ingest-Token: $SLIPSTREAM_INGEST_TOKEN"

curl --fail-with-body \
  -X POST "$SLIPSTREAM_API_URL/api/v1/campaigns/3ba7550e-759c-4f13-bc91-70d5e0453e7a/resume" \
  -H "X-Slipstream-Ingest-Token: $SLIPSTREAM_INGEST_TOKEN"
```

Only scheduled campaigns can be paused, and only paused campaigns with unfinished queued or retryable items can be resumed. Completed campaigns and campaigns needing manual reconciliation remain terminal.

## Run due work from Railway or Marcel

Configure a cron job to call this endpoint on a short interval. Required secrets are `SLIPSTREAM_API_URL` and `SLIPSTREAM_INGEST_TOKEN`; the API itself additionally needs `RESEND_API_KEY` and `RESEND_FROM`. The dependency-free container in `scheduler/` is preconfigured as a one-shot Railway cron service every five minutes and is preferable to maintaining an ad hoc shell command.

```bash
curl --fail-with-body \
  -X POST "$SLIPSTREAM_API_URL/api/v1/campaigns/run-due" \
  -H "Content-Type: application/json" \
  -H "X-Slipstream-Ingest-Token: $SLIPSTREAM_INGEST_TOKEN" \
  -d '{"limit": 8}'
```

A response with `"claimed_count": 0` is a normal no-work result. Any non-2xx response should be retried by the scheduler with backoff. Do not run an unbounded shell loop in the API process; Railway cron, Marcel, or another external scheduler should own recurrence.
