import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = new URL("../app/(app)/campaigns/loading.tsx", import.meta.url);
const skeleton = new URL(
  "../components/campaigns/CampaignsLoading.tsx",
  import.meta.url,
);

test("campaign route fallback cannot mount a second live API reader", async () => {
  const [routeSource, skeletonSource] = await Promise.all([
    readFile(route, "utf8"),
    readFile(skeleton, "utf8"),
  ]);
  const combined = `${routeSource}\n${skeletonSource}`;

  assert.doesNotMatch(combined, /CampaignsList|LiveCampaignRuns|getCampaigns|useEffect/);
  assert.doesNotMatch(combined, /["']use client["']/);
  assert.match(skeletonSource, /aria-busy="true"/);
  assert.match(skeletonSource, /aria-label="Loading campaigns"/);
});
