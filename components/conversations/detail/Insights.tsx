"use client";

import { Check, Gauge, Mail, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CallRecord } from "@/lib/types/calls";
import { cn } from "@/lib/utils";
import { Card } from "./Transcript";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Intelligence({ call }: { call: CallRecord }) {
  const sentiment = { open: "Open", won: "Positive", stalled: "Cautious", lost: "Flat", no_show: "n/a" }[call.outcome];
  const next = call.extraction.nextStep?.value ?? (call.outcome === "no_show" ? "Reschedule" : "None agreed");
  const risk = call.extraction.objections[0]?.text ?? (call.riskFlags[0] ? `Coach: ${call.riskFlags[0].kind}` : "None raised");
  return (
    <Card className="border-l-2 border-l-primary">
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[17px] font-semibold text-ink"><Sparkles className="size-[18px] text-primary" strokeWidth={2} /> Conversation intelligence</span>
          <span className="rounded-md bg-muted px-2.5 py-1 text-[13px] text-muted-foreground">{Math.round(call.extraction.deal.outcome.confidence * 100)}% confidence</span>
        </div>
        <p className="mt-3 text-[16px] leading-6 text-ink-2">{call.summary}</p>
        <dl className="mt-5 grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
          {[["Sentiment", sentiment], ["Next step", next], ["Primary risk", risk]].map(([k, v], i) => (
            <div key={k} className={cn("min-w-0", i > 0 && "pl-4")}>
              <dt className="text-[14px] text-muted-foreground">{k}</dt>
              <dd className="mt-1 truncate text-[15px] font-medium text-ink" title={v}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}

export function ScorecardCard({ call, onHover, source, canGenerate, generating, error, onGenerate }: { call: CallRecord; onHover: (span: number | null) => void; source: string; canGenerate: boolean; generating: boolean; error?: string; onGenerate: () => void }) {
  const sc = call.scorecard;
  const turn = (i: number | null) => (i == null ? null : call.turns.find((item) => item.index === i) ?? null);
  const rows: { label: string; value: string; ok: boolean; span: number | null }[] = [
    { label: "Discovery questions", value: `${sc.discoveryQuestions.value} asked before pricing`, ok: sc.discoveryQuestions.value >= 4, span: sc.discoveryQuestions.span },
    { label: "Next step secured", value: sc.nextStepSecured.value ? "Yes, dated" : "No", ok: sc.nextStepSecured.value, span: sc.nextStepSecured.span },
    { label: "Objection handled", value: { handled: "Handled", partial: "Partially", ignored: "Ignored", none_raised: "None raised" }[sc.objectionHandling.value], ok: sc.objectionHandling.value === "handled" || sc.objectionHandling.value === "none_raised", span: sc.objectionHandling.span },
    { label: "Talk ratio", value: `${Math.round(sc.talkRatio * 100)}% rep`, ok: sc.talkRatio <= 0.55, span: null },
  ];
  return (
    <Card title={<><Gauge className="size-4 text-muted-foreground" strokeWidth={1.75} /> Scorecard <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{source}</span></>} aside={<span className="flex items-center gap-3"><span className="text-[14px] text-muted-foreground">{rows.filter((r) => r.ok).length} / 4</span>{canGenerate && <Button variant="outline" className="h-8 text-[12px]" disabled={generating} onClick={onGenerate}>{generating ? "Scoring…" : "Generate live scorecard"}</Button>}</span>}>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const t = turn(r.span);
          return (
            <li key={r.label} className="grid grid-cols-[220px_1fr] gap-5 px-6 py-4" onMouseEnter={() => onHover(r.span)} onMouseLeave={() => onHover(null)}>
              <div className="flex items-start gap-2">
                <span className={cn("mt-1 size-2 shrink-0 rounded-full", r.ok ? "bg-primary" : "border border-foreground/50")} />
                <div>
                  <div className="text-[15px] font-medium text-ink">{r.label}</div>
                  <div className="text-[14px] text-muted-foreground">{r.value}</div>
                </div>
              </div>
              <div className="min-w-0 text-[15px] leading-6 text-ink-2">
                {t ? <><span className="text-primary">“{t.text}”</span> <span className="ml-1 font-mono text-[14px] text-muted-foreground">{fmt(t.at)}</span></> : <span className="text-muted-foreground">{r.label === "Talk ratio" ? sc.notes : "No supporting line."}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="border-t border-line px-6 py-3 text-[13px] text-destructive">Live scoring unavailable: {error}. Previous {source.startsWith("Live") ? "live scorecard" : "labelled evaluation"} retained.</p>}
    </Card>
  );
}

export function FollowUpDraft({ call, onApprove, approved, locked, busy }: { call: CallRecord; onApprove: () => void; approved: boolean; locked: boolean; busy: boolean }) {
  const [subject, setSubject] = useState(call.draft.subject);
  const [body, setBody] = useState(call.draft.body);
  return (
    <Card title={<><Mail className="size-4 text-muted-foreground" strokeWidth={1.75} /> Follow-up drafted from this call</>} aside={<span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{approved ? "Approved" : "Ready to review"}</span>}>
      <div className="flex h-11 items-center gap-3 border-b border-line px-6 text-[15px]">
        <span className="text-muted-foreground">To</span>
        <span className="text-ink">{call.prospect} &lt;{call.extraction.contact.email.value}&gt;</span>
      </div>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={approved || locked} className="h-12 w-full border-b border-line bg-transparent px-6 text-[16px] font-medium text-ink outline-none focus-visible:bg-page disabled:opacity-70" aria-label="Subject" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={approved || locked} rows={10} className="block w-full resize-y bg-transparent px-6 py-5 text-[16px] leading-7 text-ink-2 outline-none focus-visible:bg-page disabled:opacity-70" aria-label="Draft body" />
      <footer className="flex items-center justify-between border-t border-line px-5 py-3.5">
        <span className="text-[14px] text-muted-foreground">{locked ? "Exact backend draft · approval is logged without sending." : "Run the verified API demo before approval; fixture text is editable."}</span>
        {approved ? <span className="flex items-center gap-1.5 text-[15px] font-medium text-ink"><Check className="size-4" strokeWidth={2} /> Approved · logged</span> : <Button className="h-10 rounded-md px-4 text-[15px] font-medium" onClick={onApprove} disabled={busy}><Check className="size-4" strokeWidth={2} /> {busy ? "Approving…" : locked ? "Approve" : "Generate live draft"}</Button>}
      </footer>
    </Card>
  );
}
