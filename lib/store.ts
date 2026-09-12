"use client";

import { useSyncExternalStore } from "react";
import { calls as seed } from "./calls";
import { leads as leadSeed } from "./leads";
import type { CallRecord, Lead } from "./types";

// One in-memory store for the demo. Runs, approvals and added calls live here
// so the inbox, the run and Leads agree; a backend replaces these functions.
export type RunState = "idle" | "running" | "review" | "done";

type State = {
  calls: CallRecord[];
  runs: Record<string, RunState>;
  synced: Record<string, boolean>;
  approved: Record<string, boolean>;
  leads: Lead[];
};

const state: State = {
  calls: [...seed].sort((a, b) => b.at.localeCompare(a.at)),
  runs: Object.fromEntries(seed.map((c) => [c.id, c.outcome === "no_show" ? "done" : "review"])) as Record<string, RunState>,
  synced: {},
  approved: {},
  leads: [...leadSeed],
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
  setRun(id: string, s: RunState) { state.runs[id] = s; commit(); },
  sync(id: string) { state.synced[id] = true; commit(); },
  approveDraft(id: string) { state.approved[id] = true; commit(); },
  approveLead(id: string) { state.leads = state.leads.map((l) => (l.id === id ? { ...l, status: "approved" } : l)); commit(); },
  approveAllLeads() { state.leads = state.leads.map((l) => ({ ...l, status: "approved" })); commit(); },
};
