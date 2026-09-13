"use client";

// The API has no list endpoint, so the browser keeps the registry: the fixture
// calls and demo threads it can always reach, plus whatever this browser
// created. Run state (which gate a conversation is at, what was approved) lives
// beside it so the list and the run page agree after a reload.
import { useSyncExternalStore } from "react";
import type { Outcome } from "@/lib/types";

export type ConversationKind = "call" | "email";

export type ThreadRef = { provider: string; mailbox_external_id: string; thread_external_id: string };

export type ConversationEntry = {
  id: string;
  kind: ConversationKind;
  subject: string;
  company: string;
  contact: string;
  at: string;
  sourceExternalId?: string;
  thread?: ThreadRef;
  fileName?: string;
  pasted?: boolean;
};

export type RunState = "running" | "review" | "done";

export type StoredRun = {
  state: RunState;
  outcome?: Outcome;
  draftId?: string;
  synced?: boolean;
  approved?: boolean;
  extracted?: boolean;
};

type Snapshot = { entries: ConversationEntry[]; runs: Record<string, StoredRun> };

const ENTRIES_KEY = "slipstream.conversations";
const RUNS_KEY = "slipstream.runs";

export const EMPTY: Snapshot = { entries: [], runs: {} };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return parsed == null ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota: the session still works, it just forgets.
  }
}

function isEntry(value: unknown): value is ConversationEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === "string" && (entry.kind === "call" || entry.kind === "email") && typeof entry.at === "string";
}

function load(): Snapshot {
  const entries = read<unknown>(ENTRIES_KEY, []);
  const runs = read<unknown>(RUNS_KEY, {});
  return {
    entries: Array.isArray(entries) ? entries.filter(isEntry) : [],
    runs: typeof runs === "object" && runs !== null && !Array.isArray(runs) ? (runs as Record<string, StoredRun>) : {},
  };
}

let snapshot: Snapshot = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    hydrated = true;
    snapshot = load();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function current(): Snapshot {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    snapshot = load();
  }
  return snapshot;
}

const server = () => EMPTY;

export function useConversations(): Snapshot {
  return useSyncExternalStore(subscribe, current, server);
}

export function getEntry(id: string): ConversationEntry | undefined {
  return current().entries.find((entry) => entry.id === id);
}

export function getRun(id: string): StoredRun | undefined {
  return current().runs[id];
}

export function registerConversation(entry: ConversationEntry) {
  const { entries, runs } = current();
  const next = [entry, ...entries.filter((existing) => existing.id !== entry.id)];
  snapshot = { entries: next, runs };
  write(ENTRIES_KEY, next);
  emit();
}

export function setRun(id: string, patch: Partial<StoredRun> & { state?: RunState }) {
  const { entries, runs } = current();
  const next = { ...runs, [id]: { ...runs[id], state: runs[id]?.state ?? "running", ...patch } };
  snapshot = { entries, runs: next };
  write(RUNS_KEY, next);
  emit();
}

/** A re-run replays both gates, so the approvals start clean. */
export function resetRun(id: string) {
  const { entries, runs } = current();
  const next = {
    ...runs,
    [id]: { state: "running" as RunState, outcome: runs[id]?.outcome, draftId: runs[id]?.draftId, extracted: runs[id]?.extracted },
  };
  snapshot = { entries, runs: next };
  write(RUNS_KEY, next);
  emit();
}
