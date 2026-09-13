"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { icp } from "@/lib/icp";
import { actions, useStore } from "@/lib/store";
import type { Lead } from "@/lib/types";
import { Avatar } from "./Avatar";
import { WorkingLine } from "./run/WorkingLine";
import { Button, Pill, Score, cn } from "./ui";

type Phase = "idle" | "searching" | "scoring" | "done";

export function LeadsView() {
  const { leads } = useStore();
  const [brief, setBrief] = useState(icp.brief);
  const [count, setCount] = useState(10);
  const [phase, setPhase] = useState<Phase>("idle");
  const [startedAt, setStartedAt] = useState<number>();
  const [shown, setShown] = useState<number>(leads.length);
  const [open, setOpen] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // The search streams rows in one by one, then scores them. Same event
  // shape as the run: { status, progress }.
  const find = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setOpen(null);
    setShown(0);
    setStartedAt(Date.now());
    setPhase("searching");
    const n = Math.min(count, leads.length);
    for (let i = 1; i <= n; i++) timers.current.push(window.setTimeout(() => setShown(i), 350 * i));
    timers.current.push(window.setTimeout(() => setPhase("scoring"), 350 * n + 200));
    timers.current.push(window.setTimeout(() => setPhase("done"), 350 * n + 1400));
  };

  const visible = leads.slice(0, phase === "idle" ? leads.length : shown);
  const pending = leads.filter((l) => l.status !== "approved").length;

  return (
    <div className="pb-24">
      <h1 className="text-[22px] font-semibold text-ink">Leads</h1>
      <p className="mt-1 text-[13.5px] text-soft">Companies like the five you closed.</p>

      <section className="mt-8 rounded-2xl bg-surface-2 p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Brief</p>
          <p className="text-[12.5px] text-faint">From {icp.wonDeals} won deals · ICP v{icp.version}</p>
        </div>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          className="mt-3 w-full resize-none bg-transparent text-[15px] leading-6 text-ink outline-none"
        />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-soft">Find</span>
            <div className="flex h-8 items-center rounded-full bg-white px-1 shadow-[var(--shadow-card)]">
              <button type="button" aria-label="Fewer" onClick={() => setCount((c) => Math.max(5, c - 5))} className="flex size-6 items-center justify-center rounded-full text-soft transition-colors duration-150 hover:bg-surface hover:text-ink"><Minus className="size-3" strokeWidth={2} /></button>
              <span className="w-7 text-center text-[13.5px] tabular-nums text-ink">{count}</span>
              <button type="button" aria-label="More" onClick={() => setCount((c) => Math.min(50, c + 5))} className="flex size-6 items-center justify-center rounded-full text-soft transition-colors duration-150 hover:bg-surface hover:text-ink"><Plus className="size-3" strokeWidth={2} /></button>
            </div>
            <span className="text-[13px] text-soft">companies</span>
          </div>
          <div className="flex items-center gap-3">
            {phase === "searching" && <WorkingLine label="Searching" startedAt={startedAt} detail={`${shown} of ${Math.min(count, leads.length)}`} />}
            {phase === "scoring" && <WorkingLine label="Scoring against won deals" startedAt={startedAt} />}
            {phase === "done" && <span className="text-[13px] text-soft">{shown} leads · scored</span>}
            <Button variant="primary" onClick={find} disabled={phase === "searching" || phase === "scoring"}>Find leads</Button>
          </div>
        </div>
      </section>

      <ul className="mt-6 divide-y divide-line-soft border-y border-line-soft">
        {visible.length === 0 && phase === "searching" && <li className="py-12 text-center text-[14px] text-faint">Searching…</li>}
        {visible.map((l) => (
          <LeadRow key={l.id} lead={l} open={open === l.id} onToggle={() => setOpen((o) => (o === l.id ? null : l.id))} scoring={phase === "searching"} />
        ))}
      </ul>

      <div className="pointer-events-none fixed right-8 bottom-6">
        <Button variant="primary" className="pointer-events-auto shadow-[0_8px_24px_rgba(24,25,37,.12)]" disabled={pending === 0} onClick={() => actions.approveAllLeads()}>
          {pending === 0 ? "All drafts approved" : `Approve all drafts · ${pending}`}
        </Button>
      </div>
    </div>
  );
}

function LeadRow({ lead, open, onToggle, scoring }: { lead: Lead; open: boolean; onToggle: () => void; scoring: boolean }) {
  const [body, setBody] = useState(lead.draft.body);
  return (
    <li className="rise">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="grid h-14 w-full grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_128px_40px_92px_16px] items-center gap-x-4 rounded-lg px-2 text-left transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <span className="flex min-w-0 items-center">
          <span className="truncate text-[14px] font-medium text-ink">{lead.company}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={lead.contact} size={28} />
          <span className="truncate text-[14px] text-ink">{lead.contact}</span>
          <span className="truncate text-[13.5px] text-soft">· {lead.title}</span>
        </span>
        <span className="truncate text-[13.5px] text-soft">{lead.location}</span>
        <span className="text-right">{scoring ? <span className="text-[13.5px] tabular-nums text-faint">…</span> : <Score value={lead.similarity} />}</span>
        <span className="flex items-center">{lead.status === "approved" ? <Pill tone="green">Approved</Pill> : <Pill>Drafted</Pill>}</span>
        <ChevronDown className={cn("size-4 text-faint transition-transform duration-150", open && "rotate-180")} strokeWidth={1.75} />
      </button>
      <div className="grid transition-[grid-template-rows] duration-200 ease-out" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="mb-3 grid grid-cols-2 gap-6 rounded-2xl bg-surface-2 p-5">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Why this matched</p>
              <ul className="mt-3 flex flex-col gap-4">
                {lead.evidence.map((e, i) => (
                  <li key={i} className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3">
                    <p className="pt-px text-[13.5px] text-soft">{e.attribute}</p>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-ink">{e.value}</p>
                      <p className="mt-1 text-[13.5px] leading-5 text-text">“{e.quote}”</p>
                      <p className="mt-0.5 text-[13.5px] text-soft">{e.call} · <span className="tabular-nums">{e.t}</span></p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col">
              <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Outreach draft</p>
              <p className="mt-3 text-[13.5px] font-medium text-ink">{lead.draft.subject}</p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                readOnly={lead.status === "approved"}
                rows={body.split("\n").length + 1}
                className="mt-2 w-full flex-1 resize-none rounded-lg bg-white/70 px-3 py-2 text-[14px] leading-6 text-text outline-none transition-shadow duration-150 focus:ring-2 focus:ring-accent/30"
              />
              <div className="mt-3 flex justify-end">
                {lead.status === "approved" ? <span className="text-[13px] text-soft">Approved · nothing is sent</span> : <Button variant="primary" size="sm" onClick={() => actions.approveLead(lead.id)}>Approve</Button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
