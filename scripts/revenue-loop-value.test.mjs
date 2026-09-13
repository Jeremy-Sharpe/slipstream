import assert from "node:assert/strict";
import test from "node:test";
import { rateScenario } from "../lib/demo/revenue-loop.ts";

test("illustrative rate scenarios calculate their visible deltas rather than hardcoding outcomes", () => {
  assert.deepEqual(rateScenario({ volume: 40, baselineRate: 0.2, scenarioRate: 0.225 }), { baselineOutcomes: 8, scenarioOutcomes: 9, additionalOutcomes: 1 });
  assert.deepEqual(rateScenario({ volume: 200, baselineRate: 0.05, scenarioRate: 0.06 }), { baselineOutcomes: 10, scenarioOutcomes: 12, additionalOutcomes: 2 });
});
