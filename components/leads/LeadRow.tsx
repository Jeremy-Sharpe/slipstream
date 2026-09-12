"use client";

import { ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import type { Draft, Lead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { LeadExpansion } from "./LeadExpansion";
import { ScoreBar } from "./ScoreBar";

const CELL = "h-[49px] border-r border-b border-line px-3 text-base text-ink truncate";

export function LeadRow({ lead, index, open, onToggle, onDraftChange, onApprove }: {
  lead: Lead;
  index: number;
  open: boolean;
  onToggle: () => void;
  onDraftChange: (draft: Draft) => void;
  onApprove: () => void;
}) {
  // Mount the panel once it has been opened so the height transition can run
  // on both open and close instead of snapping.
  const [mounted, setMounted] = useState(open);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  return (
    <>
      <tr
        tabIndex={0}
        role="button"
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onToggle(); } }}
        className="cursor-pointer outline-none transition-colors duration-150 hover:bg-page focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <td className={cn(CELL, "px-0")}>
          <span className="flex h-full items-center gap-1.5 pl-3 text-ink">
            <ChevronRight className={cn("size-4 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none", open && "rotate-90")} strokeWidth={1.75} />
            <span className="text-base tabular-nums">{index + 1}</span>
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
                  className="cursor-pointer text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <ExternalLink className="size-4" strokeWidth={1.75} />
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
        <td className="h-[49px] border-b border-line" />
      </tr>
      <tr aria-hidden={!open}>
        <td colSpan={9} className="p-0">
          <div
            className={cn("grid overflow-hidden transition-[grid-template-rows] duration-150 motion-reduce:transition-none", open ? "grid-rows-[1fr] border-b border-line" : "grid-rows-[0fr]")}
          >
            <div className="sticky left-0 min-h-0 w-[var(--table-viewport)]" inert={!open}>
              {mounted && <LeadExpansion lead={lead} onDraftChange={onDraftChange} onApprove={onApprove} />}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
