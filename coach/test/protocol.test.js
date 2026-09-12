const test = require("node:test");
const assert = require("node:assert/strict");
const { coachWebSocketUrl, normalizeConfig, turnPayload } = require("../src/protocol");

test("normalizes a production coach session without accepting insecure remote APIs", () => {
  const config = normalizeConfig({ subject: "Acme discovery", repName: "Sam", mode: "demo" });
  assert.equal(config.apiBase, "https://slipstream-api.3-104-149-193.sslip.io");
  assert.equal(coachWebSocketUrl(config.apiBase), "wss://slipstream-api.3-104-149-193.sslip.io/api/v1/coach/live");
  assert.throws(() => normalizeConfig({ apiBase: "http://example.com", subject: "x", repName: "y" }), /HTTPS/);
});

test("builds ordered, bounded transcript events", () => {
  const turn = turnPayload(2, "prospect", "  We lose twelve hours each week.  ", Date.now());
  assert.equal(turn.sequence, 2);
  assert.equal(turn.role, "prospect");
  assert.equal(turn.text, "We lose twelve hours each week.");
  assert.ok(turn.start_ms >= 0);
  assert.throws(() => turnPayload(3, "unknown", "hello", Date.now()), /Speaker/);
  assert.throws(() => turnPayload(3, "rep", " ".repeat(3), Date.now()), /Transcript/);
});

