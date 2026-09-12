"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CallRecord } from "./types";
import { actions } from "./store";

// The run is a stream of step events. Today they come from timers; the real
// API will emit the same shape over SSE: { stepId, status, progress?, note? }.
export type StepId = "transcribe" | "extract" | "score" | "draft" | "icp" | "search" | "outreach";
export type StepStatus = "pending" | "running" | "done" | "skipped";
export type StepState = { id: StepId; status: StepStatus; progress?: number; note?: string };

const ORDER: StepId[] = ["transcribe", "extract", "score", "draft", "icp", "search", "outreach"];

function plan(call: CallRecord): { steps: StepId[]; stop?: { after: StepId; note: string } } {
  if (call.outcome === "no_show") return { steps: ORDER, stop: { after: "transcribe", note: "No conversation to extract — reschedule note drafted" } };
  if (call.outcome === "lost") return { steps: ORDER, stop: { after: "icp", note: "Not a fit for the ICP — no leads searched" } };
  return { steps: ORDER };
}

export function useRun(call: CallRecord) {
  const [steps, setSteps] = useState<StepState[]>(() => ORDER.map((id) => ({ id, status: "pending" })));
  const [open, setOpen] = useState<StepId | null>(null);
  const [finished, setFinished] = useState(false);
  const timers = useRef<number[]>([]);

  const set = useCallback((id: StepId, patch: Partial<StepState>) => {
    setSteps((s) => s.map((st) => (st.id === id ? { ...st, ...patch } : st)));
  }, []);

  const start = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSteps(ORDER.map((id) => ({ id, status: "pending" })));
    setFinished(false);
    setOpen(null);
    actions.setRun(call.id, "running");
    const { stop } = plan(call);
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    let t = 200;
    const stopIndex = stop ? ORDER.indexOf(stop.after) : ORDER.length - 1;
    ORDER.forEach((id, i) => {
      if (i > stopIndex) {
        at(t, () => set(id, { status: "skipped", note: i === stopIndex + 1 ? stop?.note : undefined }));
        return;
      }
      if (id === "search") {
        at(t, () => { set(id, { status: "running", progress: 0 }); setOpen(id); });
        for (let n = 1; n <= 10; n++) at(t + 350 * n, () => set(id, { progress: n }));
        t += 350 * 10 + 300;
        at(t, () => set(id, { status: "done", progress: 10 }));
        t += 400;
        return;
      }
      if (id === "transcribe" && (call.fileName || call.pasted)) {
        at(t, () => set(id, { status: "done" }));
        t += 150;
        return;
      }
      at(t, () => { set(id, { status: "running" }); setOpen(id); });
      const len = id === "transcribe" ? 500 : id === "outreach" ? 900 : 800;
      at(t + len, () => set(id, { status: "done" }));
      t += len + 250;
    });
    at(t, () => { setFinished(true); setOpen("extract"); actions.setRun(call.id, "review"); });
  }, [call, set]);

  useEffect(() => {
    // Kick the stream off after mount, the way a subscription would.
    const kick = window.setTimeout(start, 0);
    const owned = timers.current;
    return () => { clearTimeout(kick); owned.forEach(clearTimeout); };
  }, [start]);

  const toggle = (id: StepId) => setOpen((o) => (o === id ? null : id));
  return { steps, open, toggle, finished, rerun: start };
}
