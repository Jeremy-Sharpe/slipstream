"use client";

import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/components/ui";
import type { Beat as BeatRecord } from "@/lib/loop";
import { Preview } from "./Preview";

/* One beat of the loop: the static twin of TraceStep. Ink check, hairline
   connector, "01 Listen" with what happened as the summary, and a flat card
   that expands to the artefact itself. Nothing streams. */

export function Beat({ beat, expanded, onToggle, last }: { beat: BeatRecord; expanded: boolean; onToggle: () => void; last?: boolean }) {
  return (
    <li id={`beat-${beat.n}`} className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-white">
          <Check className="size-3.5" strokeWidth={2.5} />
        </span>
        {!last && <span aria-hidden className="mt-1.5 w-px flex-1 bg-line" />}
      </div>

      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-6")}>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
          className="-mx-1.5 flex h-8 w-[calc(100%+12px)] items-center gap-2 rounded-lg px-1.5 text-left transition-colors duration-100 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <span className="shrink-0 text-[15px] font-medium whitespace-nowrap text-ink">
            <span className="mr-2 tabular-nums text-faint">{beat.n}</span>
            {beat.verb}
          </span>
          <span className="min-w-0 flex-1 truncate text-[14px] text-soft">{beat.what}</span>
          <ChevronDown className="size-3.5 shrink-0 text-faint transition-transform duration-300" strokeWidth={2.2} style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }} />
        </button>

        <div
          className="grid transition-[grid-template-rows,opacity] duration-400"
          style={{ gridTemplateRows: expanded ? "1fr" : "0fr", opacity: expanded ? 1 : 0, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
        >
          <div className="overflow-hidden">
            <div className="mt-1.5 rounded-xl bg-surface p-4">
              <Preview preview={beat.preview} />
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex h-6 items-center rounded-full border border-line px-2.5 text-[12px] font-medium leading-none text-soft">{beat.provenance}</span>
                <Link
                  href={beat.evidence.href}
                  className="inline-flex h-6 items-center rounded-full border border-line bg-white px-2.5 text-[12px] font-medium leading-none text-ink transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {beat.evidence.label} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
