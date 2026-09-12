import assert from "node:assert/strict";
import test from "node:test";

import { seedDemoCampaign } from "./seed-demo-campaign.mjs";

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function fixtureFetch({ storage = "memory", emailDelivery = false, reasoning = false, campaignConflict = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith("/ready")) return json({
      status: "ok",
      environment: "production",
      storage,
      integrations: { email_delivery: emailDelivery },
      reasoning_configured: reasoning,
      reasoning_model: reasoning ? "local-qwen" : "gpt-5.4",
    });
    if (url.includes("/calls/fixtures/")) return json({ id: "11111111-1111-4111-8111-111111111111" });
    if (url.endsWith("/extract")) return json({ conversation_id: "11111111-1111-4111-8111-111111111111", source: reasoning ? "model" : "fixture_labels", model: reasoning ? "local-qwen" : "labelled-fixture-v1" });
    if (url.includes("/drafts/from-call/")) return json({ id: "22222222-2222-4222-8222-222222222222", source: reasoning ? "model" : "deterministic", model: reasoning ? "local-qwen" : "grounded-template-v1" });
    if (url.endsWith("/emails")) return json({ id: "33333333-3333-4333-8333-333333333333" });
    if (url.endsWith("/draft-reply")) return json({ id: "44444444-4444-4444-8444-444444444444", recipient_email: "donnie@marlowefinch.example", source: "deterministic", model: "thread-grounded-template-v2" });
    if (url.includes("22222222-2222-4222-8222-222222222222/approve")) return json({ id: "22222222-2222-4222-8222-222222222222", status: "approved", sent_at: null });
    if (url.includes("44444444-4444-4444-8444-444444444444/approve")) return json({ id: "44444444-4444-4444-8444-444444444444", status: "approved", sent_at: null });
    if (url.endsWith("/campaigns")) {
      const payload = JSON.parse(init.body);
      assert.deepEqual(payload.draft_ids, ["44444444-4444-4444-8444-444444444444"]);
      return campaignConflict
        ? json({ detail: "Campaign ID has different enrollment" }, 409)
        : json({ id: "83b2a7b2-1ace-4dc5-b90a-d0dba9d2ed4c" }, 201);
    }
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
  assert.equal(fixture.calls.length, 10);
  const protectedCalls = fixture.calls.filter(({ url }) => url.endsWith("/emails") || url.endsWith("/draft-reply") || url.endsWith("/campaigns") || url.endsWith("/pause"));
  assert.equal(protectedCalls.length, 4);
  assert.equal(protectedCalls.every(({ init }) => init.headers["x-slipstream-ingest-token"] === "a-secure-demo-token"), true);
});

test("requires exact configured-model provenance before creating a campaign", async () => {
  const fixture = fixtureFetch({ reasoning: true });
  const result = await seedDemoCampaign({
    apiUrl: "https://api.example",
    token: "a-secure-demo-token",
    fetchImpl: fixture.fetchImpl,
  });

  assert.equal(result.status, "paused");
  assert.equal(fixture.calls[2].init.signal.aborted, false);
  assert.equal(fixture.calls[3].init.signal.aborted, false);
});

test("reuses an already-approved call draft without approving it again", async () => {
  const fixture = fixtureFetch();
  const fetchImpl = async (url, init) => {
    if (url.includes("/drafts/from-call/")) {
      fixture.calls.push({ url, init });
      return json({
        id: "22222222-2222-4222-8222-222222222222",
        status: "approved",
        sent_at: null,
        source: "deterministic",
        model: "grounded-template-v1",
      });
    }
    return fixture.fetchImpl(url, init);
  };

  const result = await seedDemoCampaign({
    apiUrl: "https://api.example",
    token: "a-secure-demo-token",
    fetchImpl,
  });

  assert.equal(result.status, "paused");
  assert.equal(
    fixture.calls.some(({ url }) => url.includes("22222222-2222-4222-8222-222222222222/approve")),
    false,
  );
});

test("fails closed when the fixed campaign ID has a different enrollment", async () => {
  const fixture = fixtureFetch({ campaignConflict: true });

  await assert.rejects(
    seedDemoCampaign({
      apiUrl: "https://api.example",
      token: "a-secure-demo-token",
      fetchImpl: fixture.fetchImpl,
    }),
    /HTTP 409/,
  );
  assert.equal(fixture.calls.some(({ url }) => url.endsWith("/pause")), false);
});

test("allows deployment-local HTTP without allowing remote plaintext", async () => {
  const fixture = fixtureFetch();
  const result = await seedDemoCampaign({
    apiUrl: "http://127.0.0.1:8000",
    token: "a-secure-demo-token",
    fetchImpl: fixture.fetchImpl,
  });

  assert.equal(result.status, "paused");
  await assert.rejects(
    seedDemoCampaign({
      apiUrl: "http://api.example",
      token: "a-secure-demo-token",
      fetchImpl: fixture.fetchImpl,
    }),
    /explicit loopback/,
  );
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
