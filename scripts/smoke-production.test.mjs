import assert from "node:assert/strict";
import test from "node:test";

import { runSmoke } from "./smoke-production.mjs";

const revision = "3e03e1a4c9489bea302c8677312c53d5956cad23";

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fixtureFetch(overrides = {}) {
  const paths = {
    "https://ui.example/campaigns": new Response("<h2>Delivery execution</h2>"),
    "https://api.example/ready": json({
      status: "ok",
      environment: "production",
      revision,
      storage: "memory",
      integrations: { email_delivery: false },
    }),
    "https://api.example/api/v1/campaigns": json([]),
    "https://api.example/openapi.json": json({
      paths: {
        "/api/v1/campaigns": {},
        "/api/v1/campaigns/run-due": {},
        "/api/v1/campaigns/{campaign_id}": {},
        "/api/v1/campaigns/{campaign_id}/pause": {},
        "/api/v1/campaigns/{campaign_id}/resume": {},
      },
    }),
    "https://api.example/api/v1/campaigns/00000000-0000-0000-0000-000000000000/pause": json(
      { detail: "Invalid ingest token" },
      401,
    ),
    ...overrides,
  };
  return async (url) => {
    const response = paths[url];
    if (!response) throw new Error(`unexpected URL ${url}`);
    return response.clone();
  };
}

test("validates the complete public production contract", async () => {
  const result = await runSmoke({
    uiUrl: "https://ui.example",
    apiUrl: "https://api.example",
    expectedRevision: revision.slice(0, 7),
    fetchImpl: fixtureFetch(),
  });

  assert.deepEqual(result, {
    revision,
    storage: "memory",
    campaignCount: 0,
    configuredIntegrations: [],
  });
});

test("rejects a stale API deployment", async () => {
  await assert.rejects(
    runSmoke({
      uiUrl: "https://ui.example",
      apiUrl: "https://api.example",
      expectedRevision: "aaaaaaaa",
      fetchImpl: fixtureFetch(),
    }),
    /does not match/,
  );
});

test("rejects a campaign UI without the live execution surface", async () => {
  await assert.rejects(
    runSmoke({
      uiUrl: "https://ui.example",
      apiUrl: "https://api.example",
      fetchImpl: fixtureFetch({
        "https://ui.example/campaigns": new Response("<h2>Sequence workspace</h2>"),
      }),
    }),
    /missing Delivery execution/,
  );
});
