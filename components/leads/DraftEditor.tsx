"use client";

import type { Draft } from "@/lib/types";

// Reused for call follow-ups elsewhere: takes a Draft, reports edits and
// approval, knows nothing about leads.
export function DraftEditor({ draft, onChange, onApprove }: { draft: Draft; onChange: (draft: Draft) => void; onApprove: () => void }) {
  const approved = draft.status === "approved";
  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-[13px] font-medium text-muted-foreground">Outreach draft</p>
      <input
        value={draft.subject}
        onChange={(e) => onChange({ ...draft, subject: e.target.value })}
        disabled={approved}
        aria-label="Subject"
        className="w-full border-b border-line bg-page pb-2 text-sm text-ink placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-70"
      />
      <textarea
        value={draft.body}
        onChange={(e) => onChange({ ...draft, body: e.target.value })}
        disabled={approved}
        aria-label="Body"
        rows={9}
        className="mt-2 w-full flex-1 resize-none bg-page text-sm leading-relaxed text-ink placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-70"
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onApprove}
          disabled={approved}
          className="rounded-lg bg-primary px-3.5 py-[9px] text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
        >
          {approved ? "Approved" : "Approve"}
        </button>
      </div>
    </div>
  );
}
