"use client";

import { Check, ExternalLink, Gauge, Mail, Phone, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CallRecord, TimelineEntry } from "@/lib/types/calls";
import { cn } from "@/lib/utils";

const STAGES = ["Discovery", "Evaluation", "Proposal", "Procurement", "Closed won", "Closed lost"];
const timeFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "2-digit", hour12: false });
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function stageLabel(s: string) { return s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()); }

function Field({ label, confidence, span, onHover, children }: { label: string; confidence: number; span: number | null; onHover: (i: number | null) => void; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5" onMouseEnter={() => onHover(span)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(span)} onBlur={() => onHover(null)}>
      <span className="flex items-center justify-between text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
        <span className={cn("font-medium normal-case tracking-normal", span != null ? "text-primary" : "text-muted-foreground")}>{Math.round(confidence * 100)}%</span>
      </span>
      {children}
    </label>
  );
}

const inputCls = "h-9 w-full rounded-md border border-line bg-card px-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-70";

export function CrmPanel({ call, synced, onSync, onHover, timeline }: { call: CallRecord; synced: boolean; onSync: () => void; onHover: (i: number | null) => void; timeline: TimelineEntry[] }) {
  const x = call.extraction;
  const [stage, setStage] = useState(stageLabel(x.deal.stage.value));
  const [value, setValue] = useState(x.deal.valueAud.value ? `$${x.deal.valueAud.value.toLocaleString("en-AU")}` : "");
  const [owner, setOwner] = useState(call.rep);
  const [nextAction, setNextAction] = useState(x.nextStep?.value ?? (x.promises[0]?.value ?? ""));
  const [closeDate, setCloseDate] = useState(x.nextStepDue ?? "");
  const [source, setSource] = useState("Outbound");
  const hasFlags = call.riskFlags.length > 0;

  return (
    <aside className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">CRM write-back</p>
          <h2 className="text-lg font-bold tracking-tight text-ink">HubSpot</h2>
        </div>
        <span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide uppercase", synced ? "bg-foreground text-background" : "bg-primary-soft text-ink")}>{synced ? "Synced" : "Review"}</span>
      </div>

      <div className="flex items-center gap-2.5 rounded-md bg-primary-soft px-3 py-2.5">
        <Sparkles className="size-4 shrink-0 text-primary" strokeWidth={2} />
        <div className="text-[13px]">
          <div className="font-medium text-ink">Auto-filled from conversation</div>
          <div className="text-xs text-ink-2">Hover a field to see where it came from</div>
        </div>
      </div>

      <div className="grid grid-cols-[36px_1fr_28px] items-center gap-2.5 rounded-md border border-line p-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-avatar text-xs font-semibold text-ink">{initials(call.prospect)}</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">{call.prospect}</div>
          <div className="truncate text-xs text-muted-foreground">{x.contact.role.value} · {call.company}</div>
        </div>
        <a href={`https://${call.domain}`} target="_blank" rel="noreferrer" className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Open website"><ExternalLink className="size-4" strokeWidth={1.75} /></a>
      </div>

      <div className="grid gap-3.5">
        <Field label="Deal stage" confidence={x.deal.stage.confidence} span={x.deal.stage.span} onHover={onHover}>
          <select value={stage} onChange={(e) => setStage(e.target.value)} disabled={synced} className={inputCls}>{[...new Set([stage, ...STAGES])].map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Value (AUD)" confidence={x.deal.valueAud.confidence} span={x.deal.valueAud.span} onHover={onHover}>
            <input value={value} onChange={(e) => setValue(e.target.value)} disabled={synced} className={cn(inputCls, "tabular-nums")} placeholder="—" />
          </Field>
          <Field label="Owner" confidence={0.99} span={null} onHover={onHover}>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} disabled={synced} className={inputCls}><option>Sam Whitfield</option><option>Jordan Lee</option></select>
          </Field>
        </div>
        <Field label="Next action" confidence={x.nextStep?.confidence ?? x.promises[0]?.confidence ?? 0.9} span={x.nextStep?.span ?? x.promises[0]?.span ?? null} onHover={onHover}>
          <textarea value={nextAction} onChange={(e) => setNextAction(e.target.value)} disabled={synced} rows={3} className={cn(inputCls, "h-auto resize-y py-2 leading-5")} placeholder="No next step agreed" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Close date" confidence={0.88} span={x.nextStep?.span ?? null} onHover={onHover}>
            <input value={closeDate} onChange={(e) => setCloseDate(e.target.value)} disabled={synced} className={inputCls} placeholder="Not set" />
          </Field>
          <Field label="Lead source" confidence={0.97} span={null} onHover={onHover}>
            <select value={source} onChange={(e) => setSource(e.target.value)} disabled={synced} className={inputCls}><option>Outbound</option><option>Inbound</option><option>Referral</option></select>
          </Field>
        </div>
        {x.promises.length > 0 && (
          <div className="grid gap-1.5">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Promises</span>
            <ul className="grid gap-1.5">
              {x.promises.map((p, i) => (
                <li key={i} onMouseEnter={() => onHover(p.span)} onMouseLeave={() => onHover(null)} className="flex items-start gap-2 rounded-md border border-line px-2.5 py-2 text-[13px] text-ink-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />{p.value}
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasFlags && (
          <div className="grid gap-1.5">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Coach flags</span>
            <ul className="grid gap-1.5">
              {call.riskFlags.map((r) => (
                <li key={r.turnIndex} onMouseEnter={() => onHover(r.turnIndex)} onMouseLeave={() => onHover(null)} className="rounded-md border border-line px-2.5 py-2 text-[13px] text-ink-2">
                  <span className="mr-1.5 rounded-full bg-primary-soft px-1.5 py-px text-[11px] font-medium text-ink">{r.kind}</span>“{r.text}”
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Button className="h-9 w-full rounded-md text-sm" onClick={onSync} disabled={synced}>
        {synced ? <><Check className="size-4" strokeWidth={2} /> Synced to HubSpot</> : <><Zap className="size-4" strokeWidth={2} /> Approve &amp; sync changes</>}
      </Button>
      <p className="-mt-2 text-center text-xs text-muted-foreground">No fields are changed without your approval</p>

      <div className="border-t border-line pt-4">
        <h3 className="text-sm font-semibold text-ink">Timeline</h3>
        <ol className="mt-3 grid gap-3">
          {timeline.map((t, i) => {
            const Icon = { call: Phone, sparkles: Sparkles, gauge: Gauge, mail: Mail, check: Check }[t.icon];
            return (
              <li key={i} className="grid grid-cols-[28px_1fr] gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-md bg-muted text-ink-2"><Icon className="size-3.5" strokeWidth={1.75} /></span>
                <div>
                  <div className="text-[13px] font-medium text-ink">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{timeFmt.format(new Date(t.at))} · {t.meta}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <Link href="/settings" className="text-xs text-muted-foreground hover:text-foreground">HubSpot connection settings →</Link>
    </aside>
  );
}
