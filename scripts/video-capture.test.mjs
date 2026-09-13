import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("fallback video tells the live Revenue DNA loop without mutating production", async () => {
  const [capture, narration] = await Promise.all([
    readFile(new URL("docs/video/capture.mjs", root), "utf8"),
    readFile(new URL("docs/video/narration.txt", root), "utf8"),
  ]);

  assert.doesNotMatch(capture, /data:text\/html|page\.request|method:\s*["']POST/);
  assert.match(capture, /page\.locator\(["']#revenue-dna["']\)/);
  assert.match(capture, /name:\s*["']New deal won["']/);
  assert.match(capture, /Hackathon demo — intentionally unsent/);
  assert.match(narration, /This is the original mechanic: Revenue DNA\./);
  assert.match(narration, /zero sends, zero attempts/);

  const words = narration.trim().split(/\s+/).length;
  assert.ok(words >= 400 && words <= 525, `narration has ${words} words`);
});
