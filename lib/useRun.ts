"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CallRecord } from "./types";
import { actions } from "./store";

// The run is a stream of step events. Today they come from timers; the real
// API will emit the same shape over SSE:
//   { stepId, status: "running" | "done" | "skipped", progress?, note? }
export type StepId = "transcribe" | "extract" | "score" | "draft" | "icp" | "search" | "outreach";
export type StepStatus = "pending" | "running" | "done" | "skipped";
export type StepState = { id: StepId; status: StepStatus; progress?: number; note?: string; startedAt?: number; elapsedMs?: number };

export const ORDER: StepId[] = ["transcribe", "extract", "score", "draft", "icp", "search", "outreach"];

/** Sub-rows shown in each step's trace while it works. */
export const TRACE: Record<StepId, string[]> = {
  transcribe: ["Diarising speakers", "Aligning timestamps"],
  extract: ["Reading the transcript", "Finding contact and company", "Deal stage, value and next step", "Promises and objections"],
  score: ["Counting discovery questions", "Checking for a dated next step", "Reading the objection", "Talk ratio"],
  draft: ["Pulling what was promised", "Writing the follow-up"],
  icp: ["Comparing with the 5 won deals", "Updating the profile"],
  search: [],
  outreach: ["Matching each lead to a won call", "Writing five drafts"],
};

const DURATION: Record<StepId, number> = { transcribe: 900, extract: 1800, score: 1500, draft: 1200, icp: 1100, search: 3800, outreach: 1300 };

function plan(call: CallRecord): { stop?: { after: StepId; note: string } } {
  if (call.outcome === "no_show") return { stop: { after: "transcribe", note: "No conversation to extract — reschedule note drafted" } };
  if (call.outcome === "lost") return { stop: { after: "icp", note: "Not a fit for the ICP — no leads searched" } };
  return {};
}

export function useRun(call: CallRecord) {
  const [steps, setSteps] = useState<StepState[]>(() => ORDER.map((id) => ({ id, status: "pending" })));
  const [open, setOpen] = useState<StepId | null>(null);
  const [finished, setFinished] = useState(false);
  const [runId, setRunId] = useState(0);
  const timers = useRef<number[]>([]);

  const set = useCallback((id: StepId, patch: Partial<StepState> | ((s: StepState) => Partial<StepState>)) => {
    setSteps((all) => all.map((st) => (st.id === id ? { ...st, ...(typeof patch === "function" ? patch(st) : patch) } : st)));
  }, []);

  const start = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSteps(ORDER.map((id) => ({ id, status: "pending" })));
    setFinished(false);
    setOpen(null);
    setRunId((n) => n + 1);
    actions.setRun(call.id, "running");
    const { stop } = plan(call);
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    const stopIndex = stop ? ORDER.indexOf(stop.after) : ORDER.length - 1;
    let t = 250;
    ORDER.forEach((id, i) => {
      if (i > stopIndex) {
        at(t, () => set(id, { status: "skipped", note: i === stopIndex + 1 ? stop?.note : undefined }));
        return;
      }
      const preDone = id === "transcribe" && (call.fileName || call.pasted);
      if (preDone) {
        at(t, () => set(id, { status: "done", elapsedMs: 0 }));
        t += 150;
        return;
      }
      const len = DURATION[id];
      const ticks = id === "search" ? 10 : TRACE[id].length;
      at(t, () => { set(id, { status: "running", progress: 0, startedAt: Date.now() }); setOpen(id); });
      for (let n = 1; n <= ticks; n++) at(t + (len / (ticks + 1)) * n, () => set(id, { progress: n }));
      at(t + len, () => set(id, (s) => ({ status: "done", progress: ticks, elapsedMs: s.startedAt ? Date.now() - s.startedAt : len })));
      // linger open for a beat after settling, then collapse (the next step opens itself)
      t += len + 350;
    });
    at(t, () => { setFinished(true); setOpen(stop?.after === "transcribe" ? "transcribe" : "extract"); actions.setRun(call.id, "review"); });
  }, [call, set]);

  useEffect(() => {
    // Kick the stream off after mount, the way a subscription would.
    const kick = window.setTimeout(start, 0);
    const owned = timers.current;
    return () => { clearTimeout(kick); owned.forEach(clearTimeout); };
  }, [start]);

  const toggle = (id: StepId) => setOpen((o) => (o === id ? null : id));
  return { steps, open, toggle, finished, runId, rerun: start };
}
