"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { actions } from "@/lib/store/leads";
import type { Lead } from "@/lib/types";
import { Button, Pill, cn } from "../ui";

/* 440px slide-over for one lead: why it matched, the outreach draft, Approve / Skip. */
export function LeadPanel({ lead, drafting, onClose }: { lead: Lead | null; drafting: boolean; onClose: () => void }) {
  // Keep the last lead while sliding out.
  const [shown, setShown] = useState<Lead | null>(lead);
  if (lead && lead !== shown) setShown(lead);
  const [body, setBody] = useState(lead?.draft?.body ?? "");
  const [bodyFor, setBodyFor] = useState(lead?.draft?.id);
  if (lead?.draft && lead.draft.id !== bodyFor) { setBodyFor(lead.draft.id); setBody(lead.draft.body); }

  // The draft box grows to fit its text, so nothing is ever cut off.
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [body, lead]);

  useEffect(() => {
    if (!lead) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  const l = shown;
  return (
    <aside
      aria-hidden={!lead}
      className={cn("fixed top-0 right-0 z-30 flex h-screen w-[440px] flex-col bg-white shadow-[-8px_0_32px_rgba(24,25,37,0.08)] transition-transform duration-200", lead ? "translate-x-0" : "translate-x-full")}
      style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
    >
      {l && (
        <>
          <header className="flex items-start gap-3 px-6 pt-6 pb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[16px] font-semibold text-ink">{l.company}</p>
                {l.synthetic && <Pill className="shrink-0">Fictional</Pill>}
              </div>
              <p className="truncate text-[13.5px] text-soft">{[l.contact, l.title, l.location].filter(Boolean).join(" · ")}</p>
              {l.linkedinUrl && <a href={l.linkedinUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[13px] text-soft transition-colors duration-150 hover:text-ink">LinkedIn →</a>}
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded-full text-soft transition-colors duration-150 hover:bg-surface hover:text-ink"><X className="size-4" strokeWidth={1.75} /></button>
          </header>
          <div className="run-column min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Similarity</span>
              <span className={cn("text-[14px] font-medium tabular-nums", l.similarity >= 80 ? "text-success" : "text-ink")}>{l.similarity}</span>
              {l.status === "approved" ? <Pill tone="green">Approved</Pill> : l.status === "drafted" ? <Pill>Drafted</Pill> : null}
            </div>

            <p className="mt-6 text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Why this matched</p>
            {l.evidence.length === 0 ? (
              <p className="mt-3 text-[14px] text-faint">No ICP evidence on this profile</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-4">
                {l.evidence.map((e, i) => (
                  <li key={i} className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3">
                    <p className="pt-px text-[13.5px] text-soft">{e.attribute}</p>
                    <div className="min-w-0">
                      <p className="text-[14px] leading-5 text-ink">{e.value}</p>
                      {e.deals.length > 0 && <p className="mt-0.5 truncate text-[13.5px] text-soft">{e.deals.join(", ")}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-6 text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Outreach draft</p>
            {l.draft ? (
              <>
                <p className="mt-3 text-[14px] font-medium text-ink">{l.draft.subject}</p>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  readOnly={l.status === "approved"}
                  rows={1}
                  className="mt-2 w-full resize-none overflow-hidden rounded-xl bg-surface-2 px-3 py-2 text-[14px] leading-6 text-text outline-none transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-accent/40"
                />
              </>
            ) : (
              <p className="mt-3 text-[14px] text-faint">
                {drafting ? "Writing the draft" : l.status === "approved" ? "Approved earlier, this browser did not keep the draft" : "No draft yet"}
              </p>
            )}
          </div>
          <footer className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
            {l.status === "approved" ? (
              <span className="mr-auto text-[13px] text-soft">Approved · Nothing is sent</span>
            ) : (
              <>
                <Button onClick={onClose}>Skip</Button>
                <Button variant="primary" disabled={!l.draft || drafting} onClick={() => void actions.approve(l.id)}>Approve</Button>
              </>
            )}
          </footer>
        </>
      )}
    </aside>
  );
}
