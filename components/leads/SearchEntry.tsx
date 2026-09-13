"use client";

import { Check, ChevronDown } from "lucide-react";
import { icp } from "@/lib/icp";
import type { Lead, Search, SearchStep } from "@/lib/types";
import { Spinner, fmtElapsed, useElapsed } from "../run/WorkingLine";
import { cn } from "../ui";

/* One search in the history: a TraceStep-style block. Ink check when done,
   spinner while running; the sub-steps tick inside while it runs and stay
   expandable afterwards. Selecting an entry shows its rows on the right. */

const STEPS: { id: SearchStep; label: string }[] = [
  { id: "read", label: `Reading your ${icp.wonDeals} won deals` },
  { id: "search", label: "Searching Victoria" },
  { id: "score", label: "Scoring against won deals" },
  { id: "draft", label: "Drafting outreach" },
];

export function SearchEntry({ search, leads, selected, expanded, onSelect, onToggle }: {
  search: Search;
  leads: Lead[];
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const running = search.status === "running";
  const live = useElapsed(search.startedAt, running);
  const ms = running ? live : search.elapsedMs;
  const stepIndex = STEPS.findIndex((s) => s.id === search.step);
  const hot = leads.filter((l) => l.similarity >= 80).length;
  const summary = `${leads.length} leads · ${hot} hot · ${search.drafted} drafts`;
  const excerpt = search.brief.replace(/\s+/g, " ").trim();

  return (
    <li className={cn("rounded-xl transition-colors duration-150", selected && "bg-surface")} style={{ animation: "fade-up 200ms ease-out both" }}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-pressed={selected}
        onClick={() => { onSelect(); onToggle(); }}
        className="flex w-full items-start gap-3 rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <span className={cn("mt-px flex size-7 shrink-0 items-center justify-center rounded-full", running ? "bg-white" : "bg-ink text-white")} style={running ? undefined : { animation: "pop-in 240ms cubic-bezier(0.23,1,0.32,1) both" }}>
          {running ? <Spinner className="size-3.5 border-t-ink" /> : <Check className="size-3.5" strokeWidth={2.5} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-medium text-ink">Search {search.n} · {search.count} companies</span>
            {ms != null && <span className="ml-auto shrink-0 text-[13px] tabular-nums text-faint">{fmtElapsed(ms)}</span>}
            <ChevronDown className="size-3.5 shrink-0 text-faint transition-transform duration-300" strokeWidth={2.2} style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }} />
          </span>
          <span className="mt-0.5 block truncate text-[13.5px] text-soft">{running ? excerpt : summary}</span>
        </span>
      </button>

      <div className="grid transition-[grid-template-rows,opacity] duration-400" style={{ gridTemplateRows: expanded ? "1fr" : "0fr", opacity: expanded ? 1 : 0, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pl-[52px]">
            {!running && <p className="mb-2 line-clamp-2 text-[13.5px] leading-5 text-soft">{excerpt}</p>}
            <div className="flex flex-col gap-0.5">
              {STEPS.slice(0, running ? stepIndex + 1 : STEPS.length).map((s, i) => {
                const done = !running || i < stepIndex;
                return (
                  <div key={s.id} className="flex min-h-7 items-center gap-2" style={{ animation: "fade-up 320ms cubic-bezier(0.23,1,0.32,1) both" }}>
                    {done ? <Check className="size-3.5 shrink-0 text-faint" strokeWidth={2.5} /> : <Spinner />}
                    <span className="min-w-0 truncate text-[14px] text-text">{s.label}</span>
                    {s.id === "search" && (running ? i === stepIndex : false) && <span className="text-[14px] tabular-nums text-ink">{search.found} of {search.count}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
