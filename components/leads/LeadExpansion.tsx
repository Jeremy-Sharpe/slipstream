"use client";

import type { Draft, Lead } from "@/lib/types";
import { DraftEditor } from "./DraftEditor";
import { MatchEvidenceList } from "./MatchEvidenceList";

export function LeadExpansion({ lead, onDraftChange, onApprove }: { lead: Lead; onDraftChange: (draft: Draft) => void; onApprove: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-6 bg-page p-5">
      <MatchEvidenceList evidence={lead.match_evidence} />
      {lead.draft ? (
        <DraftEditor draft={lead.draft} onChange={onDraftChange} onApprove={onApprove} />
      ) : (
        <div className="flex flex-col">
          <p className="mb-3 text-[13px] font-medium text-muted-foreground">Outreach draft</p>
          <p className="text-[15px] text-muted-foreground">No draft yet.</p>
        </div>
      )}
    </div>
  );
}
