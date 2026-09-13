"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type { CallRecord } from "@/lib/types";
import { useRun, type StepId } from "@/lib/useRun";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Avatar, CompanyTile } from "./Avatar";
import { RunTimeline } from "./RunTimeline";
import { Summary } from "./run/Summary";
import { Transcript } from "./Transcript";
import { Button, OutcomePill, fmtDate, fmtTime, mmss } from "./ui";

export function RunView({ call }: { call: CallRecord }) {
  const params = useSearchParams();
  const reduced = useReducedMotion();
  const instant = params.get("instant") === "1" || reduced;
  const staged = params.get("from") === "home" && !reduced;
  const run = useRun(call, { instant, startDelay: staged ? 500 : 200 });
  const enter = (delay: number) => (staged ? { animation: `fade-up 250ms cubic-bezier(0.23,1,0.32,1) ${delay}ms both` } : undefined);

  // Transcript highlight: hover tints the turn in place (never scrolls); a
  // click scrolls the page to the turn and highlights it for 1.5s.
  const [hover, setHoverState] = useState<number | null>(null);
  const [clicked, setClicked] = useState<number | null>(null);
  const clickTimer = useRef<number>(0);
  const pageScrolling = useRef(false);
  const lastPointerMove = useRef(0);
  useEffect(() => {
    const onMove = () => { lastPointerMove.current = Date.now(); };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  // Hovers caused by content moving under a still pointer (our own scrolls,
  // streaming layout shifts) don't count: the pointer must have moved recently.
  const setHover = useCallback((i: number | null) => {
    if (i === null) { setHoverState(null); return; }
    if (pageScrolling.current) return;
    if (Date.now() - lastPointerMove.current > 150) return;
    setHoverState(i);
  }, []);
  const jump = useCallback((i: number) => {
    window.clearTimeout(clickTimer.current);
    setClicked(i);
    setHoverState(null);
    clickTimer.current = window.setTimeout(() => setClicked(null), 1500);
    const el = document.querySelector<HTMLElement>(`[data-turn="${i}"]`);
    if (!el) return;
    pageScrolling.current = true;
    const done = () => { pageScrolling.current = false; window.removeEventListener("scrollend", done); };
    window.addEventListener("scrollend", done, { once: true });
    window.setTimeout(done, 600);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);
  const highlight = clicked ?? hover;

  // Draft body (editable, replaced by the "shorter" chip) and a brief step outline.
  const [draftBody, setDraftBody] = useState(call.draft.body);
  const [outlined, setOutlined] = useState<StepId | null>(null);
  // Reset the draft when the run restarts (state adjusted during render).
  const [seenRun, setSeenRun] = useState(run.runId);
  if (seenRun !== run.runId) { setSeenRun(run.runId); setDraftBody(call.draft.body); }
  const shorterDraft = () => {
    setDraftBody(call.draftShort.body);
    run.setOpen("draft");
    setOutlined("draft");
    window.setTimeout(() => setOutlined(null), 1200);
  };

  const extractStatus = run.steps.find((s) => s.id === "extract")?.status;
  const extractDone = extractStatus === "done" || extractStatus === "waiting";

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
    if (r.top >= h.top && r.bottom <= h.bottom) return;
    const target = r.top < h.top ? host.scrollTop + (r.top - h.top) - 16 : host.scrollTop + (r.bottom - h.bottom) + 16;
    programmatic.current = true;
    pageScrolling.current = true;
    host.scrollTo({ top: Math.max(0, target), behavior: reduced ? "auto" : "smooth" });
    window.setTimeout(() => { programmatic.current = false; pageScrolling.current = false; }, 600);
  }, [reduced]);

  return (
    <div>
      <div style={enter(0)}>
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
          <p className="mt-0.5 flex h-6 items-center gap-2 text-[13px] text-soft">
            {extractDone && <span style={{ animation: "fade-in 200ms ease-out both" }}><OutcomePill outcome={call.outcome} /></span>}
            <span>{call.rep}</span>
            <span className="text-faint">·</span>
            <span className="text-[13.5px] tabular-nums">{fmtDate(call.at)} · {fmtTime(call.at)} · {mmss(call.duration)}</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={run.rerun}><RotateCcw className="size-3.5" strokeWidth={1.75} /> Re-run</Button>
      </div>
      </div>

      <div ref={gridRef} className="mt-8 grid grid-cols-[minmax(0,1fr)_440px] gap-10">
        <section style={enter(120)}>
          <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Transcript</h2>
          <Transcript turns={call.turns} highlight={highlight} />
        </section>
        <section
          ref={columnRef}
          className="run-column sticky top-6 self-start overflow-y-auto pr-3 pb-6"
          style={{ height: headerHeight ? `calc(100vh - ${headerHeight}px - 48px)` : "calc(100vh - 48px)", overscrollBehavior: "contain", ...enter(240) }}
        >
          <Summary call={call} runId={run.runId} ready={run.steps.find((s) => s.id === "draft")?.status === "done"} onHighlight={setHover} onJump={jump} onShorterDraft={shorterDraft} />
          <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">What Slipstream did</h2>
          <RunTimeline
            call={call}
            steps={run.steps}
            open={run.open}
            toggle={run.toggle}
            runId={run.runId}
            draftBody={draftBody}
            setDraftBody={setDraftBody}
            highlightStep={outlined}
            onHighlight={setHover}
            onJump={jump}
            onReveal={reveal}
            onSynced={run.startPhase2}
          />
        </section>
      </div>
    </div>
  );
}
