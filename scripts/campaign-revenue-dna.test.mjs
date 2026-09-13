import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("campaigns carries the live Revenue DNA spending boundary into outreach", async () => {
  const [route, list, execution, demoScript] = await Promise.all([
    readFile(new URL("app/legacy/(app)/campaigns/page.tsx", root), "utf8"),
    readFile(new URL("components/legacy/campaigns/CampaignsList.tsx", root), "utf8"),
    readFile(new URL("components/legacy/campaigns/LiveCampaignRuns.tsx", root), "utf8"),
    readFile(new URL("docs/demo-script.md", root), "utf8"),
  ]);

  assert.match(route, /getIcpFreshness\(\)/);
  assert.match(route, /Promise\.allSettled/);
  assert.match(route, /initialFreshness=\{initialFreshness\}/);
  assert.match(route, /initialFreshnessError=\{initialFreshnessError\}/);
  assert.match(list, /initialFreshness=\{initialFreshness\}/);
  assert.match(list, /initialFreshnessError=\{initialFreshnessError\}/);

  assert.match(execution, /Revenue DNA spend gate/);
  assert.match(execution, /current_cohort_revision/);
  assert.match(execution, /leads_needing_rescore/);
  assert.match(execution, /Sourcing blocked/);
  assert.match(execution, /\/intelligence#revenue-dna/);
  assert.doesNotMatch(execution, /method:\s*["']POST/);
  assert.match(demoScript, /live `Revenue DNA spend gate`/);
  assert.match(demoScript, /Do not resume or send the campaign on stage/);
});
