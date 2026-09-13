"use client";

import { useSyncExternalStore } from "react";
import { calls as seed } from "./calls";
import { leads as leadSeed } from "./leads";
import { icp } from "./icp";
import { turnsOf } from "./emails";
import { displayName, isRep, parseEmail, responseTime } from "./email";
import type { CallRecord, Lead, Search } from "./types";

// One in-memory store for the demo. Runs, approvals and added calls live here
// so the inbox, the run and Leads agree; a backend replaces these functions.
export type RunState = "idle" | "running" | "review" | "done";

type State = {
  calls: CallRecord[];
  runs: Record<string, RunState>;
  synced: Record<string, boolean>;
  approved: Record<string, boolean>;
  leads: Lead[];
  searches: Search[];
};

const state: State = {
  calls: [...seed].sort((a, b) => b.at.localeCompare(a.at)),
  runs: Object.fromEntries(seed.map((c) => [c.id, c.outcome === "no_show" ? "done" : "review"])) as Record<string, RunState>,
  synced: {},
  approved: {},
  leads: [...leadSeed],
  searches: [{ id: "s1", n: 1, brief: icp.brief, count: 12, status: "done", step: "draft", found: 12, scored: 12, drafted: 12, startedAt: Date.now() - 3600_000, elapsedMs: 4100 }],
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

let snapshot = { ...state };
function commit() { snapshot = { ...state, runs: { ...state.runs }, synced: { ...state.synced }, approved: { ...state.approved } }; emit(); }

export function useStore() { return useSyncExternalStore(subscribe, () => snapshot, () => snapshot); }

export const actions = {
  addCall(source: CallRecord, opts?: { name?: string }): CallRecord {
    const id = `call-new-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const c: CallRecord = { ...source, id, at: now, ...(opts?.name ? { company: opts.name.replace(/\.[a-z0-9]+$/i, ""), contact: "Unknown caller" } : {}) };
    state.calls = [c, ...state.calls];
    state.runs[id] = "running";
    commit();
    return c;
  },
  /** A recording dropped on Home: the demo fixture stands in for the file's content. */
  addUpload(fileName: string): CallRecord {
    const source = seed.find((c) => c.id === "call-13-marlowe-finch-demo") ?? seed[0];
    const id = `call-new-${Date.now().toString(36)}`;
    const c: CallRecord = { ...source, id, at: new Date().toISOString(), fileName };
    state.calls = [c, ...state.calls];
    state.runs[id] = "running";
    commit();
    return c;
  },
  /** A pasted transcript: "Name: text" lines become turns; otherwise one prospect turn. */
  addTranscript(text: string): CallRecord {
    const source = seed.find((c) => c.id === "call-13-marlowe-finch-demo") ?? seed[0];
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const LINE = /^(?:\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*)?([A-Z][\w .'-]{1,40}?)(?:\s*\((\d{1,2}:\d{2}(?::\d{2})?)\))?:\s*(.+)$/;
    const toSec = (s?: string) => { if (!s) return null; const p = s.split(":").map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
    const parsed = lines.map((l) => l.match(LINE)).filter(Boolean) as RegExpMatchArray[];
    const speakers = [...new Set(parsed.map((m) => m[2]))];
    const turns = parsed.length >= 2
      ? parsed.map((m, i) => ({ i, speaker: (speakers.indexOf(m[2]) === 0 ? "rep" : "prospect") as "rep" | "prospect", name: m[2], text: m[4], t: toSec(m[1] ?? m[3]) ?? i * 20 }))
      : [{ i: 0, speaker: "prospect" as const, name: "Prospect", text: text.trim(), t: 0 }];
    const id = `call-new-${Date.now().toString(36)}`;
    const c: CallRecord = { ...source, id, at: new Date().toISOString(), turns, duration: Math.max(60, turns.length * 20), contact: speakers[1] ?? "Prospect", rep: speakers[0] ?? source.rep, company: "Pasted transcript", pasted: true };
    state.calls = [c, ...state.calls];
    state.runs[id] = "running";
    commit();
    return c;
  },
  /** A pasted or forwarded email: headers and quoted replies become a thread; the demo thread stands in for the rest. */
  addEmail(text: string): CallRecord {
    const source = seed.find((c) => c.id === "email-03-brunswick-dental-group") ?? seed[0];
    const messages = parseEmail(text);
    const inbound = messages.find((m) => m.direction === "inbound")?.sender;
    const outbound = messages.find((m) => m.direction === "outbound")?.sender;
    const contact = inbound ? displayName(inbound) : "Prospect";
    const rep = outbound && isRep(outbound) ? displayName(outbound) : source.rep;
    const id = `email-new-${Date.now().toString(36)}`;
    const c: CallRecord = {
      ...source, id, kind: "email", at: new Date().toISOString(), messages, turns: turnsOf(messages), duration: 0,
      contact, rep, company: "Pasted email", email: inbound?.email ?? null, pasted: true,
      fields: { ...source.fields, contact: { ...source.fields.contact, value: contact }, company: { ...source.fields.company, value: "Pasted email" } },
      scorecard: { ...source.scorecard, responseTime: responseTime(messages) },
      draft: { ...source.draft, subject: `Re: ${messages[0].subject.replace(/^Re:\s*/i, "")}` },
    };
    state.calls = [c, ...state.calls];
    state.runs[id] = "running";
    commit();
    return c;
  },
  setRun(id: string, s: RunState) { state.runs[id] = s; commit(); },
  sync(id: string) { state.synced[id] = true; commit(); },
  approveDraft(id: string) { state.approved[id] = true; commit(); },
  /** A (re)run replays both gates, so the approvals start clean. */
  resetApprovals(id: string) { delete state.synced[id]; delete state.approved[id]; commit(); },
  approveLead(id: string) { state.leads = state.leads.map((l) => (l.id === id ? { ...l, status: "approved" } : l)); commit(); },
  approveAllLeads(searchId: string) { state.leads = state.leads.map((l) => (l.searchId === searchId ? { ...l, status: "approved" } : l)); commit(); },
  addSearch(s: Search) { state.searches = [s, ...state.searches]; commit(); },
  updateSearch(id: string, patch: Partial<Search>) { state.searches = state.searches.map((s) => (s.id === id ? { ...s, ...patch } : s)); commit(); },
  addLead(l: Lead) { state.leads = [...state.leads, l]; commit(); },
};
