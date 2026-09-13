import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("conversation detail collapses its desktop chrome and CRM columns on phones", async () => {
  const [header, detail] = await Promise.all([
    readFile(new URL("components/legacy/conversations/detail/DetailHeader.tsx", root), "utf8"),
    readFile(new URL("components/legacy/conversations/detail/ConversationDetail.tsx", root), "utf8"),
  ]);

  assert.match(header, /hidden items-center[^"\n]+sm:flex/);
  assert.match(header, /aria-label="Open in HubSpot"/);
  assert.match(header, /hidden sm:inline">Open in HubSpot/);
  assert.match(detail, /grid flex-1 grid-cols-1[^"\n]+lg:grid-cols-/);
  assert.match(detail, /lg:sticky lg:top-6/);
});
