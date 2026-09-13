"use client";

import { useCallback } from "react";
import {
  bootstrapDemo,
  draftLeadOutreach,
  getLeadSourceStatus,
  getReadiness,
  sourceLeads,
} from "./api/slipstream";
import { briefFor } from "./icp";
import { actions, useLeads } from "./store/leads";
import { useReducedMotion } from "./useReducedMotion";
import type { Lead, Search, SearchStep } from "./types";

/* A search is a real sourcing job: start it, poll it, take the rows the API
   wrote, then draft outreach for each one. The only timers left are the 350ms
   between rows arriving on the sheet and the poll interval. */

const POLL_MS = 1500;
const POLL_MAX = 40;
const FETCH_TRIES = 5;
const FETCH_MS = 750;
const ROW_MS = 350;
const FILL_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function stepFor(phase: string | null): SearchStep {
  const p = (phase ?? "").toLowerCase();
  if (p.includes("draft")) return "draft";
  if (p.includes("score") || p.includes("rank") || p.includes("embed")) return "score";
  return "search";
}

const unique = (id: string, taken: Search[]) => {
  let candidate = id;
  for (let n = 2; taken.some((s) => s.id === candidate); n += 1) candidate = `${id}#${n}`;
  return candidate;
};

export function useLeadSearch(opts: { instant?: boolean } = {}) {
  const { searches, profile, leads } = useLeads();
  const reduced = useReducedMotion();
  const fast = !!opts.instant || reduced;

  const start = useCallback(async (brief: string, count: number) => {
    if (!profile) return null;
    const stagger = (ms: number) => (fast ? Promise.resolve() : sleep(ms));
    const tempId = `pending-${Date.now().toString(36)}`;
    const notes = brief.trim() === briefFor(profile).trim() ? [] : ["Sourcing runs against the stored profile, not the edited brief"];
    const search: Search = {
      id: tempId, n: searches.length + 1, brief, count,
      status: "running", step: "read", found: 0, scored: 0, drafted: 0,
      startedAt: Date.now(), leadIds: [], note: notes.join(" · ") || undefined,
    };
    actions.addSearch(search);
    const known = new Set(leads.map((l) => l.id));
    const claimed = new Set(searches.flatMap((s) => s.leadIds ?? []));
    let id = tempId;

    try {
      // Origami is the sourcing provider when a key is configured; without one
      // the deployment sources through the synthetic provider, which runs the
      // job inline and returns when it is done.
      const origami = (await getReadiness()).integrations.origami;
      let jobId: string;
      let poll = origami;
      if (origami) {
        jobId = (await sourceLeads(count)).origami_job_id;
      } else {
        actions.updateSearch(id, { step: "search" });
        const demo = await bootstrapDemo();
        jobId = demo.lead_source?.origami_job_id ?? tempId;
        notes.push(`Origami is not configured, sourced by ${demo.lead_provider}`);
        poll = false;
      }
      id = unique(jobId, searches);
      actions.renameSearch(tempId, id);
      actions.updateSearch(id, { step: "search", note: notes.join(" · ") || undefined });

      if (poll) {
        let done = false;
        for (let i = 0; i < POLL_MAX && !done; i += 1) {
          await sleep(POLL_MS);
          const status = await getLeadSourceStatus(jobId);
          actions.updateSearch(id, { step: stepFor(status.phase), note: [...notes, status.phase].filter(Boolean).join(" · ") || undefined });
          if (status.status === "succeeded") done = true;
          else if (status.status === "failed" || status.status === "cancelled") throw new Error(`Sourcing ${status.status}`);
        }
        if (!done) throw new Error("Sourcing did not finish in time");
      }

      let rows: Lead[] = [];
      for (let i = 0; i < FETCH_TRIES; i += 1) {
        rows = await actions.refreshLeads();
        if (rows.some((r) => !known.has(r.id))) break;
        if (i < FETCH_TRIES - 1) await sleep(FETCH_MS);
      }

      // This search shows what the job left on the profile: the rows it added,
      // plus any row no earlier search in this browser had claimed.
      const mine = rows
        .filter((r) => !known.has(r.id) || (!claimed.has(r.id) && !r.searchId))
        .sort((a, b) => a.similarity - b.similarity);
      const fresh = mine.filter((r) => !known.has(r.id)).length;

      for (const [i, row] of mine.entries()) {
        await stagger(ROW_MS);
        actions.landLead({ ...row, searchId: id, landedAt: Date.now() });
        actions.updateSearch(id, { found: i + 1 });
      }

      actions.updateSearch(id, { step: "score" });
      for (let i = 0; i < mine.length; i += 1) {
        await stagger(FILL_MS);
        actions.updateSearch(id, { scored: i + 1 });
      }

      actions.updateSearch(id, { step: "draft" });
      const drafting = [...mine].sort((a, b) => b.similarity - a.similarity).slice(0, count);
      let drafted = 0;
      for (const row of drafting) {
        // Redrafting an approved lead would reset it to review on the API.
        if (!row.draft && row.status !== "approved") {
          const draft = await draftLeadOutreach(row.id);
          actions.patchLead(row.id, {
            draft: { id: draft.id, subject: draft.subject, body: draft.body },
            status: draft.status === "approved" ? "approved" : "drafted",
          });
        }
        drafted += 1;
        actions.updateSearch(id, { drafted });
      }

      actions.updateSearch(id, {
        status: "done",
        elapsedMs: Date.now() - search.startedAt,
        note: [...notes, `${mine.length} on this profile · ${fresh} new`].join(" · "),
      });
      return id;
    } catch (error) {
      actions.updateSearch(id, {
        status: "error",
        elapsedMs: Date.now() - search.startedAt,
        note: [...notes, error instanceof Error ? error.message : "Sourcing failed"].join(" · "),
      });
      return id;
    }
  }, [fast, leads, profile, searches]);

  return { start };
}
