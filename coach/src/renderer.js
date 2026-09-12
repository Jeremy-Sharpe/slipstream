import { CommitStrategy, RealtimeEvents, Scribe } from "@elevenlabs/client";

const $ = (selector) => document.querySelector(selector);
const state = { phase: "idle", mode: null, sessionId: null, scribe: null, forwards: new Set(), saveTimer: null };
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function status(text, tone = "") {
  $("#status").textContent = text;
  $("#status").dataset.tone = tone;
}

function boundList(list, maximum, removeFromStart) {
  while (list.children.length > maximum) list.removeChild(removeFromStart ? list.firstElementChild : list.lastElementChild);
}

function appendTurn(role, text) {
  const item = document.createElement("li");
  item.className = `turn ${role}`;
  const label = document.createElement("strong");
  label.textContent = role === "rep" ? "You" : "Prospect";
  const body = document.createElement("span");
  body.textContent = text;
  item.append(label, body);
  $("#turns").append(item);
  boundList($("#turns"), 80, true);
  item.scrollIntoView({ block: "nearest" });
}

function appendSuggestion(message) {
  const item = document.createElement("li");
  item.className = "suggestion";
  const category = document.createElement("span");
  category.className = "category";
  category.textContent = message.title || message.category || "next move";
  const body = document.createElement("p");
  body.textContent = message.message || "Keep listening.";
  item.append(category, body);
  $("#suggestions").prepend(item);
  boundList($("#suggestions"), 20, false);
}

function errorMessage(error, fallback) {
  return error?.message || error?.error || fallback;
}

function closeScribe(connection = state.scribe) {
  if (!connection) return;
  if (state.scribe === connection) state.scribe = null;
  connection.close();
}

function showReset(message, tone = "error") {
  clearTimeout(state.saveTimer);
  closeScribe();
  state.phase = "resettable";
  $("#manual").disabled = true;
  $("#send").disabled = true;
  $("#stop").textContent = "New call";
  $("#stop").disabled = false;
  status(message, tone);
}

async function cancelCurrent(message = "Session ended before it was saved") {
  if (state.phase === "cancelling" || state.phase === "resettable") return;
  state.phase = "cancelling";
  await window.slipstreamCoach.cancel().catch(() => {});
  showReset(typeof message === "string" ? message : errorMessage(message, "Session ended before it was saved"));
}

async function forwardTranscript(text, role = $("#role").value) {
  const clean = text.trim();
  if (!clean) return;
  await window.slipstreamCoach.sendTurn({ role, text: clean });
  appendTurn(role, clean);
}

function trackForward(text) {
  const pending = forwardTranscript(text, "rep").catch((error) => status(errorMessage(error, "Could not commit transcript"), "error"));
  state.forwards.add(pending);
  pending.finally(() => state.forwards.delete(pending));
}

function waitForScribeReady(connection, sessionId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error("Microphone transcription timed out")), 10000);
    const started = () => finish();
    const failed = (error) => finish(new Error(errorMessage(error, "Microphone transcription failed")));
    const closed = () => finish(new Error("Microphone transcription closed before it was ready"));
    const finish = (error) => {
      clearTimeout(timeout);
      connection.off(RealtimeEvents.SESSION_STARTED, started);
      connection.off(RealtimeEvents.ERROR, failed);
      connection.off(RealtimeEvents.CLOSE, closed);
      if (state.sessionId !== sessionId || state.phase !== "starting") reject(new Error("Coach startup was cancelled"));
      else if (error) reject(error);
      else resolve();
    };
    connection.on(RealtimeEvents.SESSION_STARTED, started);
    connection.on(RealtimeEvents.ERROR, failed);
    connection.on(RealtimeEvents.CLOSE, closed);
  });
}

async function start() {
  if (!["idle", "resettable"].includes(state.phase)) return;
  state.phase = "starting";
  state.sessionId = `coach-${crypto.randomUUID()}`;
  const sessionId = state.sessionId;
  $("#start").disabled = true;
  status("Connecting…");
  const ingestToken = $("#token").value;
  $("#token").value = "";
  try {
    const result = await window.slipstreamCoach.start({
      apiBase: $("#api").value,
      mode: $("#mode").value,
      subject: $("#subject").value,
      repName: $("#rep").value,
      dealContext: $("#context").value,
      ingestToken,
      sourceExternalId: sessionId,
    });
    if (state.phase !== "starting" || state.sessionId !== sessionId || result.sourceExternalId !== sessionId) {
      throw new Error("Coach disconnected during startup");
    }
    state.mode = result.mode;
    if (result.mode === "microphone") {
      const connection = Scribe.connect({
        token: result.scribe.token,
        modelId: result.scribe.modelId || "scribe_v2_realtime",
        commitStrategy: CommitStrategy.VAD,
        vadSilenceThresholdSecs: 0.5,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          workletPaths: { scribeAudioProcessor: new URL("./vendor/scribeAudioProcessor.js", window.location.href).href },
        },
      });
      state.scribe = connection;
      connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (event) => { $("#partial").textContent = event.text || ""; });
      connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (event) => {
        $("#partial").textContent = "";
        trackForward(event.text || "");
      });
      connection.on(RealtimeEvents.ERROR, (error) => {
        if (["starting", "live"].includes(state.phase) && state.scribe === connection) cancelCurrent(errorMessage(error, "Scribe error"));
      });
      connection.on(RealtimeEvents.CLOSE, () => {
        if (["starting", "live"].includes(state.phase) && state.scribe === connection) cancelCurrent();
      });
      await waitForScribeReady(connection, sessionId);
    }
    if (state.phase !== "starting" || state.sessionId !== sessionId) throw new Error("Coach disconnected during startup");
    state.phase = "live";
    $("#setup").hidden = true;
    $("#live").hidden = false;
    $("#stop").disabled = false;
    $("#stop").textContent = "End & save";
    $("#manual").disabled = false;
    $("#send").disabled = false;
    status(result.mode === "microphone" ? "Live rep microphone connected" : "Demo session connected", "ok");
  } catch (error) {
    closeScribe();
    await window.slipstreamCoach.cancel().catch(() => {});
    state.phase = "idle";
    state.mode = null;
    state.sessionId = null;
    $("#start").disabled = false;
    status(errorMessage(error, "Could not start"), "error");
  }
}

async function sendManual() {
  if (state.phase !== "live") return;
  const input = $("#manual");
  try {
    await forwardTranscript(input.value);
    input.value = "";
    status("Turn committed", "ok");
  } catch (error) {
    status(errorMessage(error, "Could not send turn"), "error");
  }
}

function resetForNewCall() {
  clearTimeout(state.saveTimer);
  window.slipstreamCoach.cancel().catch(() => {});
  closeScribe();
  state.phase = "idle";
  state.mode = null;
  state.sessionId = null;
  state.forwards.clear();
  $("#live").hidden = true;
  $("#setup").hidden = false;
  $("#start").disabled = false;
  $("#turns").replaceChildren();
  $("#suggestions").replaceChildren();
  status("Ready");
}

async function stop() {
  if (state.phase === "resettable") return resetForNewCall();
  if (!["live", "retry_save"].includes(state.phase)) return;
  const retryingSave = state.phase === "retry_save";
  const sessionId = state.sessionId;
  const scribe = state.scribe;
  state.phase = "stopping";
  $("#stop").disabled = true;
  $("#manual").disabled = true;
  $("#send").disabled = true;
  if (scribe && !retryingSave) {
    try { scribe.mute(); } catch {}
    await delay(800);
    if (state.sessionId !== sessionId || state.phase !== "stopping") {
      closeScribe(scribe);
      return;
    }
    await Promise.race([Promise.allSettled([...state.forwards]), delay(2000)]);
    if (state.sessionId !== sessionId || state.phase !== "stopping") {
      closeScribe(scribe);
      return;
    }
    closeScribe(scribe);
  }
  if (state.sessionId !== sessionId || state.phase !== "stopping") return;
  try {
    const accepted = await window.slipstreamCoach.stop();
    if (state.sessionId !== sessionId || state.phase !== "stopping") return;
    if (!accepted) throw new Error("Coach is no longer connected");
    status("Finishing and saving call…");
    state.saveTimer = setTimeout(() => {
      if (state.sessionId === sessionId && state.phase === "stopping") {
        showReset("Save is taking too long; the call is not confirmed saved");
      }
    }, 20000);
  } catch (error) {
    if (state.sessionId !== sessionId || state.phase !== "stopping") return;
    showReset(errorMessage(error, "Could not save the call"));
  }
}

window.slipstreamCoach.onEvent((event) => {
  if (!state.sessionId || event.source_external_id !== state.sessionId) return;
  if (event.type === "suggestion") appendSuggestion(event);
  if (event.type === "completed") {
    state.phase = "resettable";
    clearTimeout(state.saveTimer);
    closeScribe();
    status("Call saved to Slipstream", "ok");
    $("#stop").textContent = "New call";
    $("#stop").disabled = false;
  }
  if (event.type === "error") {
    clearTimeout(state.saveTimer);
    if (event.code === "empty_call" && state.phase === "stopping") {
      if (state.mode === "microphone") {
        window.slipstreamCoach.cancel().catch(() => {});
        showReset("No speech was committed; microphone capture has ended");
        return;
      } else {
        state.phase = "live";
        $("#manual").disabled = false;
        $("#send").disabled = false;
        $("#stop").disabled = false;
      }
    } else if (event.code === "persistence_failed" && state.phase === "stopping") {
      state.phase = "retry_save";
      $("#stop").textContent = "Retry save";
      $("#stop").disabled = false;
    }
    status(event.detail || "Coach error", "error");
  }
  if (event.type === "connection_closed" && ["starting", "live", "stopping"].includes(state.phase)) {
    showReset(state.phase === "stopping" ? "Connection closed before save was confirmed" : "Coach disconnected");
  }
});

$("#start").addEventListener("click", start);
$("#send").addEventListener("click", sendManual);
$("#manual").addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") sendManual();
});
$("#stop").addEventListener("click", stop);
$("#minimize").addEventListener("click", () => window.slipstreamCoach.minimize());
$("#close").addEventListener("click", () => window.slipstreamCoach.close());
