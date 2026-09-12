"use client";

import { Hash, Link2, Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Draft, Lead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { LeadRow } from "./LeadRow";

type Glyph = "text" | "url" | "number" | "index";

const COLUMNS: { label: string; width: number; glyph?: Glyph }[] = [
  { label: "", width: 64, glyph: "index" },
  { label: "Company", width: 236, glyph: "text" },
  { label: "Person", width: 220, glyph: "url" },
  { label: "Title", width: 220, glyph: "text" },
  { label: "Location", width: 180, glyph: "text" },
  { label: "Relevance", width: 152, glyph: "number" },
  { label: "Similarity", width: 152, glyph: "number" },
  { label: "Status", width: 132, glyph: "text" },
];

function ColumnGlyph({ glyph }: { glyph: Glyph }) {
  const cls = "size-[18px] text-muted-foreground";
  if (glyph === "url") return <Link2 className={cls} strokeWidth={1.5} />;
  if (glyph === "number" || glyph === "index") return <Hash className={cls} strokeWidth={1.5} />;
  return <Type className={cls} strokeWidth={1.5} />;
}

export function LeadTable({ leads, onChange }: { leads: Lead[]; onChange: (next: Lead[]) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  // The table is wider than its card; the expanded panel pins to the visible
  // width so the draft column never scrolls out of view.
  const scroller = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportWidth(el.clientWidth));
    ro.observe(el);
    setViewportWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [leads.length]);

  const update = (id: string, patch: (lead: Lead) => Lead) => onChange(leads.map((l) => (l.id === id ? patch(l) : l)));

  if (leads.length === 0) {
    return (
      <div className="mx-[22px] mb-[22px] flex-1 rounded-lg border border-line bg-card">
        <EmptyState title="No leads match these filters." />
      </div>
    );
  }

  return (
    <div className="mx-[22px] mb-[22px] min-h-0 flex-1 overflow-hidden rounded-lg border border-line bg-card">
      <div ref={scroller} className="h-full overflow-auto [scrollbar-width:thin]" style={{ "--table-viewport": `${viewportWidth}px` } as React.CSSProperties}>
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            {COLUMNS.map((c, i) => <col key={i} style={{ width: c.width }} />)}
            <col />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              {COLUMNS.map((c, i) => (
                <th key={i} scope="col" className={cn("h-[46px] border-r border-b border-line text-left align-middle", c.glyph === "index" ? "px-0" : "px-4")}>
                  {c.glyph === "index" ? (
                    <span className="flex items-center justify-center"><ColumnGlyph glyph="index" /></span>
                  ) : c.glyph ? (
                    <span className="flex items-center gap-2.5 overflow-hidden">
                      <ColumnGlyph glyph={c.glyph} />
                      <span className="truncate text-base font-semibold text-ink">{c.label}</span>
                    </span>
                  ) : null}
                </th>
              ))}
              <th className="h-[46px] border-b border-line" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                index={i}
                open={openId === lead.id}
                onToggle={() => setOpenId((cur) => (cur === lead.id ? null : lead.id))}
                onDraftChange={(draft: Draft) => update(lead.id, (l) => ({ ...l, draft }))}
                onApprove={() => update(lead.id, (l) => ({ ...l, status: "approved", draft: l.draft ? { ...l.draft, status: "approved" } : l.draft }))}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
