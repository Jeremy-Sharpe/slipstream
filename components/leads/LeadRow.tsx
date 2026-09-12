"use client";

import { ChevronRight, ExternalLink } from "lucide-react";
import type { Draft, Lead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { LeadExpansion } from "./LeadExpansion";
import { ScoreBar } from "./ScoreBar";

const CELL = "h-11 border-r border-b border-line px-4 text-sm text-ink truncate";

export function LeadRow({ lead, index, open, onToggle, onDraftChange, onApprove }: {
  lead: Lead;
  index: number;
  open: boolean;
  onToggle: () => void;
  onDraftChange: (draft: Draft) => void;
  onApprove: () => void;
}) {
  return (
    <>
      <tr
        tabIndex={0}
        role="button"
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onToggle(); } }}
        className="cursor-pointer outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal"
      >
        <td className={cn(CELL, "px-0")}>
          <span className="flex h-full items-center gap-1 pl-3 text-muted-foreground">
            <ChevronRight className={cn("size-3.5 transition-transform duration-150", open && "rotate-90")} strokeWidth={2} />
            <span className="text-sm tabular-nums">{index + 1}</span>
          </span>
        </td>
        <td className={CELL}>{lead.company}</td>
        <td className={CELL}>
          <span className="flex items-center gap-2">
            <span className="truncate">{lead.person}</span>
            {lead.linkedin_url && (
              <>
                <span className="text-muted-foreground">·</span>
                <a
                  href={lead.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${lead.person} on LinkedIn`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" strokeWidth={1.75} />
                </a>
              </>
            )}
          </span>
        </td>
        <td className={cn(CELL, "text-ink-2")}>{lead.title}</td>
        <td className={cn(CELL, "text-ink-2")}>{lead.location}</td>
        <td className={CELL}><span className="flex h-full items-center"><ScoreBar value={lead.relevance_score} /></span></td>
        <td className={CELL}><span className="flex h-full items-center"><ScoreBar value={lead.similarity} /></span></td>
        <td className={CELL}><span className="flex h-full items-center"><Badge status={lead.status} /></span></td>
        <td className="h-11 border-b border-line" />
      </tr>
      <tr aria-hidden={!open}>
        <td colSpan={9} className="p-0">
          <div
            className={cn("grid overflow-hidden transition-[grid-template-rows] duration-150 motion-reduce:transition-none", open ? "grid-rows-[1fr] border-b border-line" : "grid-rows-[0fr]")}
          >
            <div className="min-h-0">
              {open && <LeadExpansion lead={lead} onDraftChange={onDraftChange} onApprove={onApprove} />}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
