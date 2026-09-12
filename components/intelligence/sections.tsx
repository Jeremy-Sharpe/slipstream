"use client";

import { ArrowRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Intelligence, ObjectionHandling } from "@/lib/types/intelligence";
import { cn } from "@/lib/utils";
import { Bar, EvidenceChip, OutcomeTag, Section } from "./primitives";

type Props = { data: Intelligence; active?: string };

export function Tiles({ data }: { data: Intelligence }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {data.tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-border bg-card p-5">
          <p className="text-[13px] text-muted-foreground">{t.label}</p>
          <p className="mt-2 text-[28px] leading-none font-bold tracking-tight text-foreground tabular-nums">{t.value}</p>
          <p className="mt-2.5 text-[13px] text-muted-foreground">{t.delta}</p>
        </div>
      ))}
    </div>
  );
}

export function TrainingLens({ data, active }: Props) {
  return (
    <Section id="patterns" title="Won-deal patterns" meta={`${data.wonDeals} wins vs ${data.callsAnalysed - data.wonDeals} other calls`} active={active === "patterns"}>
      <div className="grid grid-cols-[1fr_180px_180px] gap-x-6 text-[13px] text-muted-foreground">
        <span />
        <span className="font-medium text-foreground">Winning calls</span>
        <span className="font-medium text-foreground">Stalled or lost</span>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {data.lens.map((row) => (
          <li key={row.label} className="grid grid-cols-[1fr_180px_180px] items-start gap-x-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">{row.label}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{row.takeaway}</p>
            </div>
            <div>
              <p className="text-sm text-foreground tabular-nums">{row.wins.value}</p>
              <Bar share={row.wins.share} className="mt-2" />
            </div>
            <div>
              <p className="text-sm text-foreground tabular-nums">{row.others.value}</p>
              <Bar share={row.others.share} className="mt-2" />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ConfidenceRing({ value }: { value: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex size-10 items-center justify-center" role="img" aria-label={`${value}% confidence`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="text-[11px] font-semibold text-foreground tabular-nums">{value}</span>
    </span>
  );
}

export function DerivedIcp({ data, active }: Props) {
  return (
    <Section id="icp" title="Derived ICP" meta={<span className="flex items-center gap-3">derived from {data.wonDeals} won deals · v{data.icpVersion}<ConfidenceRing value={data.confidence} /></span>} active={active === "icp"}>
      <p className="max-w-[720px] text-[17px] leading-snug font-medium text-foreground">{data.icp.summary}</p>
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {data.icp.attributes.map((a) => (
          <div key={a.label} className="bg-card p-4">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{a.label}</p>
            <p className="mt-1.5 text-sm font-medium text-foreground">{a.value}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.evidence.map((e) => <EvidenceChip key={e.id} call={e} />)}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

const HANDLING: { key: ObjectionHandling; label: string; note: string }[] = [
  { key: "handled", label: "Handled", note: "Named the risk and offered a plan" },
  { key: "partial", label: "Partially handled", note: "Acknowledged, no plan agreed" },
  { key: "ignored", label: "Ignored", note: "Moved on without answering" },
];

export function Objections({ data, active }: Props) {
  return (
    <Section id="objections" title="Objections" meta={`${data.objections.length} raised across ${data.callsAnalysed} calls`} active={active === "objections"}>
      <div className="grid grid-cols-3 gap-4">
        {HANDLING.map((h) => {
          const items = data.objections.filter((o) => o.handling === h.key);
          return (
            <div key={h.key} className="rounded-lg border border-border bg-page">
              <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{h.label}</p>
                  <p className="text-[12px] text-muted-foreground">{h.note}</p>
                </div>
                <span className="text-sm text-foreground tabular-nums">{items.length}</span>
              </div>
              <ul className="divide-y divide-border">
                {items.map((o, i) => (
                  <li key={i} className="px-4 py-3">
                    <p className="text-[13px] leading-snug text-foreground">“{o.text}”</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Link href={`/conversations/${o.call.id}`} className="text-[12px] text-muted-foreground hover:text-foreground hover:underline">{o.call.company}</Link>
                      <OutcomeTag outcome={o.outcome} />
                    </div>
                  </li>
                ))}
                {items.length === 0 && <li className="px-4 py-3 text-[13px] text-muted-foreground">None.</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function TalkRatio({ data, active }: Props) {
  const sorted = [...data.talkRatios].sort((a, b) => a.ratio - b.ratio);
  return (
    <Section id="talk-ratio" title="Talk ratio" meta="Share of words spoken by the rep · wins marked" active={active === "talk-ratio"}>
      <ul className="flex flex-col gap-2.5">
        {sorted.map((t) => (
          <li key={t.call.id} className="grid grid-cols-[220px_1fr_56px_80px] items-center gap-4 text-sm">
            <Link href={`/conversations/${t.call.id}`} className={cn("truncate text-foreground hover:underline", t.outcome === "won" && "font-medium")}>{t.call.company}</Link>
            <Bar share={t.ratio} className={cn(t.outcome !== "won" && "[&>span]:bg-muted-foreground/60")} />
            <span className="text-right text-foreground tabular-nums">{Math.round(t.ratio * 100)}%</span>
            <OutcomeTag outcome={t.outcome} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] text-muted-foreground">Wins sit between 44% and 50%. Every call above 60% was lost or a no-show.</p>
    </Section>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" });

export function NextSteps({ data, active }: Props) {
  return (
    <Section id="next-steps" title="Next steps" meta="What each call ended with" active={active === "next-steps"}>
      <ul className="divide-y divide-border">
        {data.nextSteps.map((n) => (
          <li key={n.call.id} className="grid grid-cols-[220px_1fr_100px_80px] items-start gap-4 py-3 text-sm">
            <Link href={`/conversations/${n.call.id}`} className="truncate text-foreground hover:underline">{n.call.company}</Link>
            <p className={cn("text-foreground", !n.due && "text-muted-foreground")}>{n.description}</p>
            <span className={cn("tabular-nums", n.due ? "text-foreground" : "text-muted-foreground")}>{n.due ? dateFmt.format(new Date(n.due)) : "No date"}</span>
            <OutcomeTag outcome={n.outcome} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Triggers({ data, active }: Props) {
  const max = Math.max(...data.triggers.map((t) => t.count));
  return (
    <Section id="triggers" title="Triggers" meta="Why the prospect took the call" active={active === "triggers"}>
      <ul className="flex flex-col gap-3">
        {data.triggers.map((t) => (
          <li key={t.label} className="grid grid-cols-[300px_1fr_40px] items-center gap-4 text-sm">
            <span className={cn("truncate", t.label === "No trigger" ? "text-muted-foreground" : "text-foreground")}>{t.label}</span>
            <Bar share={t.count / max} className={cn(t.label === "No trigger" && "[&>span]:bg-muted-foreground/60")} />
            <span className="text-right text-foreground tabular-nums">×{t.count}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] text-muted-foreground">All five wins had a trigger. All four calls without one were lost or never happened.</p>
    </Section>
  );
}

export function BriefCard({ brief, active }: { brief: string; active?: string }) {
  const router = useRouter();
  const [text, setText] = useState(brief);
  const [count, setCount] = useState(10);
  return (
    <Section id="brief" title="Origami brief" meta="The ICP as a search, ready to run" active={active === "brief"}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        aria-label="Origami brief"
        className="w-full resize-y rounded-lg border border-border bg-page p-3 text-sm leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="mt-4 flex items-center justify-end gap-3">
        <div className="flex h-10 items-center rounded-lg border border-border" aria-label="How many leads">
          <button type="button" onClick={() => setCount((c) => Math.max(5, c - 5))} disabled={count <= 5} aria-label="Fewer" className="flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:text-border"><Minus className="size-3.5" strokeWidth={2} /></button>
          <span className="min-w-8 text-center text-sm font-medium text-foreground tabular-nums">{count}</span>
          <button type="button" onClick={() => setCount((c) => Math.min(50, c + 5))} disabled={count >= 50} aria-label="More" className="flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:text-border"><Plus className="size-3.5" strokeWidth={2} /></button>
        </div>
        <Button className="h-10 rounded-lg px-4 text-sm font-medium" onClick={() => router.push("/leads")}>
          Find {count} more like these <ArrowRight className="size-4" strokeWidth={2} />
        </Button>
      </div>
    </Section>
  );
}
