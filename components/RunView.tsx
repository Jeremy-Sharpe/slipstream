"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type { CallRecord } from "@/lib/types";
import { useRun } from "@/lib/useRun";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Avatar } from "./Avatar";
import { RunTimeline } from "./RunTimeline";
import { Summary } from "./run/Summary";
import { Transcript } from "./Transcript";
import { Button, OutcomePill, cn, fmtDate, fmtTime, mmss } from "./ui";

export function RunView({ call }: { call: CallRecord }) {
  const params = useSearchParams();
  const reduced = useReducedMotion();
  const instant = params.get("instant") === "1" || reduced;
  const staged = params.get("from") === "home" && !reduced;
  const transcribed = params.get("transcribed") === "1";
  const run = useRun(call, { instant, startDelay: staged ? 500 : 200, transcribed });
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

  // Editable draft body, reset when the run restarts (state adjusted during render).
  const [draftBody, setDraftBody] = useState(call.draft.body);
  const [seenRun, setSeenRun] = useState(run.runId);
  if (seenRun !== run.runId) { setSeenRun(run.runId); setDraftBody(call.draft.body); }


  // The right column is sticky and scrolls internally: its height is the
  // viewport minus the header above the grid (measured) minus 48px.
  const gridRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const measure = () => { const el = gridRef.current; if (el) setHeaderHeight(el.getBoundingClientRect().top + window.scrollY); };
    measure();
    const ro = new ResizeObserver(measure);
    if (gridRef.current?.parentElement) ro.observe(gridRef.current.parentElement);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  // The timeline scroll area never ends on a row boundary: it is sized so the
  // last visible row is cut about mid-height (a peek at what is below), and a
  // bottom fade shows only while there is more to scroll.
  const sectionRef = useRef<HTMLElement>(null);
  const ciRef = useRef<HTMLDivElement>(null);
  const [timelineHeight, setTimelineHeight] = useState<number | null>(null);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const section = sectionRef.current, ci = ciRef.current, host = columnRef.current;
    if (!section || !ci || !host) return;
    const measure = () => {
      const available = section.clientHeight - ci.offsetHeight - 16;
      const rows = host.querySelectorAll<HTMLElement>("li[data-step]");
      const first = rows[0];
      const pitch = rows.length > 1 ? rows[1].getBoundingClientRect().top - first.getBoundingClientRect().top : 53;
      const lead = first ? first.getBoundingClientRect().top - host.getBoundingClientRect().top + host.scrollTop : 30;
      const fit = Math.max(1, Math.floor((available - lead - pitch * 0.55) / pitch));
      setTimelineHeight(Math.min(available, lead + fit * pitch + pitch * 0.55));
      setFade(host.scrollHeight - host.clientHeight - host.scrollTop > 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(section); ro.observe(ci); if (host.firstElementChild) ro.observe(host.firstElementChild as Element);
    for (const child of host.children) ro.observe(child);
    const onScroll = () => setFade(host.scrollHeight - host.clientHeight - host.scrollTop > 2);
    host.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", measure);
    return () => { ro.disconnect(); host.removeEventListener("scroll", onScroll); window.removeEventListener("resize", measure); document.removeEventListener("visibilitychange", measure); };
  }, [run.runId]);

  // Reveal a step inside the timeline only when the pointer is NOT inside the
  // column and the user hasn't wheel/touch-scrolled it in the last 3s.
  // Nothing ever scrolls under a resting pointer.
  const userScrolledAt = useRef(0);
  const pointerInside = useRef(false);
  const programmatic = useRef(false);
  useEffect(() => {
    const host = columnRef.current;
    if (!host) return;
    const onUser = () => { userScrolledAt.current = Date.now(); };
    const onEnter = () => { pointerInside.current = true; };
    const onLeave = () => { pointerInside.current = false; };
    host.addEventListener("wheel", onUser, { passive: true });
    host.addEventListener("touchmove", onUser, { passive: true });
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    return () => { host.removeEventListener("wheel", onUser); host.removeEventListener("touchmove", onUser); host.removeEventListener("pointerenter", onEnter); host.removeEventListener("pointerleave", onLeave); };
  }, []);
  const reveal = useCallback((el: HTMLElement) => {
    const host = columnRef.current;
    if (!host || pointerInside.current || Date.now() - userScrolledAt.current < 3000) return;
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
            <span>{call.company}</span>
          </h1>
          <p className="mt-0.5 flex h-6 items-center gap-2 text-[13px] text-soft">
            <OutcomePill outcome={call.outcome} />
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
          ref={sectionRef}
          className="sticky top-6 flex flex-col gap-4 self-start"
          style={{ height: headerHeight ? `calc(100vh - ${headerHeight}px - 48px)` : "calc(100vh - 48px)", ...enter(240) }}
        >
          <div ref={ciRef} className="shrink-0">
            <Summary call={call} runId={run.runId} ready={["done", "waiting"].includes(run.steps.find((s) => s.id === "draft")?.status ?? "")} onHighlight={setHover} onJump={jump} />
          </div>
          <div
            ref={columnRef}
            className={cn("run-column min-h-0 shrink-0 overflow-y-auto pr-3", fade && "run-column-fade")}
            style={{ height: timelineHeight ?? undefined, flex: timelineHeight == null ? "1 1 0%" : undefined, overscrollBehavior: "contain", overflowAnchor: "none" }}
          >
          <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">What Slipstream did</h2>
          <RunTimeline
            call={call}
            steps={run.steps}
            open={run.open}
            toggle={run.toggle}
            runId={run.runId}
            draftBody={draftBody}
            setDraftBody={setDraftBody}
            onHighlight={setHover}
            onJump={jump}
            onReveal={reveal}
            onSynced={run.startPhase2}
            onDraftApproved={run.startPhase3}
          />
          </div>
        </section>
      </div>
    </div>
  );
}
