"use client";

// Everything Home can hand the API: a fixture call, an uploaded recording, a
// pasted transcript (persisted over the live-coach socket, the only write path
// for text) and a pasted email thread.
import {
  ApiError,
  describeFailure,
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
const MAILBOX = { name: REP_NAME, email: "sam@eleno.example" };
const MAILBOX_ID = "eleno-sales";
const WORDS_PER_MINUTE = 150;

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

/** Persisted through the live-coach socket, relayed by app/gateway/transcript so the token stays on the server. */
export async function ingestTranscript(text: string): Promise<{ call: ApiCall; entry: ConversationEntry }> {
  const { turns: parsed, speakers } = parseTranscript(text);
  const rep = speakers[0] ?? REP_NAME;
  const prospect = speakers.find((speaker) => speaker !== rep) ?? null;
  let at = 0;
  const turns = parsed.map((turn, sequence) => {
    const words = turn.text.split(/\s+/).filter(Boolean).length;
    const duration = Math.max(1000, Math.round((words / WORDS_PER_MINUTE) * 60_000));
    const start = at;
    at += duration;
    return { sequence, speaker: turn.speaker, role: turn.speaker === rep ? "rep" : "prospect", text: turn.text, start_ms: start, end_ms: at };
  });
  const response = await fetch("/gateway/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_external_id: `paste-${stamp()}`, subject: prospect ?? "Pasted transcript", rep_name: rep, turns }),
  });
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  if (!response.ok) throw new ApiError(describeFailure(response.status, payload?.detail), response.status);
  const call = payload as unknown as ApiCall;
  return { call, entry: entryForCall(call, { pasted: true, company: "Pasted transcript", contact: prospect ?? "Prospect" }) };
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
