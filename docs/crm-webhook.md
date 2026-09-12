# CRM webhook contract

Slipstream can push a reviewed call extraction into an existing CRM without coupling the
AI pipeline to one vendor. A small receiver maps this versioned payload to HubSpot,
Salesforce, Pipedrive, Zoho, or an automation tool. This is a real outbound HTTP seam;
the production demo remains unconfigured until a receiver URL and secrets are installed.

## Configure

Set all three values in the API deployment environment:

```dotenv
CRM_WEBHOOK_URL=https://integrations.example.com/slipstream/crm
CRM_WEBHOOK_SECRET=<at least 32 random bytes>
INGEST_TOKEN=<separate caller token>
```

Production requires HTTPS. The URL cannot contain credentials, a query string, or a
fragment. Never put either secret in the repository or browser bundle.

After a call has an extraction, an authorised server-side caller sends:

```http
POST /api/v1/calls/{conversation_id}/crm-sync
X-Slipstream-Ingest-Token: <INGEST_TOKEN>
```

The API sends one JSON request to `CRM_WEBHOOK_URL` with these headers:

- `Idempotency-Key`: stable for the conversation and exact payload.
- `X-Slipstream-Schema: 2026-09-13`.
- `X-Slipstream-Signature: sha256=<hex HMAC>`.

The receiver must durably reserve each `Idempotency-Key` before starting a CRM write and
serialize concurrent requests for that key. It must retain that record for the lifetime of
the corresponding CRM object, or reconcile retries as upserts using `conversation_id` as
the CRM's unique external key. A receiver that cannot atomically coordinate its key record
and CRM transaction provides at-least-once delivery only: after an ambiguous failure it
must read the CRM by `conversation_id` before writing again. Slipstream coalesces identical
repeats within one API process, but that cache is not durable and is not the correctness
boundary. Slipstream does not automatically retry; the caller chooses when to reconcile
and retry a failed delivery.

## Verify before parsing

Compute HMAC-SHA256 over `Idempotency-Key`, one literal `.` byte, and the exact request-body
bytes using `CRM_WEBHOOK_SECRET`; prefix the lowercase hexadecimal digest with `sha256=`,
and compare it to
`X-Slipstream-Signature` with a constant-time comparison. Reject a missing or invalid
signature. Because the key is authenticated, changing it invalidates the signature and a
captured body cannot be replayed under a new key. Then require the supported schema value
before mapping fields.

The payload contains `conversation_id`, extraction `source`, and bounded contact, company,
deal, and next-step values. It deliberately excludes the raw transcript, evidence quotes,
promises, objections, model prompt, and credentials. Receivers should upsert contact by
email when present, company by domain when present, and the deal by the stable
`conversation_id`; absent values should not erase curated CRM fields.

Any 2xx response is accepted. A receiver may return an `X-Request-Id` header, which
Slipstream truncates to 200 characters and returns in its delivery receipt. Redirects are
not followed, provider response bodies are not consumed, and upstream errors are replaced
with a safe 502 response. Admission waits at most 100 milliseconds and the whole operation,
including lock acquisition and response headers, has a 15-second deadline. A timeout is an
ambiguous outcome, so the caller must reconcile by the same key and `conversation_id`.
