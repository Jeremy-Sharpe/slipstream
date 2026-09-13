"use client";

import { useCallback, useEffect, useRef } from "react";
import { generateLeads } from "./leads";
import { actions, useStore } from "./store";
import { useReducedMotion } from "./useReducedMotion";
import type { Search } from "./types";

/* The Leads search is the same primitive as the call run: timer-driven step
   events written to the store. Four steps, each visible at least 900ms; rows
   land one by one while searching, similarities fill while scoring, drafts
   while drafting; a 500ms settle, then done. `instant` (and reduced motion)
   drop the delays but keep the order. */

const STEP_MIN = 900;
const ROW_MS = 350;
const FILL_MS = 150;
const SETTLE = 500;

export function useLeadSearch(opts: { instant?: boolean } = {}) {
  const { searches } = useStore();
  const reduced = useReducedMotion();
  const fast = !!opts.instant || reduced;
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = useCallback((brief: string, count: number) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const n = searches.length + 1;
    const id = `s${n}`;
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, fast ? 0 : ms));
    const search: Search = { id, n, brief, count, status: "running", step: "read", found: 0, scored: 0, drafted: 0, startedAt: Date.now() };
    actions.addSearch(search);
    // Rows land lowest-similarity first so the best sit on top when it settles.
    const leads = generateLeads(id, n, count).reverse();

    let t = STEP_MIN;
    at(t, () => actions.updateSearch(id, { step: "search" }));
    leads.forEach((l, i) => at(t + ROW_MS * (i + 1), () => { actions.addLead({ ...l, landedAt: Date.now() }); actions.updateSearch(id, { found: i + 1 }); }));
    t += Math.max(STEP_MIN, ROW_MS * (count + 1));
    at(t, () => actions.updateSearch(id, { step: "score" }));
    leads.forEach((_, i) => at(t + FILL_MS * (i + 1), () => actions.updateSearch(id, { scored: i + 1 })));
    t += Math.max(STEP_MIN, FILL_MS * (count + 1));
    at(t, () => actions.updateSearch(id, { step: "draft" }));
    leads.forEach((_, i) => at(t + FILL_MS * (i + 1), () => actions.updateSearch(id, { drafted: i + 1 })));
    t += Math.max(STEP_MIN, FILL_MS * (count + 1)) + SETTLE;
    at(t, () => actions.updateSearch(id, { status: "done", elapsedMs: fast ? 0 : Date.now() - search.startedAt }));
    return id;
  }, [searches.length, fast]);

  return { start };
}
