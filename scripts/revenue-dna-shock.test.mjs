import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { simulateRevenueDnaShock } from "../lib/legacy/revenue-dna.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("outcome shock exposes the complete non-mutating Revenue DNA propagation", async () => {
  assert.deepEqual(simulateRevenueDnaShock("won", 3, 10), {
    outcome: "won",
    direction: "Strengthens the new account pattern",
    staleProfile: "ICP v3 becomes stale",
    affectedLeads: 10,
    sourcingState: "New sourcing pauses before provider spend",
    nextProfile: "Relearn produces ICP v4",
  });
  assert.equal(simulateRevenueDnaShock("lost", 3, 10).direction, "Challenges the current target pattern");
  assert.equal(simulateRevenueDnaShock("lost", Number.NaN, -4).affectedLeads, 0);

  const section = await readFile(path.join(root, "components/legacy/intelligence/sections.tsx"), "utf8");
  assert.match(section, /Presenter-safe simulation · does not write to the CRM or call a provider/);
  assert.match(section, /Live state remains unchanged/);
  for (const step of ["Signal", "Detect", "Protect", "Adapt"]) assert.match(section, new RegExp(step));
});
