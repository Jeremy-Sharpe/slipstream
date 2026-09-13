"use client";

import { ArrowRight, Fingerprint, FlaskConical, Minus, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/legacy/ui/button";
import type { ApiIcpFreshness } from "@/lib/api/slipstream";
import { simulateRevenueDnaShock, type SimulatedOutcome } from "@/lib/legacy/revenue-dna";
import type { Intelligence, ObjectionHandling } from "@/lib/legacy/types/intelligence";
import { cn } from "@/lib/legacy/utils";
import { Bar, EvidenceChip, OutcomeTag, Section } from "./primitives";

type Props = { data: Intelligence; active?: string; meta?: string };

export function Tiles({ data }: { data: Intelligence }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
      {data.tiles.map((t) => (
        <div key={t.label} className="rounded-legacy-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(17,24,39,0.06)]">
          <p className="text-[15px] text-muted-foreground">{t.label}</p>
          <p className="mt-2.5 text-[32px] leading-none font-bold tracking-[-0.02em] text-foreground tabular-nums">{t.value}</p>
          <p className="mt-3 text-[15px] text-muted-foreground">{t.delta}</p>
        </div>
      ))}
    </div>
  );
}

export function TrainingLens({ data, active, meta }: Props) {
  return (
    <Section id="patterns" title="Won-deal patterns" meta={meta ?? `${data.wonDeals} wins vs ${data.callsAnalysed - data.wonDeals} other calls · labelled evaluation`} active={active === "patterns"}>
      <div className="hidden grid-cols-[1fr_200px_200px] gap-x-6 text-[15px] text-muted-foreground sm:grid">
        <span />
        <span className="font-medium text-foreground">Winning calls</span>
        <span className="font-medium text-foreground">Stalled or lost</span>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {data.lens.map((row) => (
          <li key={row.label} className="grid grid-cols-1 items-start gap-3 py-5 sm:grid-cols-[1fr_200px_200px] sm:gap-x-6">
            <div>
              <p className="text-[16px] font-medium text-foreground">{row.label}</p>
              <p className="mt-1 text-[15px] text-muted-foreground">{row.takeaway}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-muted-foreground sm:hidden">Winning calls</p>
              <p className="text-[16px] text-foreground tabular-nums">{row.wins.value}</p>
              <Bar share={row.wins.share} className="mt-2" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-muted-foreground sm:hidden">Stalled or lost</p>
              <p className="text-[16px] text-foreground tabular-nums">{row.others.value}</p>
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
  const provenance = data.sourceSummary
    ? `${data.sourceSummary.calls} calls + ${data.sourceSummary.emails} emails across ${data.sourceSummary.deals} CRM deals · ${data.sourceSummary.outcomeLabelled} outcome-labelled`
    : data.sourceSummary === null
      ? "source provenance unavailable"
      : `derived from ${data.wonDeals} won deals`;
  return (
    <Section id="icp" title="Derived ICP" meta={<span className="flex items-center gap-3">{provenance} · v{data.icpVersion}<ConfidenceRing value={data.confidence} /></span>} active={active === "icp"}>
      <p className="max-w-[820px] text-[20px] leading-snug font-medium text-foreground">{data.icp.summary}</p>
      <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-legacy-lg border border-border bg-border sm:grid-cols-2">
        {data.icp.attributes.map((a) => (
          <div key={a.label} className="bg-card p-5">
            <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">{a.label}</p>
            <p className="mt-2 text-[16px] font-medium text-foreground">{a.value}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.evidence.map((e) => <EvidenceChip key={e.id} call={e} />)}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function RevenueDna({ freshness, status, active }: { freshness: ApiIcpFreshness | null; status: "checking" | "live" | "missing" | "error"; active?: string }) {
  const [simulatedOutcome, setSimulatedOutcome] = useState<SimulatedOutcome | null>(null);
  const current = freshness?.status === "current";
  const stale = freshness?.status === "stale";
  const headline = current
    ? `ICP v${freshness.profile_version} matches every current CRM outcome`
    : stale
      ? `${freshness.outcome_labels_added || "New"} outcome${freshness.outcome_labels_added === 1 ? "" : "s"} changed who you should target`
      : status === "checking"
        ? "Checking the targeting fingerprint…"
        : "Relearn once to activate continuous targeting";
  const simulation = simulatedOutcome && freshness
    ? simulateRevenueDnaShock(simulatedOutcome, freshness.profile_version, freshness.leads_on_profile)
    : null;
  return (
    <Section id="revenue-dna" title="Revenue DNA" meta="Outcome-triggered ICP freshness gate" active={active === "revenue-dna"}>
      <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:gap-8">
        <div className="flex max-w-2xl gap-4">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", current ? "bg-emerald-100 text-emerald-700" : stale ? "bg-amber-100 text-amber-800" : "bg-legacy-muted text-muted-foreground")}><Fingerprint className="size-5" /></span>
          <div>
            <p className="text-[20px] font-semibold text-foreground">{headline}</p>
            <p className="mt-2 text-[15px] leading-6 text-muted-foreground">{freshness?.reason ?? "Slipstream fingerprints the outcome-labelled cohort so yesterday’s ICP cannot silently source tomorrow’s leads."}</p>
          </div>
        </div>
        <Link href="/legacy/leads" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-legacy-md bg-foreground px-4 text-[14px] font-medium text-legacy-background hover:opacity-90">
          {stale || freshness?.leads_needing_rescore ? "Review lead impact" : "Open matched leads"}<ArrowRight className="size-4" />
        </Link>
      </div>
      {freshness && (
        <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-legacy-lg border border-border bg-border sm:grid-cols-3">
          <div className="bg-page p-4"><p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Evidence watched</p><p className="mt-2 text-[18px] font-semibold text-foreground">{freshness.source_summary.deals} deals · {freshness.source_summary.outcome_labelled} outcomes</p></div>
          <div className="bg-page p-4"><p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Targeting version</p><p className="mt-2 font-mono text-[18px] font-semibold text-foreground">v{freshness.profile_version} · {freshness.current_cohort_revision.slice(0, 7)}</p></div>
          <div className="bg-page p-4"><p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Lead impact</p><p className="mt-2 text-[18px] font-semibold text-foreground">{freshness.leads_needing_rescore ? `${freshness.leads_needing_rescore} need a new score` : `${freshness.leads_on_profile} current`}</p></div>
        </div>
      )}
      {current && freshness && (
        <div className="mt-5 overflow-hidden rounded-legacy-lg border border-border bg-page">
          <div className="flex flex-col justify-between gap-4 border-b border-border px-4 py-4 md:flex-row md:items-center">
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-legacy-md bg-primary-soft text-primary"><FlaskConical className="size-[18px]" /></span>
              <div><p className="text-[15px] font-semibold text-foreground">Outcome shock test</p><p className="mt-0.5 text-[12px] text-muted-foreground">Presenter-safe simulation · does not write to the CRM or call a provider</p></div>
            </div>
            <div className="flex items-center gap-2">
              {(["won", "lost"] as const).map((outcome) => (
                <button key={outcome} type="button" aria-pressed={simulatedOutcome === outcome} onClick={() => setSimulatedOutcome(outcome)} className={cn("h-9 rounded-legacy-md border px-3 text-[13px] font-medium transition-colors", simulatedOutcome === outcome ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-foreground/30")}>New deal {outcome}</button>
              ))}
              {simulatedOutcome && <button type="button" onClick={() => setSimulatedOutcome(null)} aria-label="Reset outcome shock test" className="flex size-9 items-center justify-center rounded-legacy-md border border-border bg-card text-muted-foreground hover:text-foreground"><RotateCcw className="size-4" /></button>}
            </div>
          </div>
          {simulation ? (
            <div className="px-4 py-4" role="status" aria-live="polite">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><p className="text-[12px] font-semibold tracking-wide text-primary uppercase">Hypothetical {simulation.outcome} recorded</p><p className="text-[12px] text-muted-foreground">Live state remains unchanged</p></div>
              <div className="mt-3 grid gap-px overflow-hidden rounded-legacy-md border border-border bg-border sm:grid-cols-4">
                <ShockStep index="1" title="Signal" value={simulation.direction} />
                <ShockStep index="2" title="Detect" value={simulation.staleProfile} />
                <ShockStep index="3" title="Protect" value={`${simulation.affectedLeads} leads need re-score · ${simulation.sourcingState}`} />
                <ShockStep index="4" title="Adapt" value={simulation.nextProfile} />
              </div>
            </div>
          ) : <p className="px-4 py-3 text-[13px] text-muted-foreground">Choose a hypothetical outcome to watch it propagate from CRM evidence to ICP version, lead scores and sourcing control.</p>}
        </div>
      )}
      <p className="mt-4 text-[13px] text-muted-foreground">The sourcing API fails closed when this fingerprint is stale. A new win or loss must be learned before credits can be spent.</p>
    </Section>
  );
}

function ShockStep({ index, title, value }: { index: string; title: string; value: string }) {
  return <div className="bg-card p-3"><p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{index} · {title}</p><p className="mt-1.5 text-[13px] leading-5 font-medium text-foreground">{value}</p></div>;
}

const HANDLING: { key: ObjectionHandling; label: string; note: string }[] = [
  { key: "handled", label: "Handled", note: "Named the risk and offered a plan" },
  { key: "partial", label: "Partially handled", note: "Acknowledged, no plan agreed" },
  { key: "ignored", label: "Ignored", note: "Moved on without answering" },
];

export function Objections({ data, active }: Props) {
  return (
    <Section id="objections" title="Objections" meta={`${data.objections.length} raised across ${data.callsAnalysed} calls`} active={active === "objections"}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {HANDLING.map((h) => {
          const items = data.objections.filter((o) => o.handling === h.key);
          return (
            <div key={h.key} className="rounded-legacy-lg border border-border bg-page">
              <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-[16px] font-medium text-foreground">{h.label}</p>
                  <p className="text-[13px] text-muted-foreground">{h.note}</p>
                </div>
                <span className="text-[16px] text-foreground tabular-nums">{items.length}</span>
              </div>
              <ul className="divide-y divide-border">
                {items.map((o, i) => (
                  <li key={i} className="px-4 py-3">
                    <p className="text-[15px] leading-snug text-foreground">“{o.text}”</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Link href={`/legacy/conversations/${o.call.id}`} className="text-[13px] text-muted-foreground hover:text-foreground hover:underline">{o.call.company}</Link>
                      <OutcomeTag outcome={o.outcome} />
                    </div>
                  </li>
                ))}
                {items.length === 0 && <li className="px-4 py-3 text-[15px] text-muted-foreground">None.</li>}
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
          <li key={t.call.id} className="grid grid-cols-[minmax(0,1fr)_56px_58px] items-center gap-3 text-[14px] sm:grid-cols-[240px_1fr_56px_80px] sm:gap-4 sm:text-[16px]">
            <Link href={`/legacy/conversations/${t.call.id}`} className={cn("truncate text-foreground hover:underline", t.outcome === "won" && "font-medium")}>{t.call.company}</Link>
            <Bar share={t.ratio} className={cn("hidden sm:block", t.outcome !== "won" && "[&>span]:bg-muted-foreground/60")} />
            <span className="text-right text-foreground tabular-nums">{Math.round(t.ratio * 100)}%</span>
            <OutcomeTag outcome={t.outcome} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[15px] text-muted-foreground">Wins sit between 44% and 50%. Every call above 60% was lost or a no-show.</p>
    </Section>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" });

export function NextSteps({ data, active }: Props) {
  return (
    <Section id="next-steps" title="Next steps" meta="What each call ended with" active={active === "next-steps"}>
      <ul className="divide-y divide-border">
        {data.nextSteps.map((n) => (
          <li key={n.call.id} className="grid grid-cols-1 items-start gap-2 py-3.5 text-[14px] sm:grid-cols-[240px_1fr_110px_80px] sm:gap-4 sm:text-[16px]">
            <Link href={`/legacy/conversations/${n.call.id}`} className="truncate text-foreground hover:underline">{n.call.company}</Link>
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
          <li key={t.label} className="grid grid-cols-[minmax(0,1fr)_40px] items-center gap-3 text-[14px] sm:grid-cols-[320px_1fr_40px] sm:gap-4 sm:text-[16px]">
            <span className={cn("truncate", t.label === "No trigger" ? "text-muted-foreground" : "text-foreground")}>{t.label}</span>
            <Bar share={t.count / max} className={cn("hidden sm:block", t.label === "No trigger" && "[&>span]:bg-muted-foreground/60")} />
            <span className="text-right text-foreground tabular-nums">×{t.count}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[15px] text-muted-foreground">All five wins had a trigger. All four calls without one were lost or never happened.</p>
    </Section>
  );
}

export function BriefCard({ brief, active }: { brief: string; active?: string }) {
  const router = useRouter();
  const [text, setText] = useState(brief);
  const [count, setCount] = useState(10);
  return (
    <Section id="brief" title="Lead search brief" meta="Revenue DNA translated for OpenRouter sourcing" active={active === "brief"}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        aria-label="Lead search brief"
        className="w-full resize-y rounded-legacy-lg border border-border bg-page p-4 text-[16px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <div className="flex h-10 items-center rounded-legacy-md border border-border" aria-label="How many leads">
          <button type="button" onClick={() => setCount((c) => Math.max(5, c - 5))} disabled={count <= 5} aria-label="Fewer" className="flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:text-border"><Minus className="size-3.5" strokeWidth={2} /></button>
          <span className="min-w-8 text-center text-[16px] font-medium text-foreground tabular-nums">{count}</span>
          <button type="button" onClick={() => setCount((c) => Math.min(50, c + 5))} disabled={count >= 50} aria-label="More" className="flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:text-border"><Plus className="size-3.5" strokeWidth={2} /></button>
        </div>
        <Button className="h-10 rounded-legacy-md px-4 text-[16px] font-medium" onClick={() => router.push("/legacy/leads")}>
          Find {count} more like these <ArrowRight className="size-4" strokeWidth={2} />
        </Button>
      </div>
    </Section>
  );
}
