"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CallRecord } from "./types";
import { actions } from "./store";

// The run is a stream of step events; today they come from timers, the real
// API will emit the same shape over SSE: { stepId, status, progress?, note? }.
// Phase 1 runs on load and stops at the follow-up; phase 2 (ICP, leads,
// outreach) only runs once the extracted fields are approved.
export type StepId = "transcribe" | "extract" | "score" | "draft" | "icp" | "search" | "outreach";
export type StepStatus = "pending" | "running" | "waiting" | "done" | "skipped";
export type StepState = { id: StepId; status: StepStatus; progress?: number; note?: string; startedAt?: number; elapsedMs?: number };

export const PHASE1: StepId[] = ["transcribe", "extract"];
export const PHASE2: StepId[] = ["score", "draft"];
export const PHASE3: StepId[] = ["icp", "search", "outreach"];

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
const DURATION: Record<StepId, number> = { transcribe: 3000, extract: 4000, score: 3000, draft: 3500, icp: 3000, search: 4500, outreach: 3000 };
/** Each sub-item stays visible at least this long before its check. */
const SUB_MIN = 900;
/** Settle after a step completes before the next one expands. */
const SETTLE = 500;

export function useRun(call: CallRecord, opts: { instant?: boolean; startDelay?: number; transcribed?: boolean } = {}) {
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
  const schedule = useCallback((ids: StepId[], t0: number, stopAfter?: { id: StepId; note?: string; wait?: boolean }, onEnd?: () => void) => {
    let t = t0;
    const stopIndex = stopAfter ? ids.indexOf(stopAfter.id) : ids.length - 1;
    ids.forEach((id, i) => {
      if (i > stopIndex) {
        at(t, () => set(id, { status: "skipped", note: i === stopIndex + 1 ? stopAfter?.note : undefined }));
        return;
      }
      const subs = TRACE[id].length;
      const len = Math.max(DURATION[id], subs * SUB_MIN + SUB_MIN);
      const ticks = id === "search" ? 10 : subs;
      at(t, () => { set(id, { status: "running", progress: 0, startedAt: Date.now() }); setOpen(id); });
      for (let n = 1; n <= ticks; n++) at(t + (len / (ticks + 1)) * n, () => set(id, { progress: n }));
      const gate = i === stopIndex && stopAfter?.wait;
      at(t + len, () => {
        set(id, (s) => ({ status: gate ? "waiting" : "done", progress: ticks, elapsedMs: s.startedAt ? Date.now() - s.startedAt : len }));
        if (!gate) setOpen(null);
      });
      t += len + SETTLE;
    });
    at(t, () => onEnd?.());
    return t;
  }, [at, set]);

  const start = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSteps(PHASE1.map((id) => (opts.transcribed && id === "transcribe" ? { id, status: "done", elapsedMs: 2400 } : { id, status: "pending" })));
    setOpen(null);
    setPhase1Done(false);
    actions.resetApprovals(call.id);
    setRunId((n) => n + 1);
    actions.setRun(call.id, "running");
    // No-show: nothing to extract. Otherwise stop at the extraction gate and wait.
    const stop = call.outcome === "no_show" ? { id: "transcribe" as StepId, note: "No conversation to extract. Reschedule note drafted" } : { id: "extract" as StepId, wait: true };
    schedule(opts.transcribed ? PHASE1.filter((id) => id !== "transcribe") : PHASE1, opts.startDelay ?? 200, stop, () => {
      setPhase1Done(true);
      setOpen(call.outcome === "no_show" ? null : "extract");
      actions.setRun(call.id, call.outcome === "no_show" ? "done" : "review");
    });
  }, [call, schedule, opts.startDelay, opts.transcribed]);

  /** Phase 2: after the fields are approved. Scores, drafts, then waits again. */
  const startPhase2 = useCallback(() => {
    set("extract", { status: "done" });
    setOpen(null);
    setSteps((all) => (all.some((s) => s.id === "score") ? all : [...all, ...PHASE2.map((id) => ({ id, status: "pending" as const }))]));
    schedule(PHASE2, SETTLE, { id: "draft", wait: true }, () => setOpen("draft"));
  }, [schedule, set]);

  /** Phase 3: after the follow-up is approved. The timeline grows again. */
  const startPhase3 = useCallback(() => {
    set("draft", { status: "done" });
    setOpen(null);
    setSteps((all) => (all.some((s) => s.id === "icp") ? all : [...all, ...PHASE3.map((id) => ({ id, status: "pending" as const }))]));
    const stop = call.outcome === "lost" ? { id: "icp" as StepId, note: "Not a fit for the ICP. No leads searched" } : undefined;
    schedule(PHASE3, SETTLE, stop, () => actions.setRun(call.id, "done"));
  }, [call, schedule, set]);

  useEffect(() => {
    // Kick the stream off after mount, the way a subscription would.
    const kick = window.setTimeout(start, 0);
    const owned = timers.current;
    return () => { clearTimeout(kick); owned.forEach(clearTimeout); };
  }, [start]);

  const toggle = (id: StepId) => setOpen((o) => (o === id ? null : id));
  return { steps, open, toggle, setOpen, phase1Done, runId, rerun: start, startPhase2, startPhase3 };
}
