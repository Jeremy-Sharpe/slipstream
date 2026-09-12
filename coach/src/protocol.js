const PROD_API = "https://slipstream-api.3-104-149-193.sslip.io";

function cleanText(value, max, field) {
  if (typeof value !== "string") throw new Error(`${field} must be text`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > max) throw new Error(`${field} must be 1–${max} characters`);
  return cleaned;
}

function normalizeConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid session settings");
  const apiUrl = new URL(input.apiBase || PROD_API);
  const local = ["localhost", "127.0.0.1"].includes(apiUrl.hostname);
  if (apiUrl.protocol !== "https:" && !(local && apiUrl.protocol === "http:")) {
    throw new Error("API must use HTTPS (HTTP is allowed only on localhost)");
  }
  const mode = input.mode === "microphone" ? "microphone" : "demo";
  return {
    apiBase: apiUrl.origin,
    mode,
    subject: cleanText(input.subject, 200, "Subject"),
    repName: cleanText(input.repName, 80, "Rep name"),
    dealContext: typeof input.dealContext === "string" ? input.dealContext.trim().slice(0, 2000) : "",
    ingestToken: typeof input.ingestToken === "string" ? input.ingestToken.trim().slice(0, 500) : "",
    sourceExternalId: typeof input.sourceExternalId === "string" && input.sourceExternalId.trim()
      ? cleanText(input.sourceExternalId, 200, "Session ID")
      : `coach-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };
}

function coachWebSocketUrl(apiBase) {
  const url = new URL("/api/v1/coach/live", apiBase);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function turnPayload(sequence, role, text, startedAt) {
  if (!Number.isInteger(sequence) || sequence < 0) throw new Error("Invalid sequence");
  if (!["rep", "prospect"].includes(role)) throw new Error("Speaker must be rep or prospect");
  const clean = cleanText(text, 4000, "Transcript");
  const startMs = Math.max(0, Date.now() - startedAt);
  return {
    type: "transcript",
    sequence,
    speaker: role === "rep" ? "Sales rep" : "Prospect",
    role,
    text: clean,
    start_ms: startMs,
    end_ms: startMs,
  };
}

module.exports = { PROD_API, normalizeConfig, coachWebSocketUrl, turnPayload };

