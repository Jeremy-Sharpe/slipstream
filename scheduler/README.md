# Slipstream campaign scheduler

This directory is a one-shot, standard-library-only worker for Railway cron or another container scheduler. Each invocation calls the authenticated `run-due` endpoint once, prints a PII-free JSON summary, and exits. Recurrence belongs to the platform, so crashes cannot create a hidden loop inside the API.

## Railway

Create a service from this repository with `/scheduler` as its root directory. Railway reads `railway.toml`, builds the Dockerfile, and invokes the container every five minutes—the platform's minimum cron interval. Railway cron schedules use UTC, although this every-five-minutes schedule is timezone-independent. Add these service variables:

| Variable | Required | Value |
|---|---:|---|
| `SLIPSTREAM_API_URL` | yes | `https://slipstream-api.3-104-149-193.sslip.io` |
| `SLIPSTREAM_INGEST_TOKEN` | yes | The same deployment-only value as the API |
| `SLIPSTREAM_CAMPAIGN_BATCH_LIMIT` | no | `1`–`8`; default `8` |
| `SLIPSTREAM_SCHEDULER_TIMEOUT_SECONDS` | no | `5`–`70`; default `65` |
| `SLIPSTREAM_CAMPAIGN_ID` | no | Restrict this worker to one campaign UUID |

Do not copy the ingest token into Vercel, `NEXT_PUBLIC_*`, build arguments, logs, or this repository. The worker rejects non-HTTPS API URLs, embedded URL credentials, redirects, oversized responses, malformed JSON and responses inconsistent with the requested batch limit.

An empty queue exits successfully:

```json
{"claimed_count":0,"ok":true}
```

A provider, authentication, timeout or response-contract failure exits non-zero so Railway records a failed cron execution. The worker deliberately does not retry within the same invocation: the next cron run goes through the campaign lease and per-draft delivery ledger rather than risking an uncontrolled duplicate call.

## Local contract test

```bash
cd scheduler
python -m unittest -v test_run.py
```
