"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/components/ui";
import { LoaderGrid, Spinner, fmtElapsed, useElapsed } from "./WorkingLine";

/* One step of the agent trace. The label shimmers while working and settles
   with a fade to the done label; the body is an expandable trace with a
   measured left line, staggered rows, and a flat card for the step's output. */

export type TraceStatus = "pending" | "running" | "done" | "skipped";

export function TraceStep({ status, workingLabel, doneLabel, summary, rows = [], rowsDone = 0, startedAt, elapsedMs, expanded, onToggle, last, loader = "spinner", onReveal, children }: {
  status: TraceStatus;
  workingLabel: string;
  doneLabel: string;
  summary?: ReactNode;
  /** Sub-rows of the trace, revealed as `rowsDone` grows. */
  rows?: string[];
  rowsDone?: number;
  startedAt?: number;
  elapsedMs?: number;
  expanded: boolean;
  onToggle: () => void;
  last?: boolean;
  loader?: "spinner" | "grid";
  onReveal?: (el: HTMLElement) => void;
  children?: ReactNode;
}) {
  const itemRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!expanded || !onReveal) return;
    const t = window.setTimeout(() => { if (itemRef.current) onReveal(itemRef.current); }, 450);
    return () => window.clearTimeout(t);
  }, [expanded, status, rowsDone, children, onReveal]);
  const working = status === "running";
  const muted = status === "pending" || status === "skipped";
  const live = useElapsed(startedAt, working);
  const ms = working ? live : elapsedMs;
  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);
  const visible = working ? Math.min(rows.length, Math.max(1, rowsDone)) : rows.length;
  useLayoutEffect(() => { if (traceRef.current) setLineHeight(traceRef.current.offsetHeight); }, [visible, expanded, status, children]);

  return (
    <li ref={itemRef} className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
            status === "done" && "bg-ink text-white",
            working && "bg-surface",
            muted && "border-[1.5px] border-line",
          )}
          style={status === "done" ? { animation: "pop-in 240ms cubic-bezier(0.23,1,0.32,1) both" } : undefined}
        >
          {status === "done" && <Check className="size-3.5" strokeWidth={2.5} />}
          {working && (loader === "grid" ? <LoaderGrid /> : <Spinner className="size-3.5 border-t-ink" />)}
        </span>
        {!last && <span aria-hidden className="mt-1.5 w-px flex-1 bg-line" />}
      </div>

      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-6")}>
        <button
          type="button"
          aria-expanded={expanded}
          disabled={muted}
          onClick={onToggle}
          className="-mx-1.5 flex h-7 w-[calc(100%+12px)] items-center gap-2 rounded-lg px-1.5 text-left transition-colors duration-100 enabled:hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <span role="status" className="contents">
            {working ? (
              <span className="shimmer-text shrink-0 text-[15px] font-medium whitespace-nowrap">{workingLabel}</span>
            ) : (
              <span className={cn("shrink-0 text-[15px] font-medium whitespace-nowrap", muted ? "text-faint" : "text-ink")} style={status === "done" ? { animation: "fade-in 350ms ease-out both" } : undefined}>
                {doneLabel}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-[14px] tabular-nums text-soft">
            {working && ms != null ? <span className="text-faint">{fmtElapsed(ms)}</span> : summary}
            {!working && status === "done" && ms != null && summary && <span className="text-faint"> · {fmtElapsed(ms)}</span>}
          </span>
          {!muted && (
            <ChevronDown className="size-3.5 shrink-0 text-faint transition-transform duration-300" strokeWidth={2.2} style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }} />
          )}
        </button>

        <div
          className="grid transition-[grid-template-rows,opacity] duration-400"
          style={{ gridTemplateRows: expanded ? "1fr" : "0fr", opacity: expanded ? 1 : 0, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
        >
          <div className="overflow-hidden">
            <div className="relative mt-1.5">
              {rows.length > 0 && (
                <div className="relative ml-[5px] pl-4">
                  <span aria-hidden className="absolute left-[3px] top-0 w-px bg-line" style={{ height: lineHeight ? lineHeight - 4 : 0, transition: "height 500ms cubic-bezier(0.23,1,0.32,1)" }} />
                  <div ref={traceRef} className="flex flex-col gap-0.5 py-1">
                    {rows.slice(0, visible).map((row, i) => {
                      const rowDone = !working || i < visible - 1 || rowsDone >= rows.length;
                      return (
                        <div key={row} className="flex min-h-7 items-center gap-2 px-1.5" style={{ animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 120}ms both` }}>
                          {rowDone ? <Check className="size-3.5 shrink-0 text-faint" strokeWidth={2.5} /> : <Spinner />}
                          <span className="min-w-0 truncate text-[14px] text-text">{row}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {children && (
                <div className={cn("rounded-xl bg-surface p-4", rows.length > 0 && "mt-2")} style={{ animation: "fade-up 320ms cubic-bezier(0.23,1,0.32,1) both" }}>
                  {children}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
