import { AudioCapture } from "./audio.mjs";
import { Outbox } from "./session.mjs";
const $ = (id) => document.getElementById(id);
let current,
  settings,
  row,
  outbox,
  socket,
  audio,
  recordingQueue = Promise.resolve(),
  checkpointQueue = Promise.resolve();
let busy = false,
  ending = false,
  pendingPause = false,
  collapsed = false,
  retries = 0,
  reconnectTimer,
  disconnectTimer,
  heartbeat,
  connectGeneration = 0;
let startedAt = Date.now(),
  cardSignature = "",
  lastSignal = {},
  captureActive = false,
  sessionRejected = false,
  recordingLimited = false;
const showError = (message) => {
  $("error").textContent = message;
  $("error").hidden = !message;
};
const status = (value) => {
  $("status").textContent = value;
};
function send(event) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
}
function checkpoint() {
  if (!current) return;
  const state = {
    id: current.id,
    turns: [...outbox.turns],
    actions: [...outbox.actions],
    status: row?.status || current.status,
  };
  checkpointQueue = checkpointQueue
    .catch(() => {})
    .then(() => window.coach.checkpoint(state))
    .catch((error) => showError(error.message));
}
function render() {
  if (!row) return;
  $("start").disabled = busy || ending;
  $("pause").disabled = ending;
  $("end").disabled = ending;
  $("setup").hidden = true;
  $("call").hidden = row.status === "ended";
  $("ended").hidden = row.status !== "ended";
  $("controls").hidden = row.status === "ended";
  $("customer").textContent =
    row.context.customer.name +
    (row.context.customer.company ? " · " + row.context.customer.company : "");
  $("brief").textContent = row.context.brief;
  $("start").hidden = row.status === "ended" || captureActive;
  $("start").textContent = row.status === "ready" ? "Start listening" : "Resume listening";
  $("pause").hidden = !captureActive;
  $("end").hidden = row.status === "ended";
  $("undo").disabled = !row.state.undo.length;
  const active = row.state.suggestions.find((item) => item.status === "shown");
  const signature = active ? JSON.stringify(active) : "";
  if (cardSignature !== signature) {
    cardSignature = signature;
    $("advice").replaceChildren();
    if (active) {
      const card = document.createElement("article");
      card.className = "card";
      const label = document.createElement("div");
      label.className = "eyebrow";
      label.textContent = active.kind === "ask" ? "ASK NEXT" : "MENTION";
      const text = document.createElement("p");
      text.className = "question";
      text.textContent = active.text;
      const actions = document.createElement("div");
      actions.className = "actions";
      for (const [label, action] of [
        ["Done", "done"],
        ["Skip", "skip"],
      ]) {
        const button = document.createElement("button");
        button.textContent = label;
        button.onclick = () => {
          // One decision per card; the next snapshot redraws the buttons.
          for (const sibling of actions.querySelectorAll("button")) sibling.disabled = true;
          act(action, active.id);
        };
        actions.append(button);
      }
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Why this?";
      details.append(summary);
      const reason = document.createElement("p");
      reason.className = "evidence";
      reason.textContent = active.reason;
      details.append(reason);
      for (const id of active.evidence_ids) {
        const source = row.context.sources.find((s) => s.id === id);
        const turn = id.startsWith("turn:") ? row.state.turns[Number(id.slice(5))] : null;
        if (source || turn) {
          const quote = document.createElement("blockquote");
          quote.className = "evidence";
          quote.textContent = source
            ? `${source.label}: ${source.text}`
            : `${turn.role}: ${turn.text}`;
          details.append(quote);
        }
      }
      card.append(label, text, actions, details);
      $("advice").append(card);
    }
  }
  $("waiting").hidden = Boolean(active);
  if (!active && row.status !== "ready")
    $("waiting").lastElementChild.textContent =
      "Listening for the next useful question. Covered questions stay in the call history.";
  $("upcoming").replaceChildren();
  for (const item of row.state.suggestions.filter((s) => s.status === "queued").slice(0, 2)) {
    const next = document.createElement("div");
    next.className = "next";
    const label = document.createElement("span");
    label.textContent = "UP NEXT";
    const text = document.createElement("span");
    text.textContent = item.text;
    next.append(label, text);
    $("upcoming").append(next);
  }
  $("captured-section").hidden = !row.state.commitments.length;
  $("captured").replaceChildren();
  for (const item of row.state.commitments) {
    const li = document.createElement("li");
    li.textContent = item.text;
    $("captured").append(li);
  }
  $("transcript").replaceChildren();
  for (const turn of row.state.turns.slice(-80)) {
    const p = document.createElement("p");
    const speaker = document.createElement("b");
    speaker.textContent =
      turn.role === "rep" ? "You: " : turn.role === "prospect" ? "Customer: " : "Speaker: ";
    p.append(speaker, document.createTextNode(turn.text));
    $("transcript").append(p);
  }
  if (row.status === "ended") {
    status("Call saved");
    $("recording-note").textContent =
      row.recording_status === "stored"
        ? "Recording uploaded. The temporary local copy has been removed."
        : "Your recording remains on this computer. Export it if you need a copy.";
  }
}
function act(action, suggestion_id) {
  const event = outbox.action(action, suggestion_id);
  checkpoint();
  send(event);
}
function connect() {
  clearTimeout(reconnectTimer);
  clearInterval(heartbeat);
  const generation = ++connectGeneration;
  const url = new URL(settings.api + "/api/v1/coach/sessions/" + current.id + "/live");
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(url);
  socket.onopen = () => {
    send({ type: "auth", token: current.access });
    heartbeat = setInterval(() => send({ type: "ping" }), 10000);
  };
  socket.onmessage = (event) => {
    if (generation !== connectGeneration) return;
    try {
      const data = JSON.parse(event.data);
      if (data.type === "snapshot") {
        row = data.session;
        startedAt = Date.parse(row.created_at);
        outbox.restore(row.state.turns);
        retries = 0;
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
        for (const turn of outbox.pending()) send({ type: "transcript", turn });
        for (const action of outbox.actions) send(action);
        status(
          captureActive
            ? "Listening · live coach"
            : row.status === "ended"
              ? "Call saved"
              : "Ready · audio off",
        );
        checkpoint();
        render();
      } else if (data.type === "committed") {
        outbox.acknowledge(data.sequence);
        checkpoint();
      } else if (data.type === "action_ack") {
        outbox.ackAction(data.action_id);
        checkpoint();
      } else if (data.type === "error") showError(data.detail);
    } catch (error) {
      showError(error.message);
      pause();
    }
  };
  socket.onclose = (event) => {
    clearInterval(heartbeat);
    if (generation !== connectGeneration || row?.status === "ended") return;
    status("Reconnecting · advice may be out of date");
    if (event.code === 1008) {
      sessionRejected = true;
      showError(
        "Session connection rejected. Your transcript is retained; reopen the coach or end the call.",
      );
      pause();
      return;
    }
    reconnectTimer = setTimeout(connect, Math.min(10000, 1000 * 2 ** retries++));
    if (!disconnectTimer)
      disconnectTimer = setTimeout(() => {
        disconnectTimer = null;
        if (socket?.readyState !== WebSocket.OPEN) {
          showError("Connection unavailable. Audio paused; reconnect to resume.");
          pause();
        }
      }, 30000);
  };
}
async function activate(value) {
  if (ending || (current?.id === value.id && captureActive)) return;
  if (audio) await audio.stop();
  connectGeneration++;
  socket?.close();
  clearTimeout(reconnectTimer);
  clearTimeout(disconnectTimer);
  disconnectTimer = null;
  current = value;
  settings = value.settings;
  row = value.session || null;
  outbox = new Outbox(value.turns || [], value.actions || []);
  cardSignature = "";
  startedAt = row ? Date.parse(row.created_at) : Date.now();
  captureActive = false;
  sessionRejected = false;
  recordingLimited = false;
  ending = false;
  showError("");
  $("setup").hidden = true;
  status("Connecting to coach…");
  connect();
  if (row) render();
}
async function start() {
  if (busy || ending || captureActive || !row || row.status === "ended") return;
  pendingPause = false;
  busy = true;
  $("start").disabled = true;
  showError("");
  status("Connecting audio…");
  try {
    if (socket?.readyState !== WebSocket.OPEN)
      throw new Error("Wait for the coach connection before starting audio");
    send({ type: row.status === "ready" ? "start" : "resume" });
    lastSignal = { mic: Date.now(), system: Date.now() };
    audio = new AudioCapture({
      mode: row.audio_mode,
      token: () => window.coach.token(),
      clock: () => Date.now() - startedAt,
      onTurn: (turn) => {
        try {
          const event = outbox.append(turn);
          checkpoint();
          send({ type: "transcript", turn: event });
        } catch (error) {
          showError(error.message);
          pause();
        }
      },
      onLevel: (channel, level) => {
        $(channel + "-meter").value = level;
        if (level > 0.0005) lastSignal[channel] = Date.now();
      },
      onRecording: (bytes) => {
        if (recordingLimited) return;
        recordingQueue = recordingQueue
          .then(() => window.coach.recording(current.id, bytes))
          .then((result) => {
            if (!result?.limited || recordingLimited) return;
            recordingLimited = true;
            showError(
              "Recording limit reached (about 26 minutes). Coaching continues, and the call will be saved from the live transcript.",
            );
          })
          .catch((error) => {
            showError(error.message);
            pause();
          });
      },
      onError: (message) => {
        showError(message);
        pause();
      },
    });
    await audio.start();
    if (pendingPause) throw new Error("Audio connection interrupted; retry when ready.");
    captureActive = true;
    await window.coach.captureStatus(true);
    status("Listening · live coach");
    render();
    if (row.audio_mode !== "both")
      showError(
        "Mixed or single-source audio: speaker identity is uncertain. Done and Skip remain available.",
      );
  } catch (error) {
    showError(error.message);
    if (audio) await audio.stop();
    audio = null;
    send({ type: "pause" });
    status("Audio off");
  } finally {
    busy = false;
    pendingPause = false;
    $("start").disabled = ending;
    render();
  }
}
async function pause() {
  if (busy) {
    pendingPause = true;
    return;
  }
  if (!audio && !captureActive) return;
  busy = true;
  captureActive = false;
  try {
    if (audio) await audio.stop();
    audio = null;
    await window.coach.captureStatus(false);
    send({ type: "pause" });
    status("Paused · audio off");
  } finally {
    busy = false;
    render();
  }
}
async function end(skipRecording = false) {
  if (ending || !current || busy) return;
  ending = true;
  render();
  $("finish-options").hidden = true;
  status("Finishing call…");
  try {
    await pause();
    await recordingQueue;
    await checkpointQueue;
    // A rejected session can never acknowledge the outstanding transcript, so do not wait for it.
    const deadline = Date.now() + 10000;
    while (outbox.pending().length && !sessionRejected && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 100));
    if (outbox.pending().length && !sessionRejected)
      throw new Error(
        "Some transcript is waiting to sync. Reconnect and retry to save the full call.",
      );
    if (!skipRecording && !recordingLimited) {
      status("Saving recording…");
      await window.coach.upload();
    }
    const result = await window.coach.finish();
    if (result.orphaned) {
      row = row ? { ...row, status: "ended", recording_status: "not_uploaded" } : row;
      showError(
        "The server no longer has this call, so it was not saved there. Your recording is still on this computer; export it below.",
      );
    } else row = result;
    checkpoint();
    render();
    socket?.close();
    clearTimeout(reconnectTimer);
  } catch (error) {
    showError(error.message);
    $("finish-options").hidden = false;
    status("Audio off · save needs attention");
  } finally {
    ending = false;
    render();
  }
}
$("open").onclick = async () => {
  try {
    await window.coach.launch($("launch-link").value);
  } catch (error) {
    showError(error.message);
  }
};
$("save-settings").onclick = async () => {
  try {
    settings = await window.coach.settings({ api: $("api").value, web: $("web").value });
    showError("");
    status("Connections saved");
  } catch (error) {
    showError(error.message);
  }
};
$("start").onclick = start;
$("pause").onclick = pause;
$("end").onclick = () => end();
$("retry-finish").onclick = () => end();
$("finish-live").onclick = () => end(true);
$("undo").onclick = () => act("undo");
$("review").onclick = () => window.coach.review();
$("export").onclick = () => window.coach.export().catch((error) => showError(error.message));
$("collapse").onclick = () => {
  collapsed = !collapsed;
  document.body.classList.toggle("collapsed", collapsed);
  $("collapse").textContent = collapsed ? "+" : "−";
  $("collapse").setAttribute("aria-label", collapsed ? "Expand coach" : "Collapse coach");
  window.coach.window(collapsed ? "collapse" : "expand");
};
$("reset").onclick = () => window.coach.window("reset");
$("larger").onclick = () => window.coach.window("grow");
$("smaller").onclick = () => window.coach.window("shrink");
window.coach.on("session", (value) => activate(value));
window.coach.on("error", showError);
window.coach.on("end-requested", () => end());
window.coach.on("pause-requested", () => (captureActive ? pause() : start()));
const initial = await window.coach.initial();
settings = initial.settings;
$("api").value = settings.api;
$("web").value = settings.web;
if (initial.current) await activate({ ...initial.current, settings });
if (!initial.secureStorage)
  showError(
    "Secure local storage is unavailable. Session recovery will last only while this app is running.",
  );
setInterval(() => {
  if (!captureActive) return;
  const channels =
    row.audio_mode === "both" ? ["mic", "system"] : [row.audio_mode === "mic" ? "mic" : "system"];
  const silent = channels.filter((channel) => Date.now() - lastSignal[channel] > 20000);
  if (silent.length) status(`No recent ${silent.join(" / ")} audio · check levels`);
}, 5000);
