# Email delivery adapter

Slipstream separates human approval from delivery. `POST /drafts/{id}/approve` changes an
exact reviewed draft from `draft` to `approved`; it does not contact an email provider.
Only `POST /api/v1/drafts/{id}/deliver` can change `approved` to `sent`.

## Configuration

Set these only in the server's secret store:

```dotenv
RESEND_API_KEY=re_...
RESEND_FROM=Slipstream <sales@your-verified-domain.example>
INGEST_TOKEN=<server-to-server mutation token>
# Optional for a compatible test endpoint; production must use HTTPS.
RESEND_BASE_URL=https://api.resend.com
```

The API refuses partial configuration, malformed sender mailboxes, non-HTTPS production
provider URLs, and a delivery configuration without `INGEST_TOKEN`. Readiness exposes only
the boolean `integrations.email_delivery`; it never exposes credentials.

## Deliver an approved draft

```bash
curl --fail-with-body -sS -X POST \
  -H "X-Slipstream-Ingest-Token: $SLIPSTREAM_INGEST_TOKEN" \
  "https://your-api.example/api/v1/drafts/<approved-draft-id>/deliver"
```

The endpoint loads the stored draft after taking a per-draft lock. It refuses drafts still
in review, missing or unsafe recipients, and content outside the bounded delivery contract.
The request sent to Resend contains one recipient plus the exact approved subject and
plain-text body. The provider key remains server-side.

The `Idempotency-Key` is a SHA-256 identity over the sender, draft ID, recipient, subject,
and body. In production, a Supabase delivery ledger is required and records that identity
before network I/O. Database functions serialize claims and atomically record the draft,
lead lifecycle, provider receipt, and audit activity after acceptance. Resend retains
idempotency keys for 24 hours; Slipstream reserves a five-minute safety margin and stops
retrying at 23 hours 55 minutes. If Slipstream returns `504`, retry the exact unchanged
draft within that window; do not create a new draft or change its content. After the cutoff,
Slipstream blocks the retry until the operator reconciles it in Resend.

Provider rejection returns a sanitized `502` and leaves the draft `approved`. A timeout or
dropped response returns a sanitized `504` because the provider may have accepted the
message. Once delivery and local persistence are confirmed, the draft becomes `sent`, its
timestamp is recorded, outreach leads become `contacted`, and the provider receipt is added
to the activity audit.

The current public hackathon deployment deliberately has no Resend credential, so this
endpoint fails closed with `503` there. Its provider contract and failure paths are exercised
with an in-process fake transport in the test suite.

For Supabase-backed deployments, apply `20260913010000_email_delivery_reservations.sql` before
rolling out the batch-capable API. The migration leaves the original claim RPC and its existing
`pending`/`unknown`/`sent` response contract intact, so older API instances remain compatible
during the rollout. A new API started before that migration fails closed before provider I/O.

## Deliver a bounded campaign batch

A trusted campaign service, Railway cron job, or Marcel workflow can submit up to eight exact
approved draft IDs in one request. The browser must never receive the ingest token.

```bash
set -o pipefail
curl --fail-with-body -sS -X POST \
  -H "Content-Type: application/json" \
  -H "X-Slipstream-Ingest-Token: $SLIPSTREAM_INGEST_TOKEN" \
  -d '{"draft_ids":["<approved-draft-id>","<another-approved-draft-id>"]}' \
  "https://your-api.example/api/v1/drafts/deliver-batch" | jq .
```

The caller—not this endpoint—owns campaign membership and scheduling. Requiring explicit IDs
prevents an automation from discovering and implicitly enrolling every approved draft in the
workspace. Duplicate IDs and batches above eight are rejected before execution. Slipstream
admits at most four batch requests per API process, processes at most two items per admitted batch,
admits at most sixteen delivery waiters per process, and retains a four-provider-call limit per
process for both batch and single sends. The current deployment runs one API process; a scaled
deployment must add shared admission if these need to be deployment-wide limits. Excess batch
requests and delivery waiters fail fast with `429`. Requests for the
same draft coalesce behind one of 64 striped pre-admission gates, so duplicate retries do not
consume provider capacity while waiting for the first request. Unrelated draft IDs that land on
the same stripe may briefly serialize; the returned busy state is intentionally generic and
retryable.

The response stays `200` once the authenticated batch is admitted and contains an ordered result
for every requested ID. Each item reports `sent`, `not_found`, `not_deliverable`, `busy`,
`rejected`, `unavailable`, `unknown`, or `not_started`, its equivalent HTTP status, structured
`retryable` and `reconciliation_required` flags, and a receipt only for confirmed sends. These are
dispositions for this batch attempt, not claims about a draft's durable delivery state. The
aggregate reports confirmed sends, all unconfirmed items, and the
unknown-outcome subset separately; it never treats a busy or conflicting attempt as proof that the
underlying draft was not already delivered. An HTTP `200` is only a batch transport success, never
proof that every email was sent. The scheduler must inspect every result, reschedule an untouched
`not_started` item when delivery is still desired, and follow the structured flags instead of
parsing `detail`: retry items marked `retryable`, and reconcile items marked
`reconciliation_required`. In particular, an expired ambiguous attempt is `not_deliverable` but
still requires reconciliation. When both flags are true, an exact unchanged retry is permitted
inside the 23-hour-55-minute safety window despite the reconciliation flag; if no retry produces a
confirmed receipt, reconcile the provider state. Once `retryable` is false and
`reconciliation_required` remains true, reconciliation is mandatory before another attempt. Other
non-retryable results, such as a missing or unapproved draft, require the request or draft to be
corrected instead. The same durable
idempotency identity and 23-hour-55-minute cutoff apply to each item, so replaying a batch returns
existing receipts for drafts already sent rather than sending them again.

Each delivery has one 15-second budget that includes contention, admission, database work and the
provider call; waiting never grants a fresh deadline. The server stops the whole batch after 50
seconds. Active items are reported as `unknown` because they may
have reached the provider; queued items are `not_started`. Before each queued item begins, the API
also checks whether the caller disconnected and leaves that item untouched if so. Configure the
scheduler with a request timeout above 55 seconds so it can receive and persist the itemized result.
