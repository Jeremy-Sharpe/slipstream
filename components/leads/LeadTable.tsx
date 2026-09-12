"use client";

import { Hash, Link2, Type } from "lucide-react";
import { useState } from "react";
import type { Draft, Lead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { LeadRow } from "./LeadRow";

type Glyph = "text" | "url" | "number";

const COLUMNS: { label: string; width: number; glyph?: Glyph }[] = [
  { label: "", width: 64 },
  { label: "Company", width: 220, glyph: "text" },
  { label: "Person", width: 200, glyph: "url" },
  { label: "Title", width: 220, glyph: "text" },
  { label: "Location", width: 180, glyph: "text" },
  { label: "Relevance", width: 128, glyph: "number" },
  { label: "Similarity", width: 128, glyph: "number" },
  { label: "Status", width: 120, glyph: "text" },
];

function ColumnGlyph({ glyph }: { glyph: Glyph }) {
  const cls = "size-3.5 text-muted-foreground";
  if (glyph === "url") return <Link2 className={cls} strokeWidth={1.75} />;
  if (glyph === "number") return <Hash className={cls} strokeWidth={1.75} />;
  return <Type className={cls} strokeWidth={1.75} />;
}

export function LeadTable({ leads, onChange }: { leads: Lead[]; onChange: (next: Lead[]) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const update = (id: string, patch: (lead: Lead) => Lead) => onChange(leads.map((l) => (l.id === id ? patch(l) : l)));

  if (leads.length === 0) {
    return (
      <div className="mx-4 mb-4 flex-1 rounded-lg border border-line bg-card">
        <EmptyState title="No leads yet" body="Run a search from the brief and companies land here as Origami finds them." />
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-line bg-card">
      <div className="h-full overflow-auto">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            {COLUMNS.map((c, i) => <col key={i} style={{ width: c.width }} />)}
            <col />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              {COLUMNS.map((c, i) => (
                <th key={i} scope="col" className={cn("h-11 border-r border-b border-line text-left align-middle", c.glyph ? "px-4" : "px-0")}>
                  {c.glyph && (
                    <span className="flex items-center gap-2 overflow-hidden">
                      <ColumnGlyph glyph={c.glyph} />
                      <span className="truncate text-sm font-semibold text-ink">{c.label}</span>
                    </span>
                  )}
                </th>
              ))}
              <th className="h-11 border-b border-line" />
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
