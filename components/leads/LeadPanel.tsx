"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { actions } from "@/lib/store";
import type { Lead } from "@/lib/types";
import { Button, Pill, cn } from "../ui";

/* 440px slide-over for one lead: why it matched, the outreach draft, Approve / Skip. */
export function LeadPanel({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  // Keep the last lead while sliding out.
  const [shown, setShown] = useState<Lead | null>(lead);
  if (lead && lead !== shown) setShown(lead);
  const [body, setBody] = useState(lead?.draft.body ?? "");
  const [bodyFor, setBodyFor] = useState(lead?.id);
  if (lead && lead.id !== bodyFor) { setBodyFor(lead.id); setBody(lead.draft.body); }

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
              <p className="truncate text-[16px] font-semibold text-ink">{l.company}</p>
              <p className="truncate text-[13.5px] text-soft">{l.contact} · {l.title} · {l.location}</p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded-full text-soft transition-colors duration-150 hover:bg-surface hover:text-ink"><X className="size-4" strokeWidth={1.75} /></button>
          </header>
          <div className="run-column min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Similarity</span>
              <span className={cn("text-[14px] font-medium tabular-nums", l.similarity >= 80 ? "text-success" : "text-ink")}>{l.similarity}</span>
              {l.status === "approved" ? <Pill tone="green">Approved</Pill> : <Pill>Drafted</Pill>}
            </div>

            <p className="mt-6 text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Why this matched</p>
            <ul className="mt-3 flex flex-col gap-4">
              {l.evidence.map((e, i) => (
                <li key={i} className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3">
                  <p className="pt-px text-[13.5px] text-soft">{e.attribute}</p>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-ink">{e.value}</p>
                    <p className="mt-1 text-[13.5px] leading-5 text-text">“{e.quote}”</p>
                    <p className="mt-0.5 text-[13.5px] text-soft">{e.call} · <span className="tabular-nums">{e.t}</span></p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Outreach draft</p>
            <p className="mt-3 text-[14px] font-medium text-ink">{l.draft.subject}</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              readOnly={l.status === "approved"}
              rows={body.split("\n").length + 1}
              className="mt-2 w-full resize-none rounded-lg bg-surface-2 px-3 py-2 text-[14px] leading-6 text-text outline-none transition-shadow duration-150 focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <footer className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
            {l.status === "approved" ? (
              <span className="mr-auto text-[13px] text-soft">Approved · nothing is sent</span>
            ) : (
              <>
                <Button onClick={onClose}>Skip</Button>
                <Button variant="primary" onClick={() => actions.approveLead(l.id)}>Approve</Button>
              </>
            )}
          </footer>
        </>
      )}
    </aside>
  );
}
