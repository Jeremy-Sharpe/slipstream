"use client";

import {
  ArrowRight,
  BarChart3,
  Check,
  DatabaseZap,
  MailCheck,
  Pause,
  Play,
  Radar,
  Sparkles,
  Target,
  Volume2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCampaigns, getLatestIcp, getReadiness } from "@/lib/api/slipstream";
import { cn } from "@/lib/utils";

type Proof = {
  checked: boolean;
  api: boolean;
  revision: string | null;
  reasoning: string | null;
  embedding: string | null;
  deals: number | null;
  calls: number | null;
  emails: number | null;
  campaignPaused: boolean | null;
  queued: number | null;
  sent: number | null;
};

type LoopStep = {
  eyebrow: string;
  title: string;
  result: string;
  detail: string;
  impact: string;
  href: string;
  cta: string;
  icon: LucideIcon;
};

const EMPTY_PROOF: Proof = {
  checked: false,
  api: false,
  revision: null,
  reasoning: null,
  embedding: null,
  deals: null,
  calls: null,
  emails: null,
  campaignPaused: null,
  queued: null,
  sent: null,
};

const MAYA_CALL = "/conversations/call-01-northstar-labs";

function compactModel(model: string | null, fallback: string) {
  if (!model) return fallback;
  if (model.includes("qwen")) return "Local Qwen";
  if (model.includes("nomic")) return "Local Nomic";
  return model;
}

export function RevenueLoop() {
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [proof, setProof] = useState<Proof>(EMPTY_PROOF);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    Promise.allSettled([
      getReadiness(controller.signal),
      getLatestIcp(controller.signal),
      getCampaigns(controller.signal),
    ]).then(
      ([readyResult, icpResult, campaignsResult]) => {
        if (cancelled) return;
        window.clearTimeout(timeout);
        const ready = readyResult.status === "fulfilled" ? readyResult.value : null;
        const profile = icpResult.status === "fulfilled" ? icpResult.value : null;
        const campaigns = campaignsResult.status === "fulfilled" ? campaignsResult.value : [];
        const campaign = campaigns.find((item) => item.name.includes("Hackathon demo"));
        setProof({
          checked: true,
          api: ready !== null,
          revision: ready?.revision.slice(0, 7) ?? null,
          reasoning: ready?.reasoning_model ?? null,
          embedding: ready?.embedding_model ?? null,
          deals: profile?.profile.source_summary?.deals ?? null,
          calls: profile?.profile.source_summary?.calls ?? null,
          emails: profile?.profile.source_summary?.emails ?? null,
          campaignPaused: campaign ? campaign.status === "paused" : null,
          queued: campaign?.counts.queued ?? null,
          sent: campaign?.counts.sent ?? null,
        });
      },
    );
    return () => { cancelled = true; window.clearTimeout(timeout); controller.abort(); };
  }, []);

  const steps = useMemo<LoopStep[]>(() => [
    {
      eyebrow: "01 · Listen",
      title: "One sales call",
      result: "Maya names the deadline",
      detail: "The buyer explains that her cyber-insurance renewal now requires Essential Eight evidence.",
      impact: "The conversation becomes structured input instead of disappearing into a recorder.",
      href: MAYA_CALL,
      cta: "Open transcript",
      icon: Volume2,
    },
    {
      eyebrow: "02 · Remember",
      title: "CRM writes itself",
      result: "Contact · company · deal",
      detail: "Slipstream extracts CRM-shaped fields with confidence and exact source evidence for review.",
      impact: "The pipeline reflects what the buyer actually said, without ten minutes of rep admin.",
      href: MAYA_CALL,
      cta: "Inspect evidence",
      icon: DatabaseZap,
    },
    {
      eyebrow: "03 · Respond",
      title: "Safe follow-up",
      result: "Risky guarantee removed",
      detail: "The draft keeps the agreed next step but refuses to repeat the unsupported insurance promise.",
      impact: "The rep gets speed without turning model fluency into commercial risk.",
      href: MAYA_CALL,
      cta: "Review draft",
      icon: MailCheck,
    },
    {
      eyebrow: "04 · Learn",
      title: "The team compounds",
      result: proof.calls == null ? "Calls + emails + outcomes" : `${proof.calls} calls + ${proof.emails ?? 0} email`,
      detail: "Won, lost and stalled conversations become one evidence set for patterns, coaching and fit.",
      impact: "Every conversation improves the playbook instead of living as an isolated note.",
      href: "/intelligence",
      cta: "See win patterns",
      icon: BarChart3,
    },
    {
      eyebrow: "05 · Focus",
      title: "ICP emerges",
      result: "25–80 staff · urgent trigger",
      detail: `${proof.deals ?? 13} CRM deals point to professional-services and allied-health buyers with a decision-maker involved.`,
      impact: "The target customer comes from actual wins, not a persona workshop.",
      href: "/intelligence#icp",
      cta: "Open cited ICP",
      icon: Target,
    },
    {
      eyebrow: "06 · Find",
      title: "Next search writes itself",
      result: "Origami brief ready",
      detail: "The won-deal profile becomes a precise sourcing brief, ready for Origami when its paid key is connected.",
      impact: "The last customer directly changes who the team goes after next.",
      href: "/leads",
      cta: "View lead handoff",
      icon: Radar,
    },
    {
      eyebrow: "07 · Execute",
      title: "Outreach stays controlled",
      result: proof.campaignPaused ? `${proof.queued ?? 0} queued · ${proof.sent ?? 0} sent` : "Approval before delivery",
      detail: proof.campaignPaused
        ? "The live demo campaign is intentionally paused for 2099, with zero delivery attempts."
        : "Exact approved drafts enter a bounded campaign with pause, retry and reconciliation states.",
      impact: "Automation moves quickly without inventing a send or surprising a real person.",
      href: "/campaigns",
      cta: "Inspect campaign",
      icon: Pause,
    },
  ], [proof]);

  useEffect(() => {
    if (!playing) return;
    if (active >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setActive((current) => current + 1), 850);
    return () => window.clearTimeout(timer);
  }, [active, playing, steps.length]);

  const replay = () => {
    setActive(0);
    setPlaying(true);
  };
  const selected = steps[Math.max(active, 0)];
  const progress = active < 0 ? 0 : ((active + 1) / steps.length) * 100;

  return (
    <div className="min-h-full bg-page px-8 py-7">
      <section className="relative overflow-hidden rounded-2xl bg-foreground px-8 py-8 text-background shadow-[0_24px_70px_rgba(17,24,39,0.16)]">
        <div className="absolute -top-32 right-0 size-96 rounded-full bg-primary/25 blur-3xl" aria-hidden />
        <div className="relative flex items-end justify-between gap-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.16em] text-primary uppercase">
              <Sparkles className="size-4" /> Guided replay · verified artifacts
            </div>
            <h1 className="mt-4 text-[46px] leading-[1.02] font-bold tracking-[-0.045em]">
              One call compounds into<br />the next customer.
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-7 text-background/70">
              Watch a buyer conversation become CRM truth, a safe follow-up, team intelligence, an evidence-backed ICP and the next campaign.
            </p>
          </div>
          <button
            type="button"
            onClick={replay}
            className="flex h-12 shrink-0 items-center gap-2 rounded-lg bg-primary px-5 text-[16px] font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-background focus-visible:outline-none"
          >
            {playing ? <Zap className="size-5 animate-pulse" /> : <Play className="size-5 fill-current" />}
            {active < 0 ? "Run the revenue loop" : playing ? "Loop running" : "Replay the loop"}
          </button>
        </div>

        <div className="relative mt-8 grid grid-cols-4 gap-3 border-t border-background/15 pt-5">
          <ProofPill label="Production API" value={proof.api ? "Connected" : proof.checked ? "Offline fallback" : "Checking…"} live={proof.api} />
          <ProofPill label="Reasoning" value={compactModel(proof.reasoning, proof.checked ? "Proof unavailable" : "Checking…")} live={proof.reasoning !== null} />
          <ProofPill label="Embeddings" value={compactModel(proof.embedding, proof.checked ? "Proof unavailable" : "Checking…")} live={proof.embedding !== null} />
          <ProofPill label="Exact revision" value={proof.revision ?? (proof.checked ? "Unavailable" : "Checking…")} live={proof.revision !== null} mono />
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.05)]">
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-7 gap-px bg-border">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const reached = index <= active;
            const current = index === active;
            return (
              <button
                key={step.eyebrow}
                type="button"
                onClick={() => { setPlaying(false); setActive(index); }}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "relative min-h-40 bg-card px-4 py-5 text-left transition-all focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  reached ? "bg-primary-soft" : "hover:bg-page",
                  current && "z-10 shadow-[inset_0_0_0_2px_var(--primary)]",
                )}
              >
                <span className={cn("flex size-9 items-center justify-center rounded-full border", reached ? "border-primary bg-primary text-primary-foreground" : "border-border bg-page text-muted-foreground")}>
                  {index < active ? <Check className="size-4" strokeWidth={2.5} /> : <Icon className="size-4" strokeWidth={2} />}
                </span>
                <span className="mt-4 block text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{step.eyebrow}</span>
                <span className="mt-1 block text-[15px] leading-5 font-semibold text-foreground">{step.title}</span>
                <span className={cn("mt-2 block text-[12px] leading-4", reached ? "text-primary" : "text-muted-foreground")}>{step.result}</span>
                {index < steps.length - 1 && <ArrowRight className="absolute top-7 -right-2.5 z-20 size-5 rounded-full bg-card p-0.5 text-muted-foreground" aria-hidden />}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-[1.2fr_1fr_auto] items-center gap-8 border-t border-border bg-page px-7 py-6" aria-live="polite">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.12em] text-primary uppercase">{selected.eyebrow}</p>
            <h2 className="mt-1 text-[23px] font-bold tracking-[-0.02em] text-foreground">{selected.result}</h2>
            <p className="mt-2 max-w-xl text-[15px] leading-6 text-secondary">{selected.detail}</p>
          </div>
          <div className="border-l border-border pl-7">
            <p className="text-[12px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Why it matters</p>
            <p className="mt-2 text-[15px] leading-6 text-foreground">{selected.impact}</p>
          </div>
          <Link href={selected.href} className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[14px] font-semibold text-foreground shadow-sm transition-colors hover:border-foreground/30 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
            {selected.cta}<ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <div className="mt-4 flex items-center justify-between px-1 text-[12px] text-muted-foreground">
        <span>This replay navigates existing evidence; it does not simulate provider calls or send email.</span>
        <span>{proof.deals == null ? (proof.checked ? "Live proof unavailable · artifact links remain usable" : "Loading live cohort…") : `${proof.deals} CRM deals · ${proof.calls} calls · ${proof.emails} email · campaign ${proof.campaignPaused ? "paused" : "status checked"}`}</span>
      </div>
    </div>
  );
}

function ProofPill({ label, value, live, mono = false }: { label: string; value: string; live: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("size-2 rounded-full", live ? "bg-primary shadow-[0_0_12px_var(--primary)]" : "bg-background/25 animate-pulse")} aria-hidden />
      <span>
        <span className="block text-[11px] tracking-wide text-background/45 uppercase">{label}</span>
        <span className={cn("mt-0.5 block text-[14px] font-medium text-background", mono && "font-mono")}>{value}</span>
      </span>
    </div>
  );
}
