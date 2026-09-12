#!/usr/bin/env node

const DEFAULT_UI_URL = "https://slipstream-hackathon.vercel.app";
const DEFAULT_API_URL = "https://slipstream-api.3-104-149-193.sslip.io";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 1_048_576;
const PRIMARY_FIXTURE_ID = "call-01-northstar-labs";

const requiredCampaignOperations = {
  "/api/v1/campaigns": ["get", "post"],
  "/api/v1/campaigns/run-due": ["post"],
  "/api/v1/campaigns/{campaign_id}": ["get"],
  "/api/v1/campaigns/{campaign_id}/pause": ["post"],
  "/api/v1/campaigns/{campaign_id}/resume": ["post"],
};

function parseArgs(argv) {
  const options = {
    uiUrl: process.env.SLIPSTREAM_UI_URL || DEFAULT_UI_URL,
    apiUrl: process.env.SLIPSTREAM_API_URL || DEFAULT_API_URL,
    expectedRevision: undefined,
    exerciseFixture: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--exercise-fixture") {
      options.exerciseFixture = true;
      continue;
    }
    const value = argv[index + 1];
    if (!["--ui", "--api", "--revision"].includes(flag) || !value) {
      throw new Error(`Usage: npm run smoke:production -- [--revision SHA] [--ui URL] [--api URL] [--exercise-fixture]`);
    }
    if (flag === "--ui") options.uiUrl = value;
    if (flag === "--api") options.apiUrl = value;
    if (flag === "--revision") options.expectedRevision = value;
    index += 1;
  }
  return options;
}

async function exercisePrimaryFixture(apiUrl, fetchImpl, expectModel) {
  const ingest = await request(
    `${apiUrl}/api/v1/calls/fixtures/${PRIMARY_FIXTURE_ID}/ingest`,
    { method: "POST" },
    fetchImpl,
  );
  assert(ingest.response.status === 200, `fixture ingest returned ${ingest.response.status}`);
  const call = parseJson(ingest.body, "fixture ingest");
  assert(call?.fixture === true && call?.provider === "fixture", "fixture ingest lost its provenance");
  assert(call?.source_external_id === PRIMARY_FIXTURE_ID, "fixture ingest returned the wrong call");
  assert(call?.subject === "Northstar Labs — Maya Chen", "fixture ingest returned the wrong subject");
  assert(Array.isArray(call?.segments) && call.segments.length >= 10, "fixture transcript is incomplete");

  const extractionResponse = await request(
    `${apiUrl}/api/v1/calls/${call.id}/extract`,
    { method: "POST" },
    fetchImpl,
  );
  assert(extractionResponse.response.status === 200, `CRM extraction returned ${extractionResponse.response.status}`);
  const extraction = parseJson(extractionResponse.body, "CRM extraction");
  assert(extraction?.conversation_id === call.id, "CRM extraction belongs to another call");
  assert(
    extraction?.source === (expectModel ? "model" : "fixture_labels"),
    `CRM extraction did not use the expected ${expectModel ? "local model" : "fixture-label"} path`,
  );
  if (expectModel) {
    assert(
      extraction?.model === "slipstream-qwen2.5-1.5b-instruct-q4-k-m",
      "CRM extraction returned the wrong local model",
    );
  }
  assert(extraction?.contact?.name?.value === "Maya Chen", "CRM extraction returned the wrong contact");
  assert(extraction?.company?.name?.value === "Northstar Labs", "CRM extraction returned the wrong company");
  assert(extraction?.contact?.name?.evidence?.length > 0, "CRM extraction is missing source evidence");

  const draftResponse = await request(
    `${apiUrl}/api/v1/drafts/from-call/${call.id}`,
    { method: "POST" },
    fetchImpl,
  );
  assert(draftResponse.response.status === 200, `follow-up draft returned ${draftResponse.response.status}`);
  const draft = parseJson(draftResponse.body, "follow-up draft");
  assert(draft?.conversation_id === call.id, "follow-up draft belongs to another call");
  assert(draft?.recipient_name === "Maya Chen", "follow-up draft returned the wrong recipient");
  assert(draft?.status === "draft" || draft?.status === "approved", "follow-up draft has an invalid status");
  assert(draft?.sent_at == null, "follow-up draft was unexpectedly sent");

  const approvalResponse = await request(
    `${apiUrl}/api/v1/drafts/${draft.id}/approve`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approved_by: "Production smoke" }),
    },
    fetchImpl,
  );
  assert(approvalResponse.response.status === 200, `draft approval returned ${approvalResponse.response.status}`);
  const approved = parseJson(approvalResponse.body, "draft approval");
  assert(approved?.id === draft.id && approved?.status === "approved", "draft approval was not recorded");
  assert(approved?.approved_at, "draft approval is missing its audit time");
  assert(approved?.sent_at == null, "approved draft was unexpectedly sent");

  for (const [label, path, expectedId] of [
    ["stored call", `/api/v1/calls/${call.id}`, call.id],
    ["stored extraction", `/api/v1/calls/${call.id}/extraction`, call.id],
    ["stored draft", `/api/v1/drafts/${draft.id}`, draft.id],
  ]) {
    const storedResponse = await request(`${apiUrl}${path}`, {}, fetchImpl);
    assert(storedResponse.response.status === 200, `${label} returned ${storedResponse.response.status}`);
    const stored = parseJson(storedResponse.body, label);
    assert((stored.id || stored.conversation_id) === expectedId, `${label} returned the wrong record`);
    if (label === "stored draft") {
      assert(stored.status === "approved" && stored.sent_at == null, "stored draft is not approved-unsent");
    }
  }

  return { conversationId: call.id, draftId: draft.id, status: "approved-unsent" };
}

function normalizeHttpsUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(`${label} must be HTTPS and must not contain credentials`);
  }
  parsed.pathname = parsed.pathname.replace(/\/$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

async function readBounded(response) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new Error(`response exceeded ${MAX_BODY_BYTES} bytes`);
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error(`response exceeded ${MAX_BODY_BYTES} bytes`);
    }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

async function request(url, init = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = await readBounded(response);
  return { response, body };
}

function parseJson(body, label) {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${label} returned malformed JSON`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSmoke(rawOptions = {}) {
  const uiUrl = normalizeHttpsUrl(rawOptions.uiUrl || DEFAULT_UI_URL, "UI URL");
  const apiUrl = normalizeHttpsUrl(rawOptions.apiUrl || DEFAULT_API_URL, "API URL");
  const expectedRevision = rawOptions.expectedRevision;
  const fetchImpl = rawOptions.fetchImpl || fetch;
  if (expectedRevision !== undefined) {
    assert(/^[0-9a-f]{7,40}$/i.test(expectedRevision), "expected revision must be a Git SHA");
  }

  const campaignPage = await request(`${uiUrl}/campaigns`, {}, fetchImpl);
  assert(campaignPage.response.status === 200, `campaign UI returned ${campaignPage.response.status}`);
  assert(campaignPage.body.includes("Delivery execution"), "campaign UI is missing Delivery execution");

  const readyResponse = await request(`${apiUrl}/ready`, {}, fetchImpl);
  assert(readyResponse.response.status === 200, `/ready returned ${readyResponse.response.status}`);
  const ready = parseJson(readyResponse.body, "/ready");
  assert(ready?.status === "ok", "/ready did not report ok");
  assert(ready?.environment === "production", "/ready did not report production");
  assert(/^[0-9a-f]{40}$/i.test(ready?.revision), "/ready revision is not a full Git SHA");
  if (expectedRevision) {
    assert(
      ready.revision.toLowerCase().startsWith(expectedRevision.toLowerCase()),
      `/ready revision ${ready.revision} does not match ${expectedRevision}`,
    );
  }

  const campaignsResponse = await request(`${apiUrl}/api/v1/campaigns`, {}, fetchImpl);
  assert(campaignsResponse.response.status === 200, `campaign list returned ${campaignsResponse.response.status}`);
  const campaigns = parseJson(campaignsResponse.body, "campaign list");
  assert(Array.isArray(campaigns), "campaign list did not return an array");

  const schemaResponse = await request(`${apiUrl}/openapi.json`, {}, fetchImpl);
  assert(schemaResponse.response.status === 200, `OpenAPI schema returned ${schemaResponse.response.status}`);
  const schema = parseJson(schemaResponse.body, "OpenAPI schema");
  for (const [path, methods] of Object.entries(requiredCampaignOperations)) {
    for (const method of methods) {
      assert(schema?.paths?.[path]?.[method], `OpenAPI schema is missing ${method.toUpperCase()} ${path}`);
    }
  }

  const protectedResponse = await request(
    `${apiUrl}/api/v1/campaigns/00000000-0000-0000-0000-000000000000/pause`,
    { method: "POST", headers: { "content-type": "application/json" } },
    fetchImpl,
  );
  assert(protectedResponse.response.status === 401, `unauthenticated pause returned ${protectedResponse.response.status}`);

  const fixtureLoop = rawOptions.exerciseFixture
    ? await exercisePrimaryFixture(apiUrl, fetchImpl, ready?.integrations?.local_model === true)
    : undefined;

  return {
    revision: ready.revision,
    storage: ready.storage,
    campaignCount: campaigns.length,
    configuredIntegrations: Object.entries(ready.integrations || {})
      .filter(([, configured]) => configured === true)
      .map(([name]) => name),
    ...(fixtureLoop ? { fixtureLoop } : {}),
  };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    const result = await runSmoke(parseArgs(process.argv.slice(2)));
    const integrations = result.configuredIntegrations.length
      ? result.configuredIntegrations.join(",")
      : "none";
    console.log(
      `production smoke passed revision=${result.revision} storage=${result.storage} campaigns=${result.campaignCount} integrations=${integrations}` +
        (result.fixtureLoop
          ? ` fixture=${result.fixtureLoop.conversationId} draft=${result.fixtureLoop.draftId} state=${result.fixtureLoop.status}`
          : ""),
    );
  } catch (error) {
    console.error(`production smoke failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  }
}
