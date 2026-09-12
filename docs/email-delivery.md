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
curl -fsS -X POST \
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
