#!/usr/bin/env node

const DEFAULT_UI_URL = "https://slipstream-hackathon.vercel.app";
const DEFAULT_API_URL = "https://slipstream-api.3-104-149-193.sslip.io";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 1_048_576;

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
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!["--ui", "--api", "--revision"].includes(flag) || !value) {
      throw new Error(`Usage: npm run smoke:production -- [--revision SHA] [--ui URL] [--api URL]`);
    }
    if (flag === "--ui") options.uiUrl = value;
    if (flag === "--api") options.apiUrl = value;
    if (flag === "--revision") options.expectedRevision = value;
    index += 1;
  }
  return options;
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

  return {
    revision: ready.revision,
    storage: ready.storage,
    campaignCount: campaigns.length,
    configuredIntegrations: Object.entries(ready.integrations || {})
      .filter(([, configured]) => configured === true)
      .map(([name]) => name),
  };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    const result = await runSmoke(parseArgs(process.argv.slice(2)));
    const integrations = result.configuredIntegrations.length
      ? result.configuredIntegrations.join(",")
      : "none";
    console.log(
      `production smoke passed revision=${result.revision} storage=${result.storage} campaigns=${result.campaignCount} integrations=${integrations}`,
    );
  } catch (error) {
    console.error(`production smoke failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  }
}
