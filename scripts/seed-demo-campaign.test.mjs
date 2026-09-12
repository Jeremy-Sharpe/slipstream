import assert from "node:assert/strict";
import test from "node:test";

import { seedDemoCampaign } from "./seed-demo-campaign.mjs";

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function fixtureFetch({ storage = "memory", emailDelivery = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith("/ready")) return json({ status: "ok", environment: "production", storage, integrations: { email_delivery: emailDelivery } });
    if (url.includes("/calls/fixtures/")) return json({ id: "11111111-1111-4111-8111-111111111111" });
    if (url.endsWith("/extract")) return json({ conversation_id: "11111111-1111-4111-8111-111111111111" });
    if (url.includes("/drafts/from-call/")) return json({ id: "22222222-2222-4222-8222-222222222222" });
    if (url.endsWith("/approve")) return json({ id: "22222222-2222-4222-8222-222222222222", status: "approved", sent_at: null });
    if (url.endsWith("/campaigns")) return json({ id: "83b2a7b2-1ace-4dc5-b90a-d0dba9d2ed4c" }, 201);
    if (url.endsWith("/pause")) return json({ id: "83b2a7b2-1ace-4dc5-b90a-d0dba9d2ed4c", status: "paused", scheduled_for: "2099-01-01T00:00:00Z", counts: { queued: 1, sent: 0 } });
    throw new Error(`unexpected URL ${url}`);
  };
  return { calls, fetchImpl };
}

test("creates and pauses an unsent synthetic campaign", async () => {
  const fixture = fixtureFetch();
  const result = await seedDemoCampaign({
    apiUrl: "https://api.example",
    token: "a-secure-demo-token",
    fetchImpl: fixture.fetchImpl,
  });
  assert.deepEqual(result, {
    campaignId: "83b2a7b2-1ace-4dc5-b90a-d0dba9d2ed4c",
    status: "paused",
    scheduledFor: "2099-01-01T00:00:00Z",
    queued: 1,
    sent: 0,
  });
  assert.equal(fixture.calls.length, 7);
  assert.equal(fixture.calls[5].init.headers["x-slipstream-ingest-token"], "a-secure-demo-token");
  assert.equal(fixture.calls[6].init.headers["x-slipstream-ingest-token"], "a-secure-demo-token");
  assert.equal(fixture.calls.slice(0, 5).some(({ init }) => "x-slipstream-ingest-token" in init.headers), false);
});

test("refuses durable storage before performing a mutation", async () => {
  const fixture = fixtureFetch({ storage: "supabase" });
  await assert.rejects(
    seedDemoCampaign({ apiUrl: "https://api.example", token: "a-secure-demo-token", fetchImpl: fixture.fetchImpl }),
    /outside memory storage/,
  );
  assert.equal(fixture.calls.length, 1);
});

test("refuses configured email delivery before performing a mutation", async () => {
  const fixture = fixtureFetch({ emailDelivery: true });
  await assert.rejects(
    seedDemoCampaign({ apiUrl: "https://api.example", token: "a-secure-demo-token", fetchImpl: fixture.fetchImpl }),
    /email delivery is configured/,
  );
  assert.equal(fixture.calls.length, 1);
});
