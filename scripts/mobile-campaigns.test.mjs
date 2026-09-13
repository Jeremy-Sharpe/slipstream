import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("campaign workspace contains its dense table on phones", async () => {
  const [list, dialog, live] = await Promise.all([
    readFile(new URL("components/legacy/campaigns/CampaignsList.tsx", root), "utf8"),
    readFile(new URL("components/legacy/campaigns/NewCampaignDialog.tsx", root), "utf8"),
    readFile(new URL("components/legacy/campaigns/LiveCampaignRuns.tsx", root), "utf8"),
  ]);

  assert.match(list, /flex flex-col items-stretch[^"\n]+sm:flex-row/);
  assert.match(list, /overflow-x-auto border-t border-border/);
  assert.match(list, /min-w-\[980px\]/);
  assert.match(dialog, /aria-label="New campaign"/);
  assert.match(live, /mx-4[^"\n]+sm:mx-11/);
});
