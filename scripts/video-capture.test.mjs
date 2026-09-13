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

test("judge-facing handoff points consistently to the published v2 walkthrough", async () => {
  const [readme, checklist, status, board, videoReadme] = await Promise.all([
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("docs/submission-checklist.md", root), "utf8"),
    readFile(new URL("STATUS.md", root), "utf8"),
    readFile(new URL("BOARD.md", root), "utf8"),
    readFile(new URL("docs/video/README.md", root), "utf8"),
  ]);

  const publishedUrl = "https://github.com/Jeremy-Sharpe/slipstream/releases/download/demo-video-v2/slipstream-demo-v2.mp4";
  assert.match(readme, new RegExp(publishedUrl.replaceAll(".", "\\.")));
  assert.match(videoReadme, new RegExp(publishedUrl.replaceAll(".", "\\.")));

  for (const [name, text] of [["submission checklist", checklist], ["status", status], ["board", board]]) {
    assert.match(text, /3:48/, `${name} should state the published duration`);
    assert.match(text, /Revenue DNA/i, `${name} should name the walkthrough's hook`);
  }

  assert.doesNotMatch(checklist, /all 361 tests|public fallback video is 4:30/);
  assert.doesNotMatch(status, /public 4:30 fallback video is already linked/);
  assert.doesNotMatch(board, /evals:dry` passes and 292 API tests pass/);
  assert.match(status, /367 API tests and 52 smoke tests pass/);
  assert.match(board, /367 API tests and 52 smoke tests pass/);
});
