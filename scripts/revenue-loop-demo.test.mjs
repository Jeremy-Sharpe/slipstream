import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DEMO_CAMPAIGN_ID, campaignSafety, findDemoCampaign, icpClaimSafety, modelLabel, nextPresenterStep, parseStoredStep, playbackLabel, proofFooter, rateScenario, settleDemoProof } from "../lib/demo/revenue-loop.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const campaign = (patch = {}) => ({
  id: DEMO_CAMPAIGN_ID, name: "Hackathon demo — controlled send", status: "paused", scheduled_for: "2099-01-01T00:00:00Z", created_by: "demo", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  counts: { queued: 1, running: 0, sent: 0, retryable: 0, failed: 0, reconcile: 0 },
  items: [{ position: 0, draft_id: "draft-1", state: "queued", outcome: null, http_status: null, detail: null, retryable: false, reconciliation_required: false, receipt: null, attempt_count: 0, next_attempt_at: null, last_attempt_at: null }],
  ...patch,
});

test("stage demo tells the connected loop and deep-links every proof surface", async () => {
  const [page, component, sidebar, transcript, detail, campaigns, intelligence] = await Promise.all([
    readFile(path.join(root, "app/(app)/demo/page.tsx"), "utf8"), readFile(path.join(root, "components/demo/RevenueLoop.tsx"), "utf8"), readFile(path.join(root, "components/shell/Sidebar.tsx"), "utf8"), readFile(path.join(root, "components/conversations/detail/Transcript.tsx"), "utf8"), readFile(path.join(root, "components/conversations/detail/ConversationDetail.tsx"), "utf8"), readFile(path.join(root, "components/campaigns/LiveCampaignRuns.tsx"), "utf8"), readFile(path.join(root, "components/intelligence/sections.tsx"), "utf8"),
  ]);
  assert.match(page, /RevenueLoop/);
  assert.match(sidebar, /href: "\/demo", label: "Revenue loop"/);
  assert.match(sidebar, /max-width: 767px/); assert.match(sidebar, /w-14/);
  for (const call of ["getReadiness", "getLatestIcp", "getCampaigns"]) assert.ok(component.includes(`${call}(`));
  for (const href of ["#transcript", "#crm-writeback", "#follow-up-draft", "/intelligence#patterns", "/intelligence#icp", "/intelligence#brief", "/campaigns#delivery-execution"]) assert.ok(component.includes(href), `demo links to ${href}`);
  assert.match(transcript, /id="transcript"/); assert.match(detail, /id="crm-writeback"/); assert.match(detail, /id="follow-up-draft"/); assert.match(campaigns, /id="delivery-execution"/);
  for (const fragment of ["patterns", "icp", "brief"]) assert.ok(intelligence.includes(`id="${fragment}"`), `Intelligence renders #${fragment}`);
  assert.match(component, /Presenter-controlled/); assert.match(component, /prefers-reduced-motion/); assert.match(component, /min-w-\[980px\]/); assert.match(component, /it does not simulate provider calls or send email/);
  assert.match(component, /Coaching scenario/); assert.match(component, /Targeting scenario/); assert.match(component, /illustrative, not a forecast/); assert.match(component, /illustrative, not measured/);
});

test("illustrative rate scenarios calculate their visible deltas rather than hardcoding outcomes", () => {
  assert.deepEqual(rateScenario({ volume: 40, baselineRate: 0.2, scenarioRate: 0.225 }), { baselineOutcomes: 8, scenarioOutcomes: 9, additionalOutcomes: 1 });
  assert.deepEqual(rateScenario({ volume: 200, baselineRate: 0.05, scenarioRate: 0.06 }), { baselineOutcomes: 10, scenarioOutcomes: 12, additionalOutcomes: 2 });
});

test("campaign proof is tied to the immutable demo id and exact zero-send guardrail", () => {
  assert.equal(findDemoCampaign([campaign()]).status, "verified");
  assert.equal(findDemoCampaign([campaign({ id: "lookalike" })]).status, "missing");
  assert.deepEqual(campaignSafety(campaign()), { verified: true, summary: "1 queued · 0 sent", detail: "The exact hackathon campaign is paused until 2099, with zero delivery attempts." });
  assert.equal(campaignSafety(campaign({ status: "running" })).verified, false);
  assert.equal(campaignSafety(campaign({ counts: { queued: 0, running: 0, sent: 1, retryable: 0, failed: 0, reconcile: 0 } })).verified, false);
  assert.equal(campaignSafety(campaign({ items: [{ ...campaign().items[0], attempt_count: 1 }] })).verified, false);
  assert.equal(campaignSafety(campaign({ counts: { queued: 2, running: 0, sent: 0, retryable: 0, failed: 0, reconcile: 0 } })).verified, false);
  for (const state of ["running", "retryable", "failed", "reconcile"]) {
    assert.equal(campaignSafety(campaign({ counts: { ...campaign().counts, queued: 1, [state]: 1 } })).verified, false);
  }
  assert.equal(campaignSafety(campaign({ items: [{ ...campaign().items[0], receipt: { id: "sent" } }] })).verified, false);
  assert.equal(campaignSafety(campaign({ items: [{ ...campaign().items[0], reconciliation_required: true }] })).verified, false);
  assert.equal(campaignSafety(campaign({ items: [{ ...campaign().items[0], last_attempt_at: "2026-01-01T00:00:00Z" }] })).verified, false);
  assert.equal(campaignSafety(campaign({ items: [{ ...campaign().items[0], retryable: true }] })).verified, false);
  assert.equal(campaignSafety(campaign({ scheduled_for: "2026-01-01T00:00:00Z" })).verified, false);
  assert.equal(campaignSafety(campaign({ scheduled_for: "not-a-date" })).verified, false);
});

test("ICP presentation claims require a substantive cohort, citations, and brief", () => {
  const evidence = ["industry", "headcount_band", "contact_role", "trigger"].map((attribute) => ({ attribute, deal_ids: ["deal-1"], why: "Won deals support it" }));
  const profile = { id: "icp-1", version: 1, profile: { summary: "Observed wins", industries: ["Services"], headcount_band: "25-80", roles: ["Founder"], triggers: ["Renewal"], confidence: 0.9, origami_brief: "Find similar firms", source_summary: { deals: 3, calls: 2, emails: 1, outcome_labelled: 3 } }, evidence };
  assert.deepEqual(icpClaimSafety(profile), { cohort: true, citedProfile: true, brief: true });
  assert.equal(icpClaimSafety({ ...profile, profile: { ...profile.profile, source_summary: { deals: 0, calls: 0, emails: 0, outcome_labelled: 0 } } }).cohort, false);
  assert.equal(icpClaimSafety({ ...profile, evidence: [] }).citedProfile, false);
  assert.equal(icpClaimSafety({ ...profile, evidence: [{ attribute: "industry", deal_ids: [], why: "Won deals support it" }] }).citedProfile, false);
  assert.equal(icpClaimSafety({ ...profile, evidence: evidence.filter((item) => item.attribute !== "headcount_band") }).citedProfile, false);
  assert.equal(icpClaimSafety({ ...profile, evidence: evidence.filter((item) => item.attribute !== "trigger") }).brief, false);
  assert.equal(icpClaimSafety({ ...profile, profile: { ...profile.profile, roles: [] } }).brief, false);
  assert.equal(icpClaimSafety({ ...profile, profile: { ...profile.profile, triggers: ["  "] } }).brief, false);
  assert.equal(icpClaimSafety({ ...profile, profile: { ...profile.profile, origami_brief: "   " } }).brief, false);
});

test("presenter state restores only valid selections and reduced-motion stepping wraps deliberately", () => {
  assert.equal(parseStoredStep(null, 7), -1);
  assert.equal(parseStoredStep("", 7), -1);
  assert.equal(parseStoredStep("0", 7), 0);
  assert.equal(parseStoredStep("6", 7), 6);
  assert.equal(parseStoredStep("7", 7), -1);
  assert.equal(parseStoredStep("1.5", 7), -1);
  assert.equal(nextPresenterStep(-1, 7), 0);
  assert.equal(nextPresenterStep(0, 7), 1);
  assert.equal(nextPresenterStep(6, 7), 0);
  assert.equal(playbackLabel(true, false, -1, 7), "Start loop");
  assert.equal(playbackLabel(true, false, 2, 7), "Next step");
  assert.equal(playbackLabel(true, false, 6, 7), "Restart loop");
  assert.equal(playbackLabel(false, true, 2, 7), "Pause guided loop");
  assert.equal(playbackLabel(false, false, 6, 7), "Restart guided loop");
});

test("partial endpoint failure removes only the proof that could not be refreshed", () => {
  const proof = settleDemoProof(
    { status: "fulfilled", value: { revision: "abc123", environment: "production", storage: "memory", integrations: {} } },
    { status: "rejected", reason: new Error("offline") },
    { status: "fulfilled", value: [campaign()] },
  );
  assert.equal(proof.runtime.status, "verified");
  assert.equal(proof.icp.status, "failed");
  assert.equal(proof.campaign.status, "verified");
  assert.match(proofFooter(proof), /ICP unavailable/);
  assert.match(proofFooter(proof), /campaign guardrail verified/);
});

test("provider labels and partial failures stay truthful", () => {
  assert.equal(modelLabel("local", "qwen2.5:7b"), "Local · qwen2.5:7b");
  assert.equal(modelLabel("openrouter", "qwen2.5:7b"), "OpenRouter · qwen2.5:7b");
  assert.equal(modelLabel(undefined, "qwen2.5:7b"), "Proof unavailable");
  assert.equal(modelLabel("  ", "qwen2.5:7b"), "Proof unavailable");
  assert.equal(modelLabel("local", "  "), "Proof unavailable");
  const footer = proofFooter({ runtime: { status: "failed" }, icp: { status: "missing" }, campaign: { status: "failed" } });
  assert.equal(footer, "runtime unavailable · ICP unavailable · campaign unavailable");
  assert.doesNotMatch(footer, /verified|status checked|13 CRM/);
});
