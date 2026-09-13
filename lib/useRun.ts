"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CallRecord } from "./types";
import { actions } from "./store";

// The run is a stream of step events; today they come from timers, the real
// API will emit the same shape over SSE: { stepId, status, progress?, note? }.
// Phase 1 runs on load and stops at the follow-up; phase 2 (ICP, leads,
// outreach) only runs once the extracted fields are approved.
export type StepId = "transcribe" | "extract" | "score" | "draft" | "icp" | "search" | "outreach";
export type StepStatus = "pending" | "running" | "done" | "skipped";
export type StepState = { id: StepId; status: StepStatus; progress?: number; note?: string; startedAt?: number; elapsedMs?: number };

export const PHASE1: StepId[] = ["transcribe", "extract", "score", "draft"];
export const PHASE2: StepId[] = ["icp", "search", "outreach"];

/** Sub-items ticked off while each step works. */
export const TRACE: Record<StepId, string[]> = {
  transcribe: ["Diarising speakers", "Aligning timestamps"],
  extract: ["Reading the transcript", "Finding contact and company", "Deal stage, value and next step"],
  score: ["Counting discovery questions", "Checking for a dated next step", "Reading the objection"],
  draft: ["Pulling what was promised", "Writing the follow-up"],
  icp: ["Comparing with the 5 won deals", "Updating the profile"],
  search: ["Searching Victoria", "Scoring against won deals", "Ranking by similarity"],
  outreach: ["Matching each lead to a won call", "Writing five drafts"],
};

/** Minimum visible duration per step, even when the work is instant. */
const DURATION: Record<StepId, number> = { transcribe: 1400, extract: 1800, score: 1200, draft: 1600, icp: 1400, search: 2200, outreach: 1600 };

export function useRun(call: CallRecord, opts: { instant?: boolean } = {}) {
  const [steps, setSteps] = useState<StepState[]>([]);
  const [open, setOpen] = useState<StepId | null>(null);
  const [phase1Done, setPhase1Done] = useState(false);
  const [runId, setRunId] = useState(0);
  const timers = useRef<number[]>([]);
  const instant = !!opts.instant;

  const set = useCallback((id: StepId, patch: Partial<StepState> | ((s: StepState) => Partial<StepState>)) => {
    setSteps((all) => all.map((st) => (st.id === id ? { ...st, ...(typeof patch === "function" ? patch(st) : patch) } : st)));
  }, []);

  const at = useCallback((ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, instant ? 0 : ms)); }, [instant]);

  /** Schedules a list of steps back to back; returns the total time. */
  const schedule = useCallback((ids: StepId[], t0: number, stopAfter?: { id: StepId; note: string }, onEnd?: () => void) => {
    let t = t0;
    const stopIndex = stopAfter ? ids.indexOf(stopAfter.id) : ids.length - 1;
    ids.forEach((id, i) => {
      if (i > stopIndex) {
        at(t, () => set(id, { status: "skipped", note: i === stopIndex + 1 ? stopAfter?.note : undefined }));
        return;
      }
      const len = DURATION[id];
      const ticks = id === "search" ? 10 : TRACE[id].length;
      at(t, () => { set(id, { status: "running", progress: 0, startedAt: Date.now() }); setOpen(id); });
      for (let n = 1; n <= ticks; n++) at(t + (len / (ticks + 1)) * n, () => set(id, { progress: n }));
      at(t + len, () => { set(id, (s) => ({ status: "done", progress: ticks, elapsedMs: s.startedAt ? Date.now() - s.startedAt : len })); setOpen(null); });
      t += len + 200;
    });
    at(t, () => onEnd?.());
    return t;
  }, [at, set]);

  const start = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSteps(PHASE1.map((id) => ({ id, status: "pending" })));
    setOpen(null);
    setPhase1Done(false);
    setRunId((n) => n + 1);
    actions.setRun(call.id, "running");
    const stop = call.outcome === "no_show" ? { id: "transcribe" as StepId, note: "No conversation to extract. Reschedule note drafted" } : undefined;
    schedule(PHASE1, 200, stop, () => {
      setPhase1Done(true);
      setOpen(stop ? null : "extract");
      actions.setRun(call.id, stop ? "done" : "review");
    });
  }, [call, schedule]);

  /** Phase 2: only after the fields are approved. The timeline grows here. */
  const startPhase2 = useCallback(() => {
    setSteps((all) => (all.some((s) => s.id === "icp") ? all : [...all, ...PHASE2.map((id) => ({ id, status: "pending" as const }))]));
    const stop = call.outcome === "lost" ? { id: "icp" as StepId, note: "Not a fit for the ICP. No leads searched" } : undefined;
    schedule(PHASE2, 300, stop, () => actions.setRun(call.id, "done"));
  }, [call, schedule]);

  useEffect(() => {
    // Kick the stream off after mount, the way a subscription would.
    const kick = window.setTimeout(start, 0);
    const owned = timers.current;
    return () => { clearTimeout(kick); owned.forEach(clearTimeout); };
  }, [start]);

  const toggle = (id: StepId) => setOpen((o) => (o === id ? null : id));
  return { steps, open, toggle, setOpen, phase1Done, runId, rerun: start, startPhase2 };
}
