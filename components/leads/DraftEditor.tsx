"use client";

import type { Draft } from "@/lib/types";

// Reused for call follow-ups elsewhere: takes a Draft, reports edits and
// approval, knows nothing about leads.
export function DraftEditor({ draft, onChange, onApprove, busy = false }: { draft: Draft; onChange: (draft: Draft) => void; onApprove: () => void; busy?: boolean }) {
  const approved = draft.status === "approved";
  const locked = approved || draft.source === "live";
  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-[13px] font-medium text-muted-foreground">Outreach draft</p>
      <input
        value={draft.subject}
        onChange={(e) => onChange({ ...draft, subject: e.target.value })}
        readOnly={locked}
        aria-label="Subject"
        className="w-full border-b border-line bg-page pb-2 text-sm text-ink placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none read-only:opacity-70"
      />
      <textarea
        value={draft.body}
        onChange={(e) => onChange({ ...draft, body: e.target.value })}
        readOnly={locked}
        aria-label="Body"
        rows={9}
        className="mt-2 w-full flex-1 resize-none bg-page text-sm leading-relaxed text-ink placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none read-only:opacity-70"
      />
      <div className="mt-3 flex justify-end">
        {draft.source === "live" && !approved && <p className="mr-auto self-center text-xs text-muted-foreground">Live API draft · approve without local edits</p>}
        <button
          type="button"
          onClick={onApprove}
          disabled={approved || busy}
          className="rounded-lg bg-primary px-3.5 py-[9px] text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
        >
          {approved ? "Approved" : busy ? "Approving…" : "Approve"}
        </button>
      </div>
    </div>
  );
}
