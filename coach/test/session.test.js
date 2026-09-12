const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const WebSocket = require("ws");
const { CoachSession, validServerEvent } = require("../src/session");

class FakeSocket extends EventEmitter {
  static instances = [];

  constructor(url, options) {
    super();
    this.url = url;
    this.options = options;
    this.readyState = WebSocket.CONNECTING;
    this.sent = [];
    FakeSocket.instances.push(this);
  }

  open() {
    this.readyState = WebSocket.OPEN;
    this.emit("open");
  }

  receive(value) {
    this.emit("message", Buffer.from(JSON.stringify(value)));
  }

  send(value) {
    this.sent.push(JSON.parse(value));
  }

  close() {
    this.readyState = WebSocket.CLOSED;
  }

  finishClose() {
    this.emit("close");
  }
}

function startReady(session, input = {}) {
  const pending = session.start({ subject: "Acme discovery", repName: "Sam", ...input });
  const socket = FakeSocket.instances.at(-1);
  socket.open();
  socket.receive({ type: "ready", session_id: "session-1" });
  return { pending, socket };
}

test.beforeEach(() => { FakeSocket.instances = []; });

test("rejects malformed server values instead of dereferencing them", () => {
  assert.equal(validServerEvent(null), false);
  assert.equal(validServerEvent([]), false);
  assert.equal(validServerEvent({ type: "ready" }), false);
  assert.equal(validServerEvent({ type: "error", detail: "bad" }), true);
});

test("starts, orders turns, and prevents writes while a call is finishing", async () => {
  const session = new CoachSession({ WebSocketImpl: FakeSocket });
  const { pending, socket } = startReady(session);
  const result = await pending;
  assert.equal(result.sourceExternalId.startsWith("coach-"), true);
  assert.equal(socket.options.maxPayload, 64 * 1024);
  assert.equal(socket.sent[0].type, "start");
  assert.equal(session.sendTurn({ role: "prospect", text: "We need this now" }).sequence, 0);
  assert.equal(session.stop(), true);
  assert.equal(session.stop(), false);
  assert.throws(() => session.sendTurn({ role: "rep", text: "Understood" }), /finishing/);
  socket.receive({ type: "error", code: "persistence_failed", detail: "retry" });
  assert.equal(session.stop(), true);
});

test("a delayed old close emits nothing and cannot clear a replacement session", async () => {
  const session = new CoachSession({ WebSocketImpl: FakeSocket });
  const events = [];
  session.on("event", (event) => events.push(event));
  const first = startReady(session);
  await first.pending;
  session.close();
  const countBeforeOldClose = events.length;
  const second = startReady(session, { subject: "Second call" });
  await second.pending;
  first.socket.finishClose();
  assert.equal(session.socket, second.socket);
  assert.equal(session.operation.config.subject, "Second call");
  assert.equal(events.length, countBeforeOldClose + 1);
});

test("clean close before ready rejects and releases state", async () => {
  const session = new CoachSession({ WebSocketImpl: FakeSocket });
  const pending = session.start({ subject: "Acme discovery", repName: "Sam" });
  FakeSocket.instances.at(-1).finishClose();
  await assert.rejects(pending, /closed before it was ready/);
  assert.equal(session.socket, null);
  assert.equal(session.operation, null);
});

test("explicit cancellation before ready settles startup immediately", async () => {
  const session = new CoachSession({ WebSocketImpl: FakeSocket, timeoutMs: 60_000 });
  const pending = session.start({ subject: "Acme discovery", repName: "Sam" });
  session.close();
  await assert.rejects(pending, /cancelled or timed out/);
  assert.equal(session.operation, null);
});

test("failed connection releases state so the user can retry", async () => {
  const session = new CoachSession({ WebSocketImpl: FakeSocket });
  const pending = session.start({ subject: "Acme discovery", repName: "Sam" });
  FakeSocket.instances.at(-1).emit("error", new Error("offline"));
  await assert.rejects(pending, /Could not connect/);
  assert.equal(session.socket, null);
  assert.equal(session.operation, null);
});

test("microphone token fetch is single-flight, cancellable, and rejects redirects", async () => {
  let resolveFetch;
  let options;
  const fetchImpl = (_url, receivedOptions) => {
    options = receivedOptions;
    return new Promise((resolve) => { resolveFetch = resolve; });
  };
  const session = new CoachSession({ WebSocketImpl: FakeSocket, fetchImpl });
  const pending = session.start({ subject: "Acme", repName: "Sam", mode: "microphone" });
  await assert.rejects(
    session.start({ subject: "Duplicate", repName: "Sam", mode: "microphone" }),
    /already active or starting/,
  );
  assert.equal(options.redirect, "error");
  assert.equal(options.signal.aborted, false);
  session.close();
  assert.equal(options.signal.aborted, true);
  resolveFetch({ ok: true, json: async () => ({ token: "single-use" }) });
  await assert.rejects(pending, /cancelled or timed out/);
  assert.equal(FakeSocket.instances.length, 0);
});
