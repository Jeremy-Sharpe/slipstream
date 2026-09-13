import assert from "node:assert/strict";
import test from "node:test";
import { parseTranscript } from "../lib/transcript.ts";

test("speaker labels with a company in brackets split into one turn per line", () => {
  const { turns, speakers } = parseTranscript([
    "Sam (Eleno): How do quotes reach your team today?",
    "Priya Raman (Coastline Freight): By email, about 300 a week.",
    "Sam (Eleno): Who signs off over 50 thousand?",
  ].join("\n"));
  assert.deepEqual(speakers, ["Sam", "Priya Raman"]);
  assert.equal(turns.length, 3);
  assert.deepEqual(turns[1], { speaker: "Priya Raman", text: "By email, about 300 a week." });
});

test("timestamped and plain labels still parse", () => {
  const { turns } = parseTranscript("[00:12] Sam: Hi Priya.\nPriya (0:15): Hi Sam.\nSam: Thanks for the time.");
  assert.deepEqual(turns.map((turn) => turn.speaker), ["Sam", "Priya", "Sam"]);
  assert.equal(turns[1].text, "Hi Sam.");
});

test("unlabelled text stays one prospect turn", () => {
  const { turns, speakers } = parseTranscript("just some notes from the call without speaker labels");
  assert.deepEqual(speakers, ["Prospect"]);
  assert.equal(turns.length, 1);
});
