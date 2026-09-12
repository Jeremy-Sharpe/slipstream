"use client";

import { Linkedin, Mail, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Campaign, StepChannel } from "@/lib/types/campaigns";
import { cn } from "@/lib/utils";
import { campaignActions } from "./store";

export function SequencePanel({ campaign }: { campaign: Campaign }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [channel, setChannel] = useState<StepChannel>("email");
  const [delay, setDelay] = useState(3);

  const add = () => { campaignActions.addStep(campaign.id, channel, delay); setAdding(false); };

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-r border-border">
      <div className="flex h-14 items-center justify-between border-b border-border px-5">
        <h2 className="text-[17px] font-semibold text-foreground">Sequence</h2>
        <span className="text-[14px] text-muted-foreground">{campaign.steps.length} steps</span>
      </div>
      <ol className="flex flex-col gap-3 px-5 py-4">
        {campaign.steps.map((s, i) => {
          const Icon = s.channel === "email" ? Mail : Linkedin;
          const open = editing === s.id;
          return (
            <li key={s.id} className="flex">
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-card">
                <div className="flex h-11 items-center gap-2 border-b border-border px-3.5">
                  <Icon className="size-4 text-foreground" strokeWidth={1.5} />
                  <span className="text-[14px] font-medium text-foreground">{s.channel === "email" ? "Email" : "LinkedIn"} · {i === 0 ? "Day 0" : `Day ${campaign.steps.slice(1, i + 1).reduce((a, x) => a + x.delayDays, 0)}`}</span>
                  <span className="ml-auto text-[13px] text-muted-foreground">Step {i + 1}</span>
                </div>
                <div className="px-3.5 py-3">
                  {open ? (
                    <div className="flex flex-col gap-2">
                      {s.channel === "email" && (
                        <input value={s.subject ?? ""} onChange={(e) => campaignActions.editStep(campaign.id, s.id, { subject: e.target.value })} placeholder="Subject" className="h-8 rounded-md border border-border bg-card px-2 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary" />
                      )}
                      <textarea value={s.body} onChange={(e) => campaignActions.editStep(campaign.id, s.id, { body: e.target.value })} rows={4} className="resize-y rounded-md border border-border bg-card px-2 py-1.5 text-[13px] leading-5 text-foreground outline-none focus:ring-2 focus:ring-primary" />
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">Delay
                          <input type="number" min={0} value={s.delayDays} onChange={(e) => campaignActions.editStep(campaign.id, s.id, { delayDays: Math.max(0, Number(e.target.value) || 0) })} className="h-7 w-14 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary" /> days
                        </label>
                        <button type="button" onClick={() => setEditing(null)} className="ml-auto h-7 cursor-pointer rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/85">Done</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {s.subject && <p className="truncate text-[15px] font-medium text-foreground">{s.subject}</p>}
                      <p className="mt-1 line-clamp-4 text-[14px] leading-[22px] whitespace-pre-line text-muted-foreground">{s.body}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <button type="button" onClick={() => setEditing(s.id)} className="cursor-pointer text-[13px] font-medium text-foreground/70 transition-colors duration-150 hover:text-foreground">Edit</button>
                        {campaign.steps.length > 1 && (
                          <button type="button" onClick={() => campaignActions.removeStep(campaign.id, s.id)} aria-label={`Remove step ${i + 1}`} className="ml-auto cursor-pointer text-muted-foreground transition-colors duration-150 hover:text-foreground"><Trash2 className="size-3.5" strokeWidth={1.75} /></button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="px-5 pb-5">
        {adding ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-page p-3">
            <div className="flex gap-1">
              {(["email", "linkedin"] as StepChannel[]).map((c) => (
                <button key={c} type="button" onClick={() => setChannel(c)} className={cn("h-8 flex-1 cursor-pointer rounded-md border border-border text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground", channel === c && "bg-card font-medium text-foreground")}>{c === "email" ? "Email" : "LinkedIn"}</button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">Delay
              <input type="number" min={0} value={delay} onChange={(e) => setDelay(Math.max(0, Number(e.target.value) || 0))} className="h-7 w-14 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary" /> days after the previous step
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAdding(false)} className="h-8 cursor-pointer rounded-md border border-border px-2.5 text-xs text-foreground transition-colors duration-150 hover:bg-muted">Cancel</button>
              <button type="button" onClick={add} className="h-8 cursor-pointer rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/85">Add step</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-card text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted active:bg-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
            <Plus className="size-4" strokeWidth={2} /> Add step
          </button>
        )}
      </div>
    </aside>
  );
}
