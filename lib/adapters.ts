// API entities to the `CallRecord` the run surface renders. Every block a step
// produces (fields, scorecard, draft) is left off until that step has run.
import { user } from "@/lib/data/seller";
import type { ApiCall, ApiDraft, ApiEmailRecord, ApiEvidence, ApiExtraction, ApiField, ApiScorecard } from "@/lib/api/slipstream";
import type { CallRecord, EmailMessage, Field, Outcome, Turn } from "@/lib/types";

const OUTCOMES = new Set<Outcome>(["won", "stalled", "lost", "no_show", "open"]);

/* uuid v5 (SHA-1, URL namespace): the API derives a call id from
   "slipstream:{source_external_id}", so the UI can address a fixture before it
   has been ingested. */
const NAMESPACE_URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

function sha1(bytes: Uint8Array): Uint8Array {
  const bits = bytes.length * 8;
  const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bits / 2 ** 32), false);
  view.setUint32(padded.length - 4, bits >>> 0, false);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(block + i * 4, false);
    for (let i = 16; i < 80; i++) {
      const mix = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = (mix << 1) | (mix >>> 31);
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      const f = i < 20 ? (b & c) | (~b & d) : i < 40 ? b ^ c ^ d : i < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d;
      const k = i < 20 ? 0x5a827999 : i < 40 ? 0x6ed9eba1 : i < 60 ? 0x8f1bbcdc : 0xca62c1d6;
      const next = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = next;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  new DataView(out.buffer).setUint32(0, h0, false);
  new DataView(out.buffer).setUint32(4, h1, false);
  new DataView(out.buffer).setUint32(8, h2, false);
  new DataView(out.buffer).setUint32(12, h3, false);
  new DataView(out.buffer).setUint32(16, h4, false);
  return out;
}

function uuid5(namespace: string, name: string): string {
  const ns = namespace.replace(/-/g, "");
  const nsBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) nsBytes[i] = parseInt(ns.slice(i * 2, i * 2 + 2), 16);
  const nameBytes = new TextEncoder().encode(name);
  const input = new Uint8Array(nsBytes.length + nameBytes.length);
  input.set(nsBytes);
  input.set(nameBytes, nsBytes.length);
  const hash = sha1(input).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The conversation id the API gives a fixture call, derivable without a round trip. */
export function fixtureConversationId(callId: string): string {
  return uuid5(NAMESPACE_URL, `slipstream:${callId}`);
}

export function turnsFromSegments(call: ApiCall): Turn[] {
  const rep = (call.rep ?? "").trim().toLocaleLowerCase();
  return call.segments.map((segment, i) => ({
    i,
    speaker: segment.speaker.trim().toLocaleLowerCase() === rep ? "rep" : "prospect",
    name: segment.speaker,
    text: segment.body,
    t: Math.round(segment.start_ms / 1000),
  }));
}

/** One turn per message so citations address messages the way they address turns. */
export function turnsFromMessages(messages: EmailMessage[]): Turn[] {
  return messages.map((message) => ({
    i: message.i,
    speaker: message.direction === "outbound" ? "rep" : "prospect",
    name: message.sender.name ?? message.sender.email,
    text: message.body,
    t: message.i,
  }));
}

type Cite = { span: number | null; evidence_ms?: number | null; evidence_ref?: number | null };

/** `sequence` is the 0-based segment index; a call cites the segment's start, a thread its message number. */
export function spanFromEvidence(evidence: ApiEvidence[] | undefined, turns: Turn[], kind: "call" | "email" = "call"): Cite {
  const hit = evidence?.find((item) => item.sequence != null && item.sequence >= 0 && item.sequence < turns.length);
  const span = hit?.sequence ?? null;
  if (span == null) return { span: null, ...(kind === "email" ? { evidence_ref: null } : { evidence_ms: null }) };
  return kind === "email" ? { span, evidence_ref: span } : { span, evidence_ms: turns[span].t * 1000 };
}

/** Scorecard evidence is 1-based over the same turns. */
export function spanFromTurnIndex(turnIndex: number | null | undefined, turns: Turn[]): number | null {
  if (turnIndex == null) return null;
  const span = turnIndex - 1;
  return span >= 0 && span < turns.length ? span : null;
}

export function fieldFrom<T>(field: ApiField<T> | undefined, turns: Turn[], kind: "call" | "email"): Field<T | null> {
  return {
    value: field?.value ?? null,
    confidence: field?.confidence ?? 0,
    ...spanFromEvidence(field?.evidence, turns, kind),
  };
}

export function outcomeFrom(scorecard?: ApiScorecard, extraction?: ApiExtraction): Outcome {
  if (scorecard?.outcome) return scorecard.outcome;
  const fromDeal = extraction?.deal.outcome.value;
  if (fromDeal && OUTCOMES.has(fromDeal as Outcome)) return fromDeal as Outcome;
  return "open";
}

export function talkRatioFromTurns(turns: Turn[]): number {
  const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
  const total = turns.reduce((sum, turn) => sum + words(turn.text), 0);
  if (!total) return 0;
  return turns.filter((turn) => turn.speaker === "rep").reduce((sum, turn) => sum + words(turn.text), 0) / total;
}

function scorecardFrom(scorecard: ApiScorecard, turns: Turn[], kind: "call" | "email"): NonNullable<CallRecord["scorecard"]> {
  return {
    discovery: scorecard.discovery_questions,
    nextStepSecured: scorecard.next_step_secured,
    objection: scorecard.objection_handling,
    talkRatio: scorecard.rep_talk_ratio,
    ...(kind === "email" ? { askedRightQuestions: scorecard.discovery_questions > 0 } : {}),
    spans: {
      discovery: spanFromTurnIndex(scorecard.discovery_evidence[0]?.turn_index, turns),
      nextStep: spanFromTurnIndex(scorecard.next_step_evidence?.turn_index, turns),
      objection: spanFromTurnIndex(scorecard.objection_evidence[0]?.turn_index, turns),
    },
  };
}

/** Fixture subjects read "Company — Prospect"; anything else is a plain subject. */
export function splitSubject(subject: string | undefined): { company: string | null; prospect: string | null } {
  const parts = (subject ?? "").split(/\s+[—–-]\s+/);
  if (parts.length < 2) return { company: null, prospect: null };
  return { company: parts[0].trim() || null, prospect: parts.slice(1).join(" - ").trim() || null };
}

export function toCallRecord(
  call: ApiCall,
  extra: { extraction?: ApiExtraction; scorecard?: ApiScorecard; draft?: ApiDraft; fileName?: string; pasted?: boolean } = {},
): CallRecord {
  const { extraction, scorecard, draft } = extra;
  const turns = turnsFromSegments(call);
  const fromSubject = splitSubject(call.subject);
  const prospect = turns.find((turn) => turn.speaker === "prospect")?.name ?? null;
  const lastEnd = call.segments[call.segments.length - 1]?.end_ms ?? 0;

  return {
    id: call.id,
    kind: "call",
    sourceId: call.source_external_id,
    contact: extraction?.contact.name.value ?? fromSubject.prospect ?? prospect ?? "Unknown contact",
    title: extraction?.contact.title.value ?? null,
    email: extraction?.contact.email.value ?? null,
    company: extraction?.company.name.value ?? fromSubject.company ?? call.source_external_id,
    industry: extraction?.company.industry.value ?? null,
    headcount: extraction?.company.employee_count.value ?? null,
    location: extraction?.company.location.value ?? null,
    rep: call.rep ?? "Unknown rep",
    at: call.occurred_at,
    duration: call.duration_seconds ?? Math.round(lastEnd / 1000),
    outcome: outcomeFrom(scorecard, extraction),
    valueAud: extraction?.deal.amount.value ?? null,
    trigger: null,
    turns,
    ...(extraction
      ? {
          fields: {
            contact: fieldFrom(extraction.contact.name, turns, "call"),
            company: fieldFrom(extraction.company.name, turns, "call"),
            stage: fieldFrom(extraction.deal.stage, turns, "call"),
            value: fieldFrom(extraction.deal.amount, turns, "call"),
            next_step: {
              value: extraction.next_step?.description ?? null,
              confidence: extraction.next_step?.confidence ?? 0,
              ...spanFromEvidence(extraction.next_step?.evidence, turns, "call"),
            },
            promises: {
              value: extraction.promises.map((promise) => promise.value).filter((value): value is string => !!value),
              confidence: extraction.promises[0]?.confidence ?? 0,
              ...spanFromEvidence(extraction.promises[0]?.evidence, turns, "call"),
            },
          },
          objections: extraction.objections.map((objection) => ({ text: objection.text, handling: objection.handling })),
        }
      : {}),
    ...(scorecard ? { scorecard: scorecardFrom(scorecard, turns, "call") } : {}),
    ...(draft ? { draft: { id: draft.id, subject: draft.subject, body: draft.body, approved: draft.status !== "draft" } } : {}),
    ...(extra.fileName ? { fileName: extra.fileName } : {}),
    ...(extra.pasted ? { pasted: true } : {}),
  };
}

export function toEmailMessages(records: ApiEmailRecord[]): EmailMessage[] {
  return [...records]
    .sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at))
    .map((record, i) => ({
      i,
      direction: record.direction,
      sender: record.sender,
      recipients: record.recipients,
      subject: record.subject,
      body: record.body,
      occurred_at: record.occurred_at,
    }));
}

export function toEmailRecord(
  id: string,
  records: ApiEmailRecord[],
  extra: { extraction?: ApiExtraction; draft?: ApiDraft; company?: string; responseTime?: string; pasted?: boolean } = {},
): CallRecord {
  const messages = toEmailMessages(records);
  const turns = turnsFromMessages(messages);
  const firstInbound = messages.find((message) => message.direction === "inbound")?.sender;
  const rep = messages.find((message) => message.direction === "outbound")?.sender;
  const { extraction, draft } = extra;

  return {
    id,
    kind: "email",
    sourceId: records[0]?.thread_external_id,
    contact: extraction?.contact.name.value ?? firstInbound?.name ?? firstInbound?.email ?? "Unknown sender",
    title: extraction?.contact.title.value ?? null,
    email: extraction?.contact.email.value ?? firstInbound?.email ?? null,
    company: extra.company ?? extraction?.company.name.value ?? (firstInbound ? domainName(firstInbound.email) : "Unknown company"),
    industry: extraction?.company.industry.value ?? null,
    headcount: extraction?.company.employee_count.value ?? null,
    location: extraction?.company.location.value ?? null,
    rep: rep?.name ?? rep?.email ?? records[0]?.mailbox.name ?? user.name,
    at: messages[messages.length - 1]?.occurred_at ?? new Date(0).toISOString(),
    duration: 0,
    ...(extra.responseTime ? { responseTime: extra.responseTime } : {}),
    outcome: outcomeFrom(undefined, extraction),
    valueAud: extraction?.deal.amount.value ?? null,
    trigger: null,
    turns,
    messages,
    ...(extraction
      ? {
          fields: {
            contact: fieldFrom(extraction.contact.name, turns, "email"),
            company: fieldFrom(extraction.company.name, turns, "email"),
            stage: fieldFrom(extraction.deal.stage, turns, "email"),
            value: fieldFrom(extraction.deal.amount, turns, "email"),
            next_step: {
              value: extraction.next_step?.description ?? null,
              confidence: extraction.next_step?.confidence ?? 0,
              ...spanFromEvidence(extraction.next_step?.evidence, turns, "email"),
            },
            promises: {
              value: extraction.promises.map((promise) => promise.value).filter((value): value is string => !!value),
              confidence: extraction.promises[0]?.confidence ?? 0,
              ...spanFromEvidence(extraction.promises[0]?.evidence, turns, "email"),
            },
          },
          objections: extraction.objections.map((objection) => ({ text: objection.text, handling: objection.handling })),
        }
      : {}),
    ...(draft ? { draft: { id: draft.id, subject: draft.subject, body: draft.body, approved: draft.status !== "draft" } } : {}),
    ...(extra.pasted ? { pasted: true } : {}),
  };
}

/** "olivia@fairfieldwealth.example" → "Fairfieldwealth". */
export function domainName(email: string): string {
  const host = email.split("@")[1] ?? "";
  const label = host.split(".")[0] ?? "";
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Unknown company";
}
