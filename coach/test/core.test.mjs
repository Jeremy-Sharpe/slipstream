import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Outbox } from "../src/session.mjs";
import { pcm16, wavHeader } from "../src/pcm.mjs";
const { visibleBounds, parseLaunch, origin } = createRequire(import.meta.url)("../src/window.cjs");
test("Disconnected monitor restores a visible window and clamps oversized bounds", () => {
  assert.deepEqual(
    visibleBounds({ x: 2500, y: 300, width: 1000, height: 1800 }, [
      { x: 0, y: 25, width: 800, height: 575 },
    ]),
    { x: 0, y: 25, width: 800, height: 575 },
  );
});
test("Initial overlay is top-right, not beyond the menu bar", () => {
  assert.deepEqual(visibleBounds(null, [{ x: 0, y: 25, width: 1440, height: 875 }]), {
    width: 360,
    height: 420,
    x: 1060,
    y: 53,
  });
});
test("Handoff URL cannot select an arbitrary protocol", () => {
  assert.throws(() => parseLaunch("https://evil.example/?token=a"));
  assert.throws(() => origin("http://external.example"));
  assert.throws(() => origin("https://user:pass@example.com"));
  assert.equal(origin("http://localhost:8000"), "http://localhost:8000");
});
test("Launch link can name any HTTPS deployment, never an insecure remote one", () => {
  const session = "0f8fad5b-d9cb-469f-a165-70867728950e";
  const token = "a".repeat(43);
  const base = `slipstream://coach?session=${session}&token=${token}`;
  assert.deepEqual(parseLaunch(base), { id: session, handoff: token, api: null, web: null });
  assert.deepEqual(
    parseLaunch(`${base}&api=https://api.example.com&web=https://app.example.com/`),
    { id: session, handoff: token, api: "https://api.example.com", web: "https://app.example.com" },
  );
  assert.equal(parseLaunch(`${base}&api=http://localhost:8000`).api, "http://localhost:8000");
  assert.throws(() => parseLaunch(`${base}&api=http://api.example.com`));
  assert.throws(() => parseLaunch(`${base}&api=https://api.example.com/steal`));
});
test("PCM clips rather than wrapping and WAV header is consistent", () => {
  const bytes = pcm16([-2, 0, 2]);
  const view = new DataView(bytes.buffer);
  assert.equal(view.getInt16(0, true), -32768);
  assert.equal(view.getInt16(4, true), 32767);
  const header = new DataView(wavHeader(8000).buffer);
  assert.equal(header.getUint32(40, true), 8000);
  assert.equal(header.getUint32(24, true), 16000);
});
test("Reconnect sends only unacknowledged transcript, preserving both channels", () => {
  const outbox = new Outbox();
  const first = outbox.append({ text: "Question", role: "rep", start_ms: 0, end_ms: 100 });
  outbox.append({ text: "Answer", role: "prospect", start_ms: 80, end_ms: 200 });
  outbox.restore([first]);
  assert.equal(outbox.pending().length, 1);
  outbox.acknowledge(1);
  assert.equal(outbox.pending().length, 0);
  outbox.acknowledge(0);
  assert.equal(outbox.cursor, 2);
});
test("Server conflict is explicit; an action keeps its id until acknowledged", () => {
  const outbox = new Outbox();
  outbox.append({ text: "One", role: "rep", start_ms: 0, end_ms: 10 });
  assert.throws(() =>
    outbox.restore([{ text: "Two", role: "rep", sequence: 0, start_ms: 0, end_ms: 10 }]),
  );
  const action = outbox.action("skip", "question");
  assert.equal(outbox.actions[0].action_id, action.action_id);
  outbox.ackAction(action.action_id);
  assert.equal(outbox.actions.length, 0);
});
