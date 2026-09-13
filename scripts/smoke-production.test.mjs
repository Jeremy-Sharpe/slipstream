import assert from "node:assert/strict";
import test from "node:test";

import { runSmoke } from "./smoke-production.mjs";

const revision = "3e03e1a4c9489bea302c8677312c53d5956cad23";
const conversationId = "e9981868-623b-5b59-ab18-5e0c342f2c15";
const draftId = "435108a7-6302-5627-b456-c0abd72602ac";

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fixtureFetch(overrides = {}) {
  const paths = {
    "https://ui.example/campaigns": new Response("<h2>Delivery execution</h2><p>Hackathon demo — intentionally unsent</p>"),
    "https://api.example/ready": json({
      status: "ok",
      environment: "production",
      revision,
      storage: "memory",
      integrations: { email_delivery: false },
    }),
    "https://api.example/api/v1/campaigns": json([]),
    "https://api.example/api/v1/demo/evidence": json({
      status: "verified",
      lead_provider: "openrouter_demo",
      lead_count: 10,
      all_fictional: true,
      all_reserved_domains: true,
      no_delivery_coordinates: true,
      delivery_enabled: false,
      icp: { profile: { source_summary: { calls: 12, emails: 1 } } },
    }),
    "https://api.example/openapi.json": json({
      paths: {
        "/api/v1/campaigns": { get: {}, post: {} },
        "/api/v1/campaigns/run-due": { post: {} },
        "/api/v1/campaigns/{campaign_id}": { get: {} },
        "/api/v1/campaigns/{campaign_id}/pause": { post: {} },
        "/api/v1/campaigns/{campaign_id}/resume": { post: {} },
      },
    }),
    "https://api.example/api/v1/campaigns/00000000-0000-0000-0000-000000000000/pause": json(
      { detail: "Invalid ingest token" },
      401,
    ),
    "https://api.example/api/v1/calls/fixtures/call-01-northstar-labs/ingest": json({
      id: conversationId,
      source_external_id: "call-01-northstar-labs",
      subject: "Northstar Labs — Maya Chen",
      provider: "fixture",
      fixture: true,
      segments: Array.from({ length: 12 }, (_, sequence) => ({ sequence })),
    }),
    [`https://api.example/api/v1/calls/${conversationId}/extract`]: json({
      conversation_id: conversationId,
      source: "fixture_labels",
      contact: { name: { value: "Maya Chen", evidence: [{ sequence: 0 }] } },
      company: { name: { value: "Northstar Labs" } },
    }),
    [`https://api.example/api/v1/drafts/from-call/${conversationId}`]: json({
      id: draftId,
      conversation_id: conversationId,
      recipient_name: "Maya Chen",
      status: "draft",
      sent_at: null,
    }),
    [`https://api.example/api/v1/drafts/${draftId}/approve`]: json({
      id: draftId,
      conversation_id: conversationId,
      status: "approved",
      approved_at: "2026-09-13T00:00:00Z",
      sent_at: null,
    }),
    [`https://api.example/api/v1/calls/${conversationId}`]: json({
      id: conversationId,
    }),
    [`https://api.example/api/v1/calls/${conversationId}/extraction`]: json({
      conversation_id: conversationId,
    }),
    [`https://api.example/api/v1/drafts/${draftId}`]: json({
      id: draftId,
      status: "approved",
      sent_at: null,
    }),
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
    leadProofCount: 10,
    configuredIntegrations: [],
  });
});

test("rejects an unsafe or incomplete lead proof", async () => {
  await assert.rejects(
    runSmoke({
      uiUrl: "https://ui.example",
      apiUrl: "https://api.example",
      fetchImpl: fixtureFetch({
        "https://api.example/api/v1/demo/evidence": json({
          status: "incomplete",
          lead_provider: "openrouter_demo",
          lead_count: 10,
          all_fictional: false,
        }),
      }),
    }),
    /did not report verified/,
  );
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

test("exercises the canonical production call through audited unsent approval", async () => {
  const result = await runSmoke({
    uiUrl: "https://ui.example",
    apiUrl: "https://api.example",
    expectedRevision: revision,
    exerciseFixture: true,
    fetchImpl: fixtureFetch(),
  });

  assert.deepEqual(result.fixtureLoop, {
    conversationId,
    draftId,
    status: "approved-unsent",
  });
});

test("requires model provenance when production enables the local model", async () => {
  const fetchImpl = fixtureFetch({
    "https://api.example/ready": json({
      status: "ok",
      environment: "production",
      revision,
      storage: "memory",
      integrations: { local_model: true },
      reasoning_provider: "local",
      reasoning_model: "custom-local-model",
      reasoning_configured: true,
    }),
    [`https://api.example/api/v1/calls/${conversationId}/extract`]: json({
      conversation_id: conversationId,
      source: "model",
      model: "custom-local-model",
      contact: { name: { value: "Maya Chen", evidence: [{ sequence: 0 }] } },
      company: { name: { value: "Northstar Labs" } },
    }),
  });

  const result = await runSmoke({
    uiUrl: "https://ui.example",
    apiUrl: "https://api.example",
    exerciseFixture: true,
    fetchImpl,
  });

  assert.deepEqual(result.configuredIntegrations, ["local_model"]);
  assert.equal(result.fixtureLoop.status, "approved-unsent");
});

test("requires hosted-model provenance when a hosted provider takes priority", async () => {
  const fetchImpl = fixtureFetch({
    "https://api.example/ready": json({
      status: "ok",
      environment: "production",
      revision,
      storage: "memory",
      integrations: { openrouter: true, local_model: true },
      reasoning_provider: "openrouter",
      reasoning_model: "openai/gpt-5.4",
      reasoning_configured: true,
    }),
    [`https://api.example/api/v1/calls/${conversationId}/extract`]: json({
      conversation_id: conversationId,
      source: "model",
      model: "openai/gpt-5.4",
      contact: { name: { value: "Maya Chen", evidence: [{ sequence: 0 }] } },
      company: { name: { value: "Northstar Labs" } },
    }),
  });

  const result = await runSmoke({
    uiUrl: "https://ui.example",
    apiUrl: "https://api.example",
    exerciseFixture: true,
    fetchImpl,
  });

  assert.deepEqual(result.configuredIntegrations, ["openrouter", "local_model"]);
  assert.equal(result.fixtureLoop.status, "approved-unsent");
});

test("fails if the production fixture draft was unexpectedly sent", async () => {
  await assert.rejects(
    runSmoke({
      uiUrl: "https://ui.example",
      apiUrl: "https://api.example",
      exerciseFixture: true,
      fetchImpl: fixtureFetch({
        [`https://api.example/api/v1/drafts/${draftId}/approve`]: json({
          id: draftId,
          status: "approved",
          approved_at: "2026-09-13T00:00:00Z",
          sent_at: "2026-09-13T00:00:01Z",
        }),
      }),
    }),
    /unexpectedly sent/,
  );
});
