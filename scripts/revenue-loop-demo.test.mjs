import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DEMO_CAMPAIGN_ID, campaignSafety, findDemoCampaign, modelLabel, proofFooter } from "../lib/demo/revenue-loop.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const campaign = (patch = {}) => ({
  id: DEMO_CAMPAIGN_ID, name: "Hackathon demo — controlled send", status: "paused", scheduled_for: "2099-01-01T00:00:00Z", created_by: "demo", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  counts: { queued: 1, running: 0, sent: 0, retryable: 0, failed: 0, reconcile: 0 },
  items: [{ position: 0, draft_id: "draft-1", state: "queued", outcome: null, http_status: null, detail: null, retryable: false, reconciliation_required: false, receipt: null, attempt_count: 0, next_attempt_at: null, last_attempt_at: null }],
  ...patch,
});

test("stage demo tells the connected loop and deep-links every proof surface", async () => {
  const [page, component, sidebar, transcript, detail, campaigns] = await Promise.all([
    readFile(path.join(root, "app/(app)/demo/page.tsx"), "utf8"), readFile(path.join(root, "components/demo/RevenueLoop.tsx"), "utf8"), readFile(path.join(root, "components/shell/Sidebar.tsx"), "utf8"), readFile(path.join(root, "components/conversations/detail/Transcript.tsx"), "utf8"), readFile(path.join(root, "components/conversations/detail/ConversationDetail.tsx"), "utf8"), readFile(path.join(root, "components/campaigns/LiveCampaignRuns.tsx"), "utf8"),
  ]);
  assert.match(page, /RevenueLoop/);
  assert.match(sidebar, /href: "\/demo", label: "Revenue loop"/);
  for (const call of ["getReadiness", "getLatestIcp", "getCampaigns"]) assert.ok(component.includes(`${call}(`));
  for (const href of ["#transcript", "#crm-writeback", "#follow-up-draft", "/intelligence#patterns", "/intelligence#icp", "/intelligence#brief", "/campaigns#delivery-execution"]) assert.ok(component.includes(href), `demo links to ${href}`);
  assert.match(transcript, /id="transcript"/); assert.match(detail, /id="crm-writeback"/); assert.match(detail, /id="follow-up-draft"/); assert.match(campaigns, /id="delivery-execution"/);
  assert.match(component, /Presenter-controlled/); assert.match(component, /prefers-reduced-motion/); assert.match(component, /min-w-\[980px\]/); assert.match(component, /it does not simulate provider calls or send email/);
});

test("campaign proof is tied to the immutable demo id and exact zero-send guardrail", () => {
  assert.equal(findDemoCampaign([campaign()]).status, "verified");
  assert.equal(findDemoCampaign([campaign({ id: "lookalike" })]).status, "missing");
  assert.deepEqual(campaignSafety(campaign()), { verified: true, summary: "1 queued · 0 sent", detail: "The exact hackathon campaign is paused until 2099, with zero delivery attempts." });
  assert.equal(campaignSafety(campaign({ status: "running" })).verified, false);
  assert.equal(campaignSafety(campaign({ counts: { queued: 0, running: 0, sent: 1, retryable: 0, failed: 0, reconcile: 0 } })).verified, false);
  assert.equal(campaignSafety(campaign({ items: [{ ...campaign().items[0], attempt_count: 1 }] })).verified, false);
  assert.equal(campaignSafety(campaign({ counts: { queued: 2, running: 0, sent: 0, retryable: 0, failed: 0, reconcile: 0 } })).verified, false);
  assert.equal(campaignSafety(campaign({ scheduled_for: "2026-01-01T00:00:00Z" })).verified, false);
  assert.equal(campaignSafety(campaign({ scheduled_for: "not-a-date" })).verified, false);
});

test("provider labels and partial failures stay truthful", () => {
  assert.equal(modelLabel("local", "qwen2.5:7b"), "Local · qwen2.5:7b");
  assert.equal(modelLabel("openrouter", "qwen2.5:7b"), "OpenRouter · qwen2.5:7b");
  assert.equal(modelLabel(undefined, "qwen2.5:7b"), "Proof unavailable");
  const footer = proofFooter({ runtime: { status: "failed" }, icp: { status: "missing" }, campaign: { status: "failed" } });
  assert.equal(footer, "runtime unavailable · ICP unavailable · campaign unavailable");
  assert.doesNotMatch(footer, /verified|status checked|13 CRM/);
});
