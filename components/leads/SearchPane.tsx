"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { icp } from "@/lib/icp";
import type { Lead, Search } from "@/lib/types";
import { Button } from "../ui";
import { SearchEntry } from "./SearchEntry";

/* Left pane: the brief editor on top, the run history under it (newest first). */
export function SearchPane({ searches, leads, selectedId, onSelect, onFind, busy }: {
  searches: Search[];
  leads: Lead[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onFind: (brief: string, count: number) => void;
  busy: boolean;
}) {
  const [brief, setBrief] = useState(icp.brief);
  const [count, setCount] = useState(10);
  const [expanded, setExpanded] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow to eight lines.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(8 * 22, el.scrollHeight)}px`;
  }, [brief]);

  // The running search stays expanded; a finished one collapses (state adjusted during render).
  const running = searches.find((s) => s.status === "running")?.id ?? null;
  const [seenRunning, setSeenRunning] = useState<string | null>(running);
  if (seenRunning !== running) { setSeenRunning(running); setExpanded(running); }

  const find = () => { if (!busy && brief.trim()) onFind(brief.trim(), count); };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="shrink-0 rounded-2xl bg-surface-2 p-4">
        <textarea
          id="brief"
          aria-label="Brief"
          ref={areaRef}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) { e.preventDefault(); find(); } }}
          rows={1}
          className="w-full resize-none overflow-y-auto bg-transparent text-[14px] leading-[22px] text-ink outline-none"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-soft">Find</span>
            <div className="flex h-8 items-center rounded-full bg-white px-1 shadow-[var(--shadow-card)]">
              <button type="button" aria-label="Fewer" onClick={() => setCount((c) => Math.max(5, c - 5))} className="flex size-6 items-center justify-center rounded-full text-soft transition-colors duration-150 hover:bg-surface hover:text-ink"><Minus className="size-3" strokeWidth={2} /></button>
              <span className="w-7 text-center text-[13.5px] tabular-nums text-ink">{count}</span>
              <button type="button" aria-label="More" onClick={() => setCount((c) => Math.min(20, c + 5))} className="flex size-6 items-center justify-center rounded-full text-soft transition-colors duration-150 hover:bg-surface hover:text-ink"><Plus className="size-3" strokeWidth={2} /></button>
            </div>
            <span className="text-[13px] text-soft">companies</span>
          </div>
          <Button variant="primary" onClick={find} disabled={busy}>Find leads</Button>
        </div>
        <p className="mt-3 text-[12px] text-faint">From {icp.wonDeals} won deals</p>
      </section>

      <h2 className="mt-6 mb-2 shrink-0 px-3 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Searches</h2>
      <ol className="run-column min-h-0 flex-1 overflow-y-auto pb-6" style={{ overscrollBehavior: "contain" }}>
        {searches.map((s) => (
          <SearchEntry
            key={s.id}
            search={s}
            leads={leads.filter((l) => l.searchId === s.id)}
            selected={selectedId === s.id}
            expanded={expanded === s.id}
            onSelect={() => onSelect(s.id)}
            onToggle={() => setExpanded((e) => (e === s.id ? null : s.id))}
          />
        ))}
      </ol>
    </div>
  );
}
