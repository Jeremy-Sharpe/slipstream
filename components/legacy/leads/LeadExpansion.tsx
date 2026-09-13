"use client";

import type { Draft, Lead } from "@/lib/legacy/types";
import { DraftEditor } from "./DraftEditor";
import { MatchEvidenceList } from "./MatchEvidenceList";

export function LeadExpansion({ lead, onDraftChange, onApprove, onCreateDraft, busy }: { lead: Lead; onDraftChange: (draft: Draft) => void; onApprove: () => void; onCreateDraft: () => void; busy: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-6 bg-page p-5">
      <MatchEvidenceList evidence={lead.match_evidence} />
      {lead.draft ? (
        <DraftEditor draft={lead.draft} onChange={onDraftChange} onApprove={onApprove} busy={busy} />
      ) : (
        <div className="flex flex-col">
          <p className="mb-3 text-[13px] font-medium text-muted-foreground">Outreach draft</p>
          <p className="text-sm text-muted-foreground">No outreach draft has been created for this lead.</p>
          {lead.source === "live" && lead.status === "new" ? (
            <button type="button" onClick={onCreateDraft} disabled={busy} className="mt-4 w-fit rounded-legacy-lg bg-primary px-3.5 py-[9px] text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-50">
              {busy ? "Drafting…" : "Draft outreach"}
            </button>
          ) : <p className="mt-3 text-xs text-muted-foreground">{lead.source === "live" ? "This lead already has backend outreach history; the list endpoint does not expose its latest draft." : "Evaluation row · live drafting unlocks after a search returns stored leads."}</p>}
        </div>
      )}
    </div>
  );
}
