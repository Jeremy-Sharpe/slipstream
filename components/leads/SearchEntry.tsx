"use client";

import { Check, ChevronDown, X } from "lucide-react";
import type { Lead, Search, SearchStep } from "@/lib/types";
import { Spinner, fmtDone, fmtElapsed, useElapsed } from "../run/WorkingLine";
import { cn } from "../ui";

/* One search in the history: a TraceStep-style block. Ink check when done,
   spinner while running; the sub-steps tick inside while it runs and stay
   expandable afterwards. Selecting an entry shows its rows on the right. */

const STEPS: { id: SearchStep; label: (wonDeals: number) => string }[] = [
  { id: "read", label: (n) => `Reading your ${n} won deals` },
  { id: "search", label: () => "Searching for matching companies" },
  { id: "score", label: () => "Scoring against won deals" },
  { id: "draft", label: () => "Drafting outreach" },
];

export function SearchEntry({ search, leads, wonDeals, selected, expanded, onSelect, onToggle }: {
  search: Search;
  leads: Lead[];
  wonDeals: number;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const running = search.status === "running";
  const failed = search.status === "error";
  const live = useElapsed(search.startedAt, running);
  const ms = running ? live : search.elapsedMs;
  const stepIndex = STEPS.findIndex((s) => s.id === search.step);
  const hot = leads.filter((l) => l.similarity >= 80).length;
  const drafts = leads.filter((l) => l.status !== "new").length;
  const summary = failed ? search.note ?? "Search failed" : `${leads.length} leads · ${hot} hot · ${drafts} drafts`;
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
        <span className={cn("mt-px flex size-7 shrink-0 items-center justify-center rounded-full", running ? "bg-white" : failed ? "bg-danger-tint text-danger" : "bg-ink text-white")} style={running ? undefined : { animation: "pop-in 240ms cubic-bezier(0.23,1,0.32,1) both" }}>
          {running ? <Spinner className="size-3.5 border-t-ink" /> : failed ? <X className="size-3.5" strokeWidth={2.5} /> : <Check className="size-3.5" strokeWidth={2.5} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-medium text-ink">Search {search.n} · {search.count} companies</span>
            {ms != null && <span className="ml-auto shrink-0 text-[13px] tabular-nums text-faint">{running ? fmtElapsed(ms) : fmtDone(ms)}</span>}
            <ChevronDown className="size-3.5 shrink-0 text-faint transition-transform duration-300" strokeWidth={2.2} style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }} />
          </span>
          <span className={cn("mt-0.5 block truncate text-[13.5px]", failed ? "text-danger" : "text-soft")}>{running ? excerpt : summary}</span>
        </span>
      </button>

      <div className="grid transition-[grid-template-rows,opacity] duration-400" style={{ gridTemplateRows: expanded ? "1fr" : "0fr", opacity: expanded ? 1 : 0, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pl-[52px]">
            {!running && <p className="mb-2 line-clamp-2 text-[13.5px] leading-5 text-soft">{excerpt}</p>}
            <div className="flex flex-col gap-0.5">
              {STEPS.slice(0, running || failed ? stepIndex + 1 : STEPS.length).map((s, i) => {
                const done = (!running && !failed) || i < stepIndex;
                return (
                  <div key={s.id} className="flex min-h-7 items-center gap-2" style={{ animation: "fade-up 320ms cubic-bezier(0.23,1,0.32,1) both" }}>
                    {done ? <Check className="size-3.5 shrink-0 text-faint" strokeWidth={2.5} /> : failed ? <X className="size-3.5 shrink-0 text-danger" strokeWidth={2.5} /> : <Spinner />}
                    <span className="min-w-0 truncate text-[14px] text-text">{s.label(wonDeals)}</span>
                    {s.id === "search" && running && i === stepIndex && <span className="shrink-0 whitespace-nowrap text-[14px] tabular-nums text-ink">{search.found <= search.count ? `${search.found} of ${search.count}` : search.found}</span>}
                    {s.id === "draft" && running && i === stepIndex && <span className="shrink-0 whitespace-nowrap text-[14px] tabular-nums text-ink">{search.drafted}</span>}
                  </div>
                );
              })}
            </div>
            {search.note && <p className={cn("mt-2 text-[13.5px] leading-5", failed ? "text-danger" : "text-soft")}>{search.note}</p>}
          </div>
        </div>
      </div>
    </li>
  );
}
