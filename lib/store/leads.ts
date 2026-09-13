"use client";

import { useSyncExternalStore } from "react";
import { deriveIcp, loadIcpHistory } from "@/lib/api/leads";
import {
  approveLeadOutreach,
  draftLeadOutreach,
  getIcpEvidenceInventory,
  getLatestIcp,
  getLeads,
  type ApiIcpProfile,
} from "@/lib/api/slipstream";
import { toLead } from "@/lib/leads";
import type { Lead, Search } from "@/lib/types";

/* Leads state. The profile, the rows and every status come from the API; only
   the search history is local, because the API has no record of which browser
   asked for which sourcing job. */

export type LeadsStatus = "idle" | "loading" | "ready" | "error";

type State = {
  profile: ApiIcpProfile | null;
  wonDeals: number;
  leads: Lead[];
  searches: Search[];
  /** The search whose rows the sheet shows; null shows every lead on the profile. */
  selectedId: string | null;
  /** Leads with a request in flight (drafting or approving). */
  busy: Record<string, boolean>;
  status: LeadsStatus;
  error?: string;
};

const state: State = { profile: null, wonDeals: 0, leads: [], searches: [], selectedId: null, busy: {}, status: "idle" };

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

let snapshot: State = { ...state };
function commit() {
  snapshot = { ...state, leads: [...state.leads], searches: [...state.searches], busy: { ...state.busy } };
  listeners.forEach((l) => l());
}

export function useLeads() { return useSyncExternalStore(subscribe, () => snapshot, () => snapshot); }

const SEARCHES_KEY = "slipstream.searches";

function readSearches(): Search[] {
  try {
    const raw = window.localStorage.getItem(SEARCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is Search => !!s && typeof s === "object" && typeof (s as Search).id === "string")
      // A search interrupted by a reload cannot be resumed: the job id is gone from this session.
      .map((s) => (s.status === "running" ? { ...s, status: "error" as const, note: "Interrupted by a reload" } : s));
  } catch {
    return [];
  }
}

function writeSearches() {
  try {
    window.localStorage.setItem(SEARCHES_KEY, JSON.stringify(state.searches));
  } catch {
    // A browser with storage disabled still runs searches, it just forgets them.
  }
}

function merge(rows: Lead[]) {
  const known = new Map(state.leads.map((l) => [l.id, l]));
  const next = rows.map((row) => {
    const previous = known.get(row.id);
    return previous ? { ...row, searchId: previous.searchId, landedAt: previous.landedAt, draft: previous.draft ?? row.draft } : row;
  });
  const fetched = new Set(rows.map((r) => r.id));
  state.leads = [...state.leads.filter((l) => !fetched.has(l.id)), ...next];
}

const message = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong");

let loading: Promise<void> | null = null;

export const actions = {
  /** First paint: the profile, the won-deal count and the rows already on the profile. */
  load(): Promise<void> {
    if (loading) return loading;
    state.status = "loading";
    state.searches = readSearches();
    state.selectedId = null;
    commit();
    loading = (async () => {
      try {
        let profile = await getLatestIcp();
        if (!profile) {
          await loadIcpHistory();
          await deriveIcp();
          profile = await getLatestIcp();
        }
        const inventory = await getIcpEvidenceInventory();
        state.profile = profile;
        state.wonDeals = inventory.won_deals;
        if (profile) {
          const rows = await getLeads(profile.id);
          const claimed = new Map<string, string>();
          for (const search of state.searches) for (const id of search.leadIds ?? []) claimed.set(id, search.id);
          state.leads = rows.map((row) => toLead(row, claimed.get(row.id) ?? "", profile));
        }
        state.status = "ready";
        state.error = undefined;
      } catch (error) {
        state.status = "error";
        state.error = message(error);
      } finally {
        loading = null;
        commit();
      }
    })();
    return loading;
  },

  select(id: string | null) { state.selectedId = id; commit(); },

  async refreshLeads(): Promise<Lead[]> {
    if (!state.profile) return [];
    const rows = (await getLeads(state.profile.id)).map((row) => toLead(row, "", state.profile));
    merge(rows);
    commit();
    return state.leads;
  },

  addSearch(search: Search) {
    state.searches = [search, ...state.searches];
    state.selectedId = search.id;
    writeSearches();
    commit();
  },

  updateSearch(id: string, patch: Partial<Search>) {
    state.searches = state.searches.map((s) => (s.id === id ? { ...s, ...patch } : s));
    writeSearches();
    commit();
  },

  /** The row exists before the API has handed out a job id; this swaps it in. */
  renameSearch(from: string, to: string) {
    state.searches = state.searches.map((s) => (s.id === from ? { ...s, id: to } : s));
    state.leads = state.leads.map((l) => (l.searchId === from ? { ...l, searchId: to } : l));
    if (state.selectedId === from) state.selectedId = to;
    writeSearches();
    commit();
  },

  /** A row arriving from a running search: it joins the sheet with the arrival tint. */
  landLead(lead: Lead) {
    const rest = state.leads.filter((l) => l.id !== lead.id);
    state.leads = [...rest, lead];
    state.searches = state.searches.map((s) => (s.id === lead.searchId ? { ...s, leadIds: [...s.leadIds, lead.id] } : s));
    writeSearches();
    commit();
  },

  patchLead(id: string, patch: Partial<Lead>) {
    state.leads = state.leads.map((l) => (l.id === id ? { ...l, ...patch } : l));
    commit();
  },

  /** The outreach draft for a lead, written by the API. Cached after the first call. */
  async draftFor(id: string): Promise<void> {
    const lead = state.leads.find((l) => l.id === id);
    if (!lead || lead.draft || lead.status === "approved" || state.busy[id]) return;
    state.busy = { ...state.busy, [id]: true };
    commit();
    try {
      const draft = await draftLeadOutreach(id);
      actions.patchLead(id, {
        draft: { id: draft.id, subject: draft.subject, body: draft.body },
        status: draft.status === "approved" ? "approved" : "drafted",
      });
    } catch (error) {
      state.error = message(error);
    } finally {
      delete state.busy[id];
      state.busy = { ...state.busy };
      commit();
    }
  },

  async approve(id: string): Promise<void> {
    const lead = state.leads.find((l) => l.id === id);
    if (!lead?.draft || state.busy[id]) return;
    state.busy = { ...state.busy, [id]: true };
    commit();
    try {
      const draft = await approveLeadOutreach(id, lead.draft.id);
      actions.patchLead(id, { status: "approved", draft: { id: draft.id, subject: draft.subject, body: draft.body } });
    } catch (error) {
      state.error = message(error);
    } finally {
      delete state.busy[id];
      state.busy = { ...state.busy };
      commit();
    }
  },

  async approveAll(ids: string[]): Promise<void> {
    for (const id of ids) await actions.approve(id);
  },

  clearError() { state.error = undefined; commit(); },
};
