import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { seedDemoCampaign } from "./seed-demo-campaign.mjs";

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "seed-demo-campaign.mjs");

test("command-line seeder executes and fails clearly without its deployment token", () => {
  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      SLIPSTREAM_INGEST_TOKEN: "",
    },
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /SLIPSTREAM_INGEST_TOKEN must be 16–500 characters/);
  assert.equal(result.stdout, "");
});

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
      reasoning_provider: reasoning ? "local" : "openai",
      reasoning_model: reasoning ? "local-qwen" : "gpt-5.4",
    });
    if (url.includes("/calls/fixtures/")) return json({ id: "11111111-1111-4111-8111-111111111111" });
    if (url.endsWith("/extract")) return json({ conversation_id: "11111111-1111-4111-8111-111111111111", source: reasoning ? "model" : "fixture_labels", model: reasoning ? "local-qwen" : "labelled-fixture-v1" });
    if (url.endsWith("/extraction")) return json({ detail: "Extraction not found" }, 404);
    if (url.includes("/drafts/from-call/")) return json({ id: "22222222-2222-4222-8222-222222222222", source: reasoning ? "model" : "deterministic", model: reasoning ? "local-qwen" : "grounded-template-v1" });
    if (url.endsWith("/emails")) return json({ id: "33333333-3333-4333-8333-333333333333" });
    if (url.endsWith("/draft-reply")) return json({ id: "44444444-4444-4444-8444-444444444444", recipient_email: "donnie@marlowefinch.example", source: reasoning ? "model" : "deterministic", model: reasoning ? "local-qwen" : "thread-grounded-template-v2" });
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
  assert.equal(fixture.calls.length, 11);
  const protectedCalls = fixture.calls.filter(({ url }) => url.endsWith("/emails") || url.endsWith("/draft-reply") || url.endsWith("/campaigns") || url.endsWith("/pause"));
  assert.equal(protectedCalls.length, 4);
  assert.equal(protectedCalls.every(({ init }) => init.headers["x-slipstream-ingest-token"] === "a-secure-demo-token"), true);

  const inbound = JSON.parse(fixture.calls.find(({ url }) => url.endsWith("/emails")).init.body);
  assert.equal(inbound.sender.email, "donnie@marlowefinch.example");
  assert.deepEqual(inbound.recipients.map((r) => r.email), ["jordan@eleno.example"]);
  assert.equal(inbound.mailbox.email, "jordan@eleno.example");
  assert.match(inbound.subject, /month-end reporting build/);
  assert.match(inbound.body, /proposal and statement of work/);
});

test("requires exact configured-model provenance before creating a campaign", async () => {
  const fixture = fixtureFetch({ reasoning: true });
  const result = await seedDemoCampaign({
    apiUrl: "https://api.example",
    token: "a-secure-demo-token",
    fetchImpl: fixture.fetchImpl,
  });

  assert.equal(result.status, "paused");
  const modelCalls = fixture.calls.filter(({ url }) => url.endsWith("/extract") || url.includes("/drafts/from-call/"));
  assert.equal(modelCalls.length, 2);
  assert.equal(modelCalls.every(({ init }) => init.signal.aborted === false), true);
});

test("continues with the safe email campaign when a local call draft is rejected", async () => {
  const fixture = fixtureFetch({ reasoning: true });
  const fetchImpl = async (url, init) => {
    if (url.includes("/drafts/from-call/")) {
      fixture.calls.push({ url, init });
      return json({ detail: "The follow-up could not be drafted" }, 502);
    }
    return fixture.fetchImpl(url, init);
  };

  const result = await seedDemoCampaign({
    apiUrl: "https://api.example",
    token: "a-secure-demo-token",
    fetchImpl,
  });

  assert.equal(result.status, "paused");
  assert.equal(fixture.calls.some(({ url }) => url.includes("22222222-2222-4222-8222-222222222222/approve")), false);
});

for (const disconnectMessage of ["fetch failed", "terminated"]) test(`recovers a stored local extraction after ${disconnectMessage}`, async () => {
  const fixture = fixtureFetch({ reasoning: true });
  let disconnected = false;
  let extractionReads = 0;
  let now = 0;
  const fetchImpl = async (url, init) => {
    if (url.endsWith("/extraction")) {
      extractionReads += 1;
      fixture.calls.push({ url, init });
      return extractionReads < 4
        ? json({ detail: "Extraction not found" }, 404)
        : json({ conversation_id: "11111111-1111-4111-8111-111111111111", source: "model", model: "local-qwen" });
    }
    if (url.endsWith("/extract") && !disconnected) {
      disconnected = true;
      fixture.calls.push({ url, init });
      throw new TypeError(disconnectMessage);
    }
    return fixture.fetchImpl(url, init);
  };

  const result = await seedDemoCampaign({
    apiUrl: "http://127.0.0.1:8000",
    token: "a-secure-demo-token",
    fetchImpl,
    nowImpl: () => now,
    sleepImpl: async (milliseconds) => { now += milliseconds; },
  });

  assert.equal(result.status, "paused");
  assert.equal(extractionReads, 4);
  assert.equal(fixture.calls.filter(({ url }) => url.endsWith("/extract")).length, 1);
});

test("stops bounded recovery when a disconnected extraction is never stored", async () => {
  const fixture = fixtureFetch({ reasoning: true });
  let now = 0;
  const fetchImpl = async (url, init) => {
    if (url.endsWith("/extract")) {
      fixture.calls.push({ url, init });
      throw new TypeError("fetch failed");
    }
    return fixture.fetchImpl(url, init);
  };

  await assert.rejects(
    seedDemoCampaign({
      apiUrl: "http://127.0.0.1:8000",
      token: "a-secure-demo-token",
      fetchImpl,
      nowImpl: () => now,
      sleepImpl: async () => { now += 100_000; },
    }),
    /fetch failed/,
  );
  assert.equal(fixture.calls.filter(({ url }) => url.endsWith("/extract")).length, 1);
});

test("does not recover a definitive local extraction failure", async () => {
  const fixture = fixtureFetch({ reasoning: true });
  const fetchImpl = async (url, init) => {
    if (url.endsWith("/extract")) {
      fixture.calls.push({ url, init });
      return json({ detail: "Model extraction failed" }, 502);
    }
    return fixture.fetchImpl(url, init);
  };

  await assert.rejects(
    seedDemoCampaign({
      apiUrl: "http://127.0.0.1:8000",
      token: "a-secure-demo-token",
      fetchImpl,
    }),
    /HTTP 502/,
  );
  assert.equal(fixture.calls.filter(({ url }) => url.endsWith("/extraction")).length, 1);
});

test("fails closed on a cached extraction from a different reasoning path", async () => {
  const fixture = fixtureFetch({ reasoning: true });
  const fetchImpl = async (url, init) => {
    if (url.endsWith("/extraction")) {
      fixture.calls.push({ url, init });
      return json({
        conversation_id: "11111111-1111-4111-8111-111111111111",
        source: "fixture_labels",
        model: "labelled-fixture-v1",
      });
    }
    return fixture.fetchImpl(url, init);
  };

  await assert.rejects(
    seedDemoCampaign({
      apiUrl: "http://127.0.0.1:8000",
      token: "a-secure-demo-token",
      fetchImpl,
    }),
    /configured model/,
  );
  assert.equal(fixture.calls.some(({ url }) => url.endsWith("/extract")), false);
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
