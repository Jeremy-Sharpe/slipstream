"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type { CallRecord } from "@/lib/types";
import { useRun } from "@/lib/useRun";
import { Avatar, CompanyTile } from "./Avatar";
import { RunTimeline } from "./RunTimeline";
import { Summary } from "./run/Summary";
import { Transcript } from "./Transcript";
import { Button, OutcomePill, fmtDate, fmtTime, mmss } from "./ui";

export function RunView({ call }: { call: CallRecord }) {
  const fromHome = useSearchParams().get("from") === "home";
  const run = useRun(call, { fromHome });
  const [highlight, setHighlight] = useState<number | null>(null);

  // The right column is sticky and scrolls internally: its height is the
  // viewport minus the header above the grid (measured) minus 48px.
  const gridRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const measure = () => { const el = gridRef.current; if (el) setHeaderHeight(el.getBoundingClientRect().top + window.scrollY); };
    measure();
    const ro = new ResizeObserver(measure);
    if (gridRef.current?.parentElement) ro.observe(gridRef.current.parentElement);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  // Reveal a step inside the column only, and never fight a user who just scrolled it.
  const userScrolledAt = useRef(0);
  const programmatic = useRef(false);
  useEffect(() => {
    const host = columnRef.current;
    if (!host) return;
    const onScroll = () => { if (!programmatic.current) userScrolledAt.current = Date.now(); };
    host.addEventListener("scroll", onScroll, { passive: true });
    return () => host.removeEventListener("scroll", onScroll);
  }, []);
  const reveal = useCallback((el: HTMLElement) => {
    const host = columnRef.current;
    if (!host || Date.now() - userScrolledAt.current < 3000) return;
    const h = host.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.top >= h.top && r.bottom <= h.bottom) return; // already in view
    const target = r.top < h.top ? host.scrollTop + (r.top - h.top) - 16 : host.scrollTop + (r.bottom - h.bottom) + 16;
    programmatic.current = true;
    host.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    window.setTimeout(() => { programmatic.current = false; }, 600);
  }, []);

  return (
    <div style={{ animation: "fade-up 200ms cubic-bezier(0.23,1,0.32,1) both" }}>
      <Link href="/calls" className="inline-flex items-center gap-1.5 text-[13px] text-soft transition-colors duration-150 hover:text-ink">
        <ArrowLeft className="size-3.5" strokeWidth={1.75} /> Calls
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <Avatar name={call.contact} size={36} />
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-[20px] font-semibold text-ink">
            {call.contact}
            <span className="font-normal text-faint">·</span>
            <CompanyTile name={call.company} size={22} />
            <span>{call.company}</span>
          </h1>
          <p className="mt-0.5 flex items-center gap-2 text-[13px] text-soft">
            <OutcomePill outcome={call.outcome} />
            <span>{call.rep}</span>
            <span className="text-faint">·</span>
            <span className="text-[13.5px] tabular-nums">{fmtDate(call.at)} · {fmtTime(call.at)} · {mmss(call.duration)}</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={run.rerun}><RotateCcw className="size-3.5" strokeWidth={1.75} /> Re-run</Button>
      </div>

      <div ref={gridRef} className="mt-8 grid grid-cols-[minmax(0,1fr)_440px] gap-10">
        <section>
          <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Transcript</h2>
          <Transcript turns={call.turns} highlight={highlight} />
        </section>
        <section
          ref={columnRef}
          className="run-column sticky top-6 self-start overflow-y-auto pr-3 pb-6"
          style={{ height: headerHeight ? `calc(100vh - ${headerHeight}px - 48px)` : "calc(100vh - 48px)", overscrollBehavior: "contain" }}
        >
          <Summary call={call} runId={run.runId} ready={run.steps.find((s) => s.id === "score")?.status === "done"} onHighlight={setHighlight} />
          <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">What Slipstream did</h2>
          <RunTimeline call={call} steps={run.steps} open={run.open} toggle={run.toggle} runId={run.runId} onHighlight={setHighlight} onReveal={reveal} />
        </section>
      </div>
    </div>
  );
}
