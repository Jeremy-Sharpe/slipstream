"use client";

// Everything Home can hand the API: a fixture call, an uploaded recording, a
// pasted transcript (persisted over the live-coach socket, the only write path
// for text) and a pasted email thread.
import { wsUrl } from "@/lib/api/client";
import {
  INGEST_TOKEN,
  getEmailThread,
  ingestEmail,
  ingestFixtureCall,
  transcribeCall,
  type ApiCall,
  type ApiEmailRecord,
  type EmailIngestInput,
} from "@/lib/api/slipstream";
import { domainName } from "@/lib/adapters";
import { displayName, isRep, parseEmail } from "@/lib/email";
import type { ConversationEntry } from "@/lib/store/conversations";

export const REP_NAME = "Sam Whitfield";
const MAILBOX = { name: REP_NAME, email: "sam@harbourlineit.example" };
const MAILBOX_ID = "harbourline-sales";
const WORDS_PER_MINUTE = 150;
const SOCKET_TIMEOUT_MS = 30_000;

const stamp = () => Date.now().toString(36);

export function entryForCall(call: ApiCall, extra: { fileName?: string; pasted?: boolean; company?: string; contact?: string } = {}): ConversationEntry {
  const parts = (call.subject ?? "").split(/\s+[—–-]\s+/);
  return {
    id: call.id,
    kind: "call",
    subject: call.subject ?? call.source_external_id,
    company: extra.company ?? (parts.length > 1 ? parts[0].trim() : call.source_external_id),
    contact: extra.contact ?? (parts.length > 1 ? parts.slice(1).join(" - ").trim() : "Unknown contact"),
    at: call.occurred_at,
    sourceExternalId: call.source_external_id,
    ...(extra.fileName ? { fileName: extra.fileName } : {}),
    ...(extra.pasted ? { pasted: true } : {}),
  };
}

export async function ingestFixture(callId: string): Promise<{ call: ApiCall; entry: ConversationEntry }> {
  const call = await ingestFixtureCall(callId);
  return { call, entry: entryForCall(call) };
}

export async function ingestRecording(file: File): Promise<{ call: ApiCall; entry: ConversationEntry }> {
  const subject = file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 200) || "Uploaded recording";
  const call = await transcribeCall(file, subject, REP_NAME);
  return { call, entry: entryForCall(call, { fileName: file.name }) };
}

/* "[00:12] Sam: ..." / "Sam (0:12): ..." / "Sam: ..." — the same lines the
   paste box has always accepted. */
const LINE = /^(?:\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*)?([A-Z][\w .'-]{1,40}?)(?:\s*\((\d{1,2}:\d{2}(?::\d{2})?)\))?:\s*(.+)$/;

export type ParsedTurn = { speaker: string; text: string };

export function parseTranscript(text: string): { turns: ParsedTurn[]; speakers: string[] } {
  const matches = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.match(LINE))
    .filter((match): match is RegExpMatchArray => !!match);
  if (matches.length < 2) {
    return { turns: [{ speaker: "Prospect", text: text.trim() }], speakers: ["Prospect"] };
  }
  const turns = matches.map((match) => ({ speaker: match[2], text: match[4] }));
  return { turns, speakers: [...new Set(turns.map((turn) => turn.speaker))] };
}

type SocketMessage = { type?: string; call?: unknown; detail?: string; code?: string };

/** The socket is the only write path for a transcript that was not spoken into a mic. */
export function ingestTranscript(text: string): Promise<{ call: ApiCall; entry: ConversationEntry }> {
  const { turns, speakers } = parseTranscript(text);
  const rep = speakers[0] ?? REP_NAME;
  const prospect = speakers.find((speaker) => speaker !== rep) ?? null;
  const sourceExternalId = `paste-${stamp()}`;
  const subject = prospect ?? "Pasted transcript";

  return new Promise((resolve, reject) => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl("/coach/live"));
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Could not open the live session"));
      return;
    }
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // Already closing.
      }
      fn();
    };
    const timer = window.setTimeout(
      () => finish(() => reject(new Error("The live session did not answer in 30 seconds"))),
      SOCKET_TIMEOUT_MS,
    );

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: "start",
        source_external_id: sourceExternalId,
        subject,
        rep_name: rep,
        ...(INGEST_TOKEN ? { ingest_token: INGEST_TOKEN } : {}),
      }));
      let at = 0;
      turns.forEach((turn, sequence) => {
        const words = turn.text.split(/\s+/).filter(Boolean).length;
        const duration = Math.max(1000, Math.round((words / WORDS_PER_MINUTE) * 60_000));
        socket.send(JSON.stringify({
          type: "transcript",
          sequence,
          speaker: turn.speaker,
          role: turn.speaker === rep ? "rep" : "prospect",
          text: turn.text,
          start_ms: at,
          end_ms: at + duration,
        }));
        at += duration;
      });
      socket.send(JSON.stringify({ type: "stop" }));
    };

    socket.onmessage = (event) => {
      let message: SocketMessage;
      try {
        message = JSON.parse(String(event.data)) as SocketMessage;
      } catch {
        return;
      }
      if (message.type === "error") {
        finish(() => reject(new Error(message.detail ?? message.code ?? "The live session failed")));
        return;
      }
      if (message.type !== "completed" || !message.call) return;
      const call = message.call as ApiCall;
      finish(() => resolve({
        call,
        entry: entryForCall(call, { pasted: true, company: "Pasted transcript", contact: prospect ?? "Prospect" }),
      }));
    };

    socket.onerror = () => finish(() => reject(new Error("The live session could not be reached")));
    socket.onclose = () => finish(() => reject(new Error("The live session closed before the call was saved")));
  });
}

export async function ingestEmailThread(
  messages: EmailIngestInput[],
  entry: Omit<ConversationEntry, "kind" | "at"> & { at?: string },
): Promise<{ records: ApiEmailRecord[]; entry: ConversationEntry }> {
  for (const message of messages) await ingestEmail(message);
  const first = messages[0];
  const records = await getEmailThread(first.provider, first.mailbox_external_id, first.thread_external_id);
  return {
    records,
    entry: {
      ...entry,
      kind: "email",
      at: records[records.length - 1]?.occurred_at ?? entry.at ?? first.occurred_at,
      thread: {
        provider: first.provider,
        mailbox_external_id: first.mailbox_external_id,
        thread_external_id: first.thread_external_id,
      },
    },
  };
}

/** A pasted or forwarded email: the parsed parties become the thread's participants. */
export async function ingestPastedEmail(text: string): Promise<{ records: ApiEmailRecord[]; entry: ConversationEntry }> {
  const parsed = parseEmail(text);
  const threadExternalId = `paste-${stamp()}`;
  const inbound = parsed.find((message) => message.direction === "inbound")?.sender;
  const contact = inbound ? displayName(inbound) : "Prospect";
  const messages: EmailIngestInput[] = parsed.map((message, i) => ({
    provider: "paste",
    mailbox_external_id: MAILBOX_ID,
    mailbox: MAILBOX,
    source_external_id: `${threadExternalId}-${i + 1}`,
    thread_external_id: threadExternalId,
    direction: isRep(message.sender) ? "outbound" : "inbound",
    sender: message.sender,
    recipients: message.recipients.length ? message.recipients : [{ ...MAILBOX, kind: "to" as const }],
    subject: message.subject,
    body: message.body,
    occurred_at: message.occurred_at,
    in_reply_to: i === 0 ? null : `${threadExternalId}-${i}`,
  }));

  return ingestEmailThread(messages, {
    id: `thread-${threadExternalId}`,
    subject: parsed[0]?.subject ?? "Pasted email",
    company: inbound ? domainName(inbound.email) : "Pasted email",
    contact,
    pasted: true,
  });
}
