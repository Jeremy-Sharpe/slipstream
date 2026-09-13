import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("stage demo tells the complete loop with live proof and artifact links", async () => {
  const [page, component, sidebar] = await Promise.all([
    readFile(path.join(root, "app/(app)/demo/page.tsx"), "utf8"),
    readFile(path.join(root, "components/demo/RevenueLoop.tsx"), "utf8"),
    readFile(path.join(root, "components/shell/Sidebar.tsx"), "utf8"),
  ]);

  assert.match(page, /RevenueLoop/);
  assert.match(sidebar, /href: "\/demo", label: "Revenue loop"/);
  for (const call of ["getReadiness", "getLatestIcp", "getCampaigns"]) {
    assert.ok(component.includes(`${call}(`), `demo fetches ${call}`);
  }
  for (const href of [
    "/conversations/call-01-northstar-labs",
    "/intelligence",
    "/leads",
    "/campaigns",
  ]) {
    assert.ok(component.includes(href), `demo links to ${href}`);
  }
  assert.match(component, /it does not simulate provider calls or send email/);
  assert.match(component, /One call compounds into/);
});
