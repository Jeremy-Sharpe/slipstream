import { API_BASE_URL } from "@/lib/api/client";

// Persists a pasted transcript through the API's live-coach socket, the only
// write path for text. Runs on the server so the ingest token stays here and
// the socket never has to cross the browser's origin.
export const dynamic = "force-dynamic";

const SOCKET_TIMEOUT_MS = 30_000;

type Turn = { sequence: number; speaker: string; role: "rep" | "prospect" | "unknown"; text: string; start_ms: number; end_ms: number };
type Body = { source_external_id: string; subject: string; rep_name: string; turns: Turn[] };
type SocketMessage = { type?: string; call?: unknown; detail?: string; code?: string };
type Outcome = { status: number; payload: unknown };

function validBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.source_external_id === "string" &&
    typeof body.subject === "string" &&
    typeof body.rep_name === "string" &&
    Array.isArray(body.turns) &&
    body.turns.length > 0 &&
    body.turns.every((turn) => turn && typeof turn === "object" && typeof (turn as Turn).text === "string")
  );
}

function relay(body: Body): Promise<Outcome> {
  const token = process.env.SLIPSTREAM_INGEST_TOKEN;
  return new Promise((resolve) => {
    const socket = new WebSocket(`${API_BASE_URL.replace(/^http/, "ws")}/api/v1/coach/live`);
    let settled = false;
    const finish = (status: number, payload: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // Already closing.
      }
      resolve({ status, payload });
    };
    const timer = setTimeout(() => finish(504, { detail: "The live session did not answer in 30 seconds" }), SOCKET_TIMEOUT_MS);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: "start",
        source_external_id: body.source_external_id,
        subject: body.subject,
        rep_name: body.rep_name,
        ...(token ? { ingest_token: token } : {}),
      }));
      for (const turn of body.turns) socket.send(JSON.stringify({ type: "transcript", ...turn }));
      socket.send(JSON.stringify({ type: "stop" }));
    };
    socket.onmessage = async (event) => {
      let message: SocketMessage;
      try {
        const raw = typeof event.data === "string" ? event.data : await (event.data as Blob).text();
        message = JSON.parse(raw) as SocketMessage;
      } catch {
        return;
      }
      if (message.type === "error") {
        finish(message.code === "unauthorized" ? 401 : 502, { detail: message.detail ?? message.code ?? "The live session failed" });
        return;
      }
      if (message.type === "completed" && message.call) finish(200, message.call);
    };
    socket.onerror = () => finish(502, { detail: "The live session could not be reached" });
    socket.onclose = () => finish(502, { detail: "The live session closed before the call was saved" });
  });
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  if (!validBody(body)) return Response.json({ detail: "A transcript needs a subject, a rep and at least one turn" }, { status: 422 });
  const outcome = await relay(body);
  return Response.json(outcome.payload, { status: outcome.status });
}
