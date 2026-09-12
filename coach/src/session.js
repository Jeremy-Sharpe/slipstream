const { EventEmitter } = require("node:events");
const WebSocket = require("ws");
const { normalizeConfig, coachWebSocketUrl, turnPayload } = require("./protocol");

const SERVER_EVENT_TYPES = new Set(["ready", "committed", "suggestion", "completed", "error"]);

function validServerEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !SERVER_EVENT_TYPES.has(value.type)) return false;
  if (value.type === "ready") return typeof value.session_id === "string" && value.session_id.length <= 200;
  if (value.type === "error") return typeof value.detail === "string" && value.detail.length <= 2000;
  if (value.type === "suggestion") {
    return typeof value.message === "string" && value.message.length <= 4000
      && (value.title === undefined || (typeof value.title === "string" && value.title.length <= 200));
  }
  return true;
}

class CoachSession extends EventEmitter {
  constructor({ WebSocketImpl = WebSocket, fetchImpl = fetch, timeoutMs = 10000 } = {}) {
    super();
    this.WebSocketImpl = WebSocketImpl;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.socket = null;
    this.sequence = 0;
    this.startedAt = 0;
    this.operation = null;
    this.generation = 0;
    this.stopping = false;
  }

  async start(input) {
    if (this.operation) throw new Error("A coaching session is already active or starting");
    const config = normalizeConfig(input);
    const operation = {
      generation: ++this.generation,
      config,
      abortController: new AbortController(),
      socket: null,
    };
    this.operation = operation;
    this.sequence = 0;
    this.startedAt = Date.now();
    this.stopping = false;

    try {
      let scribe = null;
      if (config.mode === "microphone") scribe = await this.fetchScribeToken(operation);
      this.assertCurrent(operation);
      await this.connect(operation);
      this.assertCurrent(operation);
      return { mode: config.mode, scribe, sourceExternalId: config.sourceExternalId };
    } catch (error) {
      if (this.operation === operation) this.close(operation);
      if (error?.name === "AbortError") throw new Error("Coach startup was cancelled or timed out");
      throw error;
    }
  }

  async fetchScribeToken(operation) {
    const { config, abortController } = operation;
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${config.apiBase}/api/v1/coach/scribe-token`, {
        method: "POST",
        redirect: "error",
        signal: abortController.signal,
        headers: config.ingestToken ? { "X-Slipstream-Ingest-Token": config.ingestToken } : {},
      });
      const payload = await response.json().catch(() => ({}));
      this.assertCurrent(operation);
      if (!response.ok) throw new Error(payload.detail || `Transcription service returned ${response.status}`);
      if (typeof payload.token !== "string" || !payload.token) throw new Error("Transcription service returned no token");
      return { token: payload.token, modelId: payload.model_id, websocketUrl: payload.websocket_url };
    } finally {
      clearTimeout(timeout);
    }
  }

  assertCurrent(operation) {
    if (this.operation !== operation || operation.abortController.signal.aborted) {
      throw new DOMException("Coach startup cancelled", "AbortError");
    }
  }

  connect(operation) {
    const { config } = operation;
    return new Promise((resolve, reject) => {
      const socket = new this.WebSocketImpl(coachWebSocketUrl(config.apiBase), { maxPayload: 64 * 1024 });
      operation.socket = socket;
      this.socket = socket;
      let ready = false;
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        operation.abortController.signal.removeEventListener("abort", aborted);
        if (error) reject(error); else resolve();
      };
      const isCurrent = () => this.operation === operation && this.socket === socket;
      const aborted = () => finish(new DOMException("Coach startup cancelled", "AbortError"));
      const timeout = setTimeout(() => {
        if (!isCurrent()) return;
        finish(new Error("Coach connection timed out"));
        socket.close();
      }, this.timeoutMs);
      operation.abortController.signal.addEventListener("abort", aborted, { once: true });

      socket.on("open", () => {
        if (!isCurrent()) return;
        socket.send(JSON.stringify({
          type: "start",
          source_external_id: config.sourceExternalId,
          subject: config.subject,
          occurred_at: new Date().toISOString(),
          rep_name: config.repName,
          deal_context: config.dealContext || null,
          ingest_token: config.ingestToken || null,
        }));
      });
      socket.on("message", (raw) => {
        if (!isCurrent()) return;
        let message;
        try {
          message = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (!validServerEvent(message)) {
          this.emitEvent(operation, { type: "error", detail: "Coach returned an invalid event" });
          return;
        }
        if (message.type === "ready" && !ready) {
          ready = true;
          finish();
        }
        if (message.type === "error" && !ready) {
          finish(new Error(message.detail || "Coach rejected the session"));
          socket.close();
          return;
        }
        if (message.type === "error" && ["empty_call", "persistence_failed"].includes(message.code)) {
          this.stopping = false;
        }
        this.emitEvent(operation, message);
        if (message.type === "completed") this.close(operation);
      });
      socket.on("error", (error) => {
        if (!isCurrent()) return;
        if (!ready) finish(new Error("Could not connect to the coaching API"));
        else this.emitEvent(operation, { type: "error", detail: String(error.message || "Coach connection failed").slice(0, 2000) });
      });
      socket.on("close", () => {
        if (!isCurrent()) return;
        if (!ready) finish(new Error("Coach connection closed before it was ready"));
        this.reset(operation);
        this.emit("event", { type: "connection_closed", source_external_id: config.sourceExternalId });
      });
    });
  }

  emitEvent(operation, message) {
    if (this.operation !== operation) return;
    this.emit("event", { ...message, source_external_id: operation.config.sourceExternalId });
  }

  sendTurn({ role, text }) {
    if (!this.operation || !this.socket || this.socket.readyState !== WebSocket.OPEN) throw new Error("Coach session is not connected");
    if (this.stopping) throw new Error("Coach session is finishing");
    const payload = turnPayload(this.sequence, role, text, this.startedAt);
    this.socket.send(JSON.stringify(payload));
    this.sequence += 1;
    return payload;
  }

  stop() {
    if (!this.operation || !this.socket || this.socket.readyState !== WebSocket.OPEN || this.stopping) return false;
    this.stopping = true;
    this.socket.send(JSON.stringify({ type: "stop" }));
    return true;
  }

  close(expectedOperation = this.operation) {
    if (!expectedOperation || this.operation !== expectedOperation) return false;
    expectedOperation.abortController.abort();
    const socket = expectedOperation.socket;
    this.reset(expectedOperation);
    if (socket) socket.close();
    return true;
  }

  reset(operation) {
    if (this.operation !== operation) return;
    this.operation = null;
    this.socket = null;
    this.stopping = false;
  }
}

module.exports = { CoachSession, validServerEvent };
