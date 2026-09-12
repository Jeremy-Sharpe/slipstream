#!/usr/bin/env node

const DEFAULT_API_URL = "https://slipstream-api.3-104-149-193.sslip.io";
const CAMPAIGN_ID = "83b2a7b2-1ace-4dc5-b90a-d0dba9d2ed4c";
const SCHEDULED_FOR = "2099-01-01T00:00:00Z";
const TIMEOUT_MS = 20_000;
const MODEL_TIMEOUT_MS = 600_000;
const MAX_RESPONSE_BYTES = 1_048_576;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeApiUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("API URL must be a valid URL");
  }
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  assert(
    url.protocol === "https:" || (url.protocol === "http:" && loopback),
    "API URL must use HTTPS unless it is an explicit loopback URL",
  );
  assert(!url.username && !url.password, "API URL must not contain credentials");
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function validateToken(value) {
  assert(typeof value === "string" && value.length >= 16 && value.length <= 500, "SLIPSTREAM_INGEST_TOKEN must be 16–500 characters");
  assert(/^[\x21-\x7e]+$/.test(value), "SLIPSTREAM_INGEST_TOKEN must contain visible ASCII only");
  return value;
}

async function readBounded(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("API response exceeded 1 MiB");
    }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

async function requestJson(fetchImpl, url, { payload, token, timeoutMs = TIMEOUT_MS } = {}) {
  const headers = { accept: "application/json" };
  if (payload !== undefined) headers["content-type"] = "application/json";
  if (token !== undefined) headers["x-slipstream-ingest-token"] = token;
  const response = await fetchImpl(url, {
    method: payload === undefined ? "GET" : "POST",
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await readBounded(response);
  assert(response.ok, `API request failed with HTTP ${response.status}`);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("API returned malformed JSON");
  }
}

export async function seedDemoCampaign({
  apiUrl = DEFAULT_API_URL,
  token,
  fetchImpl = fetch,
} = {}) {
  const base = normalizeApiUrl(apiUrl);
  const ingestToken = validateToken(token);
  const ready = await requestJson(fetchImpl, `${base}/ready`);
  assert(ready?.status === "ok" && ready?.environment === "production", "API is not a ready production deployment");
  assert(ready?.storage === "memory", "refusing to seed demo data outside memory storage");
  assert(ready?.integrations?.email_delivery === false, "refusing to seed while email delivery is configured");

  const call = await requestJson(fetchImpl, `${base}/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest`, { payload: {} });
  assert(typeof call?.id === "string", "fixture ingest did not return a call ID");
  const modelTimeout = ready?.reasoning_configured === true ? MODEL_TIMEOUT_MS : TIMEOUT_MS;
  const extraction = await requestJson(fetchImpl, `${base}/api/v1/calls/${call.id}/extract`, {
    payload: {},
    timeoutMs: modelTimeout,
  });
  if (ready?.reasoning_configured === true) {
    assert(extraction?.source === "model", "demo extraction did not use the configured model");
    assert(extraction?.model === ready?.reasoning_model, "demo extraction used the wrong model");
  }
  const draft = await requestJson(fetchImpl, `${base}/api/v1/drafts/from-call/${call.id}`, {
    payload: {},
    timeoutMs: modelTimeout,
  });
  assert(typeof draft?.id === "string", "draft creation did not return a draft ID");
  if (ready?.reasoning_configured === true) {
    assert(draft?.source === "model", "demo draft did not use the configured model");
    assert(draft?.model === ready?.reasoning_model, "demo draft used the wrong model");
  }
  const approved = await requestJson(fetchImpl, `${base}/api/v1/drafts/${draft.id}/approve`, {
    payload: { approved_by: "Hackathon demo" },
  });
  assert(approved?.status === "approved" && approved?.sent_at == null, "demo draft is not safely approved and unsent");

  const campaign = await requestJson(fetchImpl, `${base}/api/v1/campaigns`, {
    token: ingestToken,
    payload: {
      campaign_id: CAMPAIGN_ID,
      name: "Hackathon demo — intentionally unsent",
      draft_ids: [approved.id],
      scheduled_for: SCHEDULED_FOR,
      created_by: "Slipstream fixture",
    },
  });
  const paused = await requestJson(fetchImpl, `${base}/api/v1/campaigns/${campaign.id}/pause`, {
    token: ingestToken,
    payload: {},
  });
  assert(paused?.status === "paused", "demo campaign was not paused");
  assert(paused?.counts?.sent === 0, "demo campaign unexpectedly contains a sent item");
  return {
    campaignId: paused.id,
    status: paused.status,
    scheduledFor: paused.scheduled_for,
    queued: paused.counts?.queued,
    sent: paused.counts?.sent,
  };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    const result = await seedDemoCampaign({
      apiUrl: process.env.SLIPSTREAM_API_URL || DEFAULT_API_URL,
      token: process.env.SLIPSTREAM_INGEST_TOKEN,
    });
    console.log(`demo campaign ready id=${result.campaignId} status=${result.status} queued=${result.queued} sent=${result.sent} scheduled_for=${result.scheduledFor}`);
  } catch (error) {
    console.error(`demo campaign seed failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  }
}
