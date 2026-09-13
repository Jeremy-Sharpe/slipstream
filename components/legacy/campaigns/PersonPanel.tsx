"use client";

import { Check, Linkedin, Mail, X } from "lucide-react";
import { useEffect } from "react";
import type { Campaign, CampaignPerson } from "@/lib/legacy/types/campaigns";
import { cn } from "@/lib/legacy/utils";
import { StatusBadge } from "./StatusBadge";
import { campaignActions } from "./store";

const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export function PersonPanel({ campaign, person, onClose }: { campaign: Campaign; person: CampaignPerson; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lastLog = [...campaign.log].reverse().find((l) => l.text.includes(person.name));

  return (
    <aside className="flex w-[440px] shrink-0 flex-col border-l border-border bg-card" aria-label={`${person.name} sequence`}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-5">
        <span className="flex size-8 items-center justify-center rounded-full bg-avatar text-xs font-medium text-foreground">{initials(person.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
          <p className="truncate text-xs text-muted-foreground">{person.title} · {person.company}</p>
        </div>
        <StatusBadge status={person.status} />
        <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-legacy-md text-muted-foreground hover:bg-legacy-muted hover:text-foreground"><X className="size-4" strokeWidth={1.75} /></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <ol className="flex flex-col gap-3">
          {campaign.steps.map((s, i) => {
            const Icon = s.channel === "email" ? Mail : Linkedin;
            const copy = person.copy[i] ?? { body: "" };
            const current = person.step === i + 1 && person.status !== "approved";
            const done = person.step > i + 1 || (person.status === "approved" && person.step === i + 1);
            return (
              <li key={s.id} className={cn("rounded-legacy-lg border border-border", current && "border-primary")}>
                <div className="flex h-9 items-center gap-2 border-b border-border px-3">
                  <Icon className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                  <span className="text-xs font-medium text-foreground">Step {i + 1} · {s.channel === "email" ? "Email" : "LinkedIn"}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{i === 0 ? "Day 0" : `+${s.delayDays} days`}</span>
                  {done && <Check className="size-3.5 text-muted-foreground" strokeWidth={2.5} />}
                </div>
                <div className="flex flex-col gap-1.5 px-3 py-2.5">
                  {s.channel === "email" && (
                    <input
                      value={copy.subject ?? ""}
                      onChange={(e) => campaignActions.editCopy(campaign.id, person.id, i, { ...copy, subject: e.target.value })}
                      aria-label={`Step ${i + 1} subject`}
                      className="h-8 rounded-legacy-md border border-transparent bg-transparent px-1 text-[13px] font-medium text-foreground outline-none hover:border-border focus:border-border focus:ring-2 focus:ring-primary"
                    />
                  )}
                  <textarea
                    value={copy.body}
                    onChange={(e) => campaignActions.editCopy(campaign.id, person.id, i, { ...copy, body: e.target.value })}
                    aria-label={`Step ${i + 1} body`}
                    rows={Math.min(10, Math.max(3, copy.body.split("\n").length + 1))}
                    className="resize-y rounded-legacy-md border border-transparent bg-transparent px-1 py-1 text-[13px] leading-5 text-foreground outline-none hover:border-border focus:border-border focus:ring-2 focus:ring-primary"
                  />
                </div>
              </li>
            );
          })}
        </ol>
        {lastLog && <p className="mt-4 text-xs text-muted-foreground">{lastLog.text}</p>}
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-border px-5 py-3">
        <button type="button" onClick={() => campaignActions.removePerson(campaign.id, person.id)} className="h-9 rounded-legacy-lg border border-border px-3 text-sm text-foreground hover:bg-legacy-muted">Remove</button>
        {person.status !== "skipped" && <button type="button" onClick={() => campaignActions.setPerson(campaign.id, person.id, "skipped")} className="h-9 rounded-legacy-lg border border-border px-3 text-sm text-foreground hover:bg-legacy-muted">Skip</button>}
        {person.status === "approved" ? (
          <span className="ml-auto flex h-9 items-center gap-1.5 rounded-legacy-lg bg-legacy-muted px-3 text-sm font-medium text-foreground"><Check className="size-4" strokeWidth={2.5} /> Approved · nothing is sent</span>
        ) : (
          <button type="button" onClick={() => campaignActions.setPerson(campaign.id, person.id, "approved")} className="ml-auto flex h-9 items-center gap-1.5 rounded-legacy-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"><Check className="size-4" strokeWidth={2.5} /> Approve</button>
        )}
      </footer>
    </aside>
  );
}
