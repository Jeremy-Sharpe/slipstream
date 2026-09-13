"use client";

import { ArrowLeft, ArrowRight, BarChart3, Calculator, Check, DatabaseZap, MailCheck, Pause, Play, Radar, Sparkles, Target, TrendingUp, UsersRound, Volume2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCampaigns, getLatestIcp, getReadiness } from "@/lib/api/slipstream";
import { EMPTY_DEMO_PROOF, campaignSafety, icpClaimSafety, modelLabel, nextPresenterStep, parseStoredStep, playbackLabel, proofFooter, rateScenario, settleDemoProof, type DemoProof } from "@/lib/demo/revenue-loop";
import { cn } from "@/lib/utils";

type LoopStep = { eyebrow: string; title: string; result: string; detail: string; impact: string; provenance: string; verified: boolean; href: string; cta: string; icon: LucideIcon };
const MAYA_CALL = "/conversations/call-01-northstar-labs";
const STEP_COUNT = 7;
const STORAGE_KEY = "slipstream.revenue-loop.step";
const COACHING_SCENARIO = rateScenario({ volume: 40, baselineRate: 0.2, scenarioRate: 0.225 });
const TARGETING_SCENARIO = rateScenario({ volume: 200, baselineRate: 0.05, scenarioRate: 0.06 });

export function RevenueLoop({ initialProof = EMPTY_DEMO_PROOF }: { initialProof?: DemoProof }) {
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [proof, setProof] = useState<DemoProof>(initialProof);
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const stepRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const stepsViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try { setActive(parseStoredStep(window.sessionStorage.getItem(STORAGE_KEY), STEP_COUNT)); } catch { /* Persistence is optional in privacy-restricted browsers. */ }
  }, []);
  useEffect(() => { if (active >= 0) try { window.sessionStorage.setItem(STORAGE_KEY, String(active)); } catch { /* Keep in-memory controls working. */ } }, [active]);
  useEffect(() => {
    const viewport = stepsViewportRef.current;
    const step = active >= 0 ? stepRefs.current[active] : null;
    if (!viewport || !step) return;
    const left = step.offsetLeft < viewport.scrollLeft
      ? step.offsetLeft
      : step.offsetLeft + step.offsetWidth > viewport.scrollLeft + viewport.clientWidth
        ? step.offsetLeft + step.offsetWidth - viewport.clientWidth
        : viewport.scrollLeft;
    if (left !== viewport.scrollLeft) viewport.scrollLeft = Math.max(0, left);
  }, [active, reducedMotion]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReducedMotion(query.matches); if (query.matches) setPlaying(false); };
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let mounted = true;
    let request = 0;
    let controller: AbortController | null = null;
    const refresh = async (invalidate = false) => {
      if (invalidate && mounted) { setProof(EMPTY_DEMO_PROOF); setVerifiedAt(null); }
      controller?.abort();
      const nextController = new AbortController();
      controller = nextController;
      const current = ++request;
      const timeout = window.setTimeout(() => nextController.abort(), 5000);
      const [runtime, icp, campaigns] = await Promise.allSettled([getReadiness(nextController.signal), getLatestIcp(nextController.signal), getCampaigns(nextController.signal)]);
      window.clearTimeout(timeout);
      if (!mounted || current !== request) return;
        setProof(settleDemoProof(runtime, icp, campaigns));
        setVerifiedAt(Date.now());
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh(true);
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(true); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { mounted = false; request += 1; window.clearInterval(interval); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVisibility); controller?.abort(); };
  }, []);

  const steps = useMemo<LoopStep[]>(() => {
    const liveIcp = proof.icp.status === "verified" ? proof.icp.value : null;
    const source = liveIcp?.profile.source_summary;
    const icpSafety = liveIcp ? icpClaimSafety(liveIcp) : null;
    const campaign = proof.campaign.status === "verified" ? campaignSafety(proof.campaign.value) : null;
    return [
      { eyebrow: "01 · Listen", title: "One sales call", result: "Maya names the deadline", detail: "The recorded buyer example explains that her cyber-insurance renewal now requires Essential Eight evidence.", impact: "The conversation becomes structured input instead of disappearing into a recorder.", provenance: "Recorded Maya example", verified: false, href: `${MAYA_CALL}#transcript`, cta: "Open transcript", icon: Volume2 },
      { eyebrow: "02 · Remember", title: "CRM writes itself", result: "Contact · company · deal", detail: "Slipstream extracts CRM-shaped fields with confidence and exact source evidence for review.", impact: "The pipeline reflects what the buyer actually said, without ten minutes of rep admin.", provenance: "Recorded Maya example", verified: false, href: `${MAYA_CALL}#crm-writeback`, cta: "Inspect CRM evidence", icon: DatabaseZap },
      { eyebrow: "03 · Respond", title: "Safe follow-up", result: "Risky guarantee removed", detail: "The recorded draft keeps the agreed next step but refuses to repeat an unsupported insurance promise.", impact: "The rep gets speed without turning model fluency into commercial risk.", provenance: "Recorded Maya example", verified: false, href: `${MAYA_CALL}#follow-up-draft`, cta: "Review exact draft", icon: MailCheck },
      { eyebrow: "04 · Learn", title: "The team compounds", result: icpSafety?.cohort && source ? `${source.calls} calls + ${source.emails} email${source.emails === 1 ? "" : "s"}` : "Aggregate proof unavailable", detail: icpSafety?.cohort && source ? `${source.deals} CRM deals connect calls, emails and ${source.outcome_labelled} outcome labels into one evidence set.` : "The deployed ICP cohort could not be verified. Open Intelligence to inspect the current source state.", impact: "Every conversation improves the playbook instead of living as an isolated note.", provenance: icpSafety?.cohort ? `Live ICP v${liveIcp?.version}` : "Live proof unavailable", verified: Boolean(icpSafety?.cohort), href: "/intelligence#patterns", cta: "See win patterns", icon: BarChart3 },
      { eyebrow: "05 · Focus", title: "ICP emerges", result: icpSafety?.citedProfile && liveIcp ? `${liveIcp.profile.headcount_band} · ${liveIcp.profile.industries.filter((value) => value.trim()).slice(0, 2).join(" + ")}` : "ICP proof unavailable", detail: icpSafety?.citedProfile && liveIcp && source ? `${source.deals} CRM deals support a cited profile with ${liveIcp.evidence.length} evidence dimensions.` : "No demographic claim is substituted when the deployed ICP evidence is unavailable or empty.", impact: "The target customer comes from actual wins, not a persona workshop.", provenance: icpSafety?.citedProfile ? `Live ICP v${liveIcp?.version}` : "Live proof unavailable", verified: Boolean(icpSafety?.citedProfile), href: "/intelligence#icp", cta: "Open cited ICP", icon: Target },
      { eyebrow: "06 · Find", title: "Next search writes itself", result: icpSafety?.brief && liveIcp ? `Search brief from ICP v${liveIcp.version}` : "Search brief unavailable", detail: icpSafety?.brief ? "The won-deal profile is already translated into a precise sourcing brief; OpenRouter can generate a safe fictional proof without a paid data subscription." : "The handoff is shown only when the deployed API returns a substantive, evidence-backed lead-search brief.", impact: "The last customer directly changes who the team goes after next.", provenance: icpSafety?.brief ? "Live generated brief" : "Live proof unavailable", verified: Boolean(icpSafety?.brief), href: "/intelligence#brief", cta: "Open search brief", icon: Radar },
      { eyebrow: "07 · Execute", title: "Outreach stays controlled", result: campaign?.summary ?? "Campaign proof unavailable", detail: campaign?.detail ?? "The exact seeded campaign was not returned, so Slipstream makes no delivery-state claim.", impact: "Automation moves quickly without inventing a send or surprising a real person.", provenance: campaign?.verified ? "Live guardrail verified" : campaign ? "Live state changed" : "Live proof unavailable", verified: campaign?.verified ?? false, href: "/campaigns#delivery-execution", cta: "Inspect exact execution", icon: Pause },
    ];
  }, [proof]);

  useEffect(() => {
    if (!playing) return;
    if (active >= steps.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setActive((current) => current + 1), 1800);
    return () => window.clearTimeout(timer);
  }, [active, playing, steps.length]);

  const togglePlayback = () => {
    if (playing) { setPlaying(false); return; }
    if (reducedMotion) { setActive((current) => nextPresenterStep(current, steps.length)); return; }
    if (active < 0 || active >= steps.length - 1) setActive(0);
    setPlaying(true);
  };
  const selectStep = (index: number) => { setPlaying(false); setActive(index); };
  const selected = steps[Math.max(active, 0)];
  const progress = active < 0 ? 0 : ((active + 1) / steps.length) * 100;
  const runtime = proof.runtime.status === "verified" ? proof.runtime.value : null;
  const proofFallback = proof.runtime.status === "loading" ? "Checking…" : "Proof unavailable";

  return (
    <div className="min-h-full bg-page px-4 py-5 md:px-8 md:py-7">
      <section className="relative overflow-hidden rounded-2xl bg-foreground px-5 py-7 text-background shadow-[0_24px_70px_rgba(17,24,39,0.16)] md:px-8 md:py-8">
        <div className="absolute -top-32 right-0 size-96 rounded-full bg-primary/25 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.16em] text-primary uppercase"><Sparkles className="size-4" /> Recorded journey · live runtime proof</div>
            <h1 className="mt-4 text-[36px] leading-[1.02] font-bold tracking-[-0.045em] sm:text-[46px]">One call compounds into<br />the next customer.</h1>
            <p className="mt-5 max-w-2xl text-[16px] leading-7 text-background/70 sm:text-[17px]">Watch a buyer conversation become CRM truth, a safe follow-up, team intelligence, an evidence-backed ICP and the next campaign.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => selectStep(steps.length - 1)} className="h-11 rounded-lg border border-background/20 px-4 text-[14px] font-semibold text-background transition-colors hover:bg-background/10 focus-visible:ring-2 focus-visible:ring-background focus-visible:outline-none">Show complete loop</button>
            <button type="button" onClick={togglePlayback} className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-background focus-visible:outline-none motion-reduce:hover:scale-100">
              {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}{playbackLabel(reducedMotion, playing, active, steps.length)}
            </button>
          </div>
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-4 border-t border-background/15 pt-5 lg:grid-cols-4">
          <ProofPill label={runtime?.environment === "production" ? "Production API" : "Configured API"} value={runtime ? "Connected" : proofFallback} live={Boolean(runtime)} />
          <ProofPill label="Reasoning" value={runtime ? modelLabel(runtime.reasoning_provider, runtime.reasoning_model) : proofFallback} live={Boolean(runtime?.reasoning_provider && runtime.reasoning_model)} />
          <ProofPill label="Embeddings" value={runtime ? modelLabel(runtime.embedding_provider, runtime.embedding_model) : proofFallback} live={Boolean(runtime?.embedding_provider && runtime.embedding_model)} />
          <ProofPill label="Exact revision" value={runtime?.revision.slice(0, 7) ?? proofFallback} live={Boolean(runtime?.revision)} mono />
        </div>
      </section>

      <aside className="mt-4 grid overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.04)] sm:grid-cols-[auto_repeat(4,1fr)]" aria-label="Illustrative rep capacity estimate">
        <div className="flex items-center gap-3 border-b border-border bg-primary-soft px-5 py-3 sm:border-r sm:border-b-0">
          <Calculator className="size-5 text-primary" />
          <div><p className="text-[12px] font-semibold tracking-wide text-foreground uppercase">Rep capacity</p><p className="text-[11px] text-muted-foreground">Illustrative, not measured</p></div>
        </div>
        <ImpactNumber value="10 min" label="fully recovered per call · assumption" />
        <ImpactNumber value="× 8 × 5" label="calls/day × working days" />
        <ImpactNumber value="= 6.7 hrs" label="returned per week" />
        <ImpactNumber value="≈ $500" label="weekly capacity at $75/hr" accent />
      </aside>

      <aside className="mt-3 grid gap-px overflow-hidden rounded-xl border border-border bg-border shadow-[0_1px_3px_rgba(17,24,39,0.04)] lg:grid-cols-2" aria-label="Illustrative pipeline upside scenarios">
        <ValueScenario
          icon={TrendingUp}
          eyebrow="Coaching scenario"
          title={`+${COACHING_SCENARIO.additionalOutcomes} win / month`}
          formula="40 qualified opportunities · 20% → 22.5% win rate"
          detail="What one prevented miss would mean; illustrative, not a forecast."
        />
        <ValueScenario
          icon={UsersRound}
          eyebrow="Targeting scenario"
          title={`+${TARGETING_SCENARIO.additionalOutcomes} buyer conversations / month`}
          formula="200 outbound prospects · 5% → 6% positive replies"
          detail="What one-point better targeting would mean; illustrative, not measured."
        />
      </aside>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.05)]">
        <div className="h-1 bg-muted"><div className="h-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div>
        <div ref={stepsViewportRef} className="relative overflow-x-auto"><div className="grid min-w-[980px] grid-cols-7 gap-px bg-border">
          {steps.map((step, index) => {
            const Icon = step.icon; const reached = index <= active; const current = index === active;
            return <button ref={(element) => { stepRefs.current[index] = element; }} key={step.eyebrow} type="button" onClick={() => selectStep(index)} aria-current={current ? "step" : undefined} className={cn("relative min-h-40 bg-card px-4 py-5 text-left transition-all focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none motion-reduce:transition-none", reached ? "bg-primary-soft" : "hover:bg-page", current && "z-10 shadow-[inset_0_0_0_2px_var(--primary)]")}>
              <span className={cn("flex size-9 items-center justify-center rounded-full border", reached ? "border-primary bg-primary text-primary-foreground" : "border-border bg-page text-muted-foreground")}>{index < active ? <Check className="size-4" strokeWidth={2.5} /> : <Icon className="size-4" strokeWidth={2} />}</span>
              <span className="mt-4 block text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{step.eyebrow}</span><span className="mt-1 block text-[15px] leading-5 font-semibold text-foreground">{step.title}</span><span className={cn("mt-2 block text-[12px] leading-4", reached ? "text-primary" : "text-muted-foreground")}>{step.result}</span>
              {index < steps.length - 1 && <ArrowRight className="absolute top-7 -right-2.5 z-20 size-5 rounded-full bg-card p-0.5 text-muted-foreground" aria-hidden />}
            </button>;
          })}
        </div></div>
        <div className="grid grid-cols-1 items-center gap-6 border-t border-border bg-page px-5 py-6 lg:grid-cols-[1.2fr_1fr_auto] lg:gap-8 lg:px-7">
          <div><div className="flex flex-wrap items-center gap-2"><p className="text-[12px] font-semibold tracking-[0.12em] text-primary uppercase">{selected.eyebrow}</p><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", selected.verified ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground")}>{selected.provenance}</span></div><h2 className="mt-1 text-[23px] font-bold tracking-[-0.02em] text-foreground">{selected.result}</h2><p className="mt-2 max-w-xl text-[15px] leading-6 text-secondary">{selected.detail}</p></div>
          <div className="border-t border-border pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7"><p className="text-[12px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Why it matters</p><p className="mt-2 text-[15px] leading-6 text-foreground">{selected.impact}</p></div>
          <Link href={selected.href} className="flex h-10 w-fit items-center gap-2 rounded-lg border border-border bg-card px-4 text-[14px] font-semibold text-foreground shadow-sm transition-colors hover:border-foreground/30 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">{selected.cta}<ArrowRight className="size-4" /></Link>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-3">
          <div className="flex items-center gap-2"><button type="button" disabled={active <= 0} onClick={() => selectStep(active - 1)} className="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium disabled:opacity-40"><ArrowLeft className="size-3.5" /> Previous</button><button type="button" disabled={active >= steps.length - 1} onClick={() => selectStep(Math.max(0, active + 1))} className="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium disabled:opacity-40">Next <ArrowRight className="size-3.5" /></button></div>
          <span className="text-xs text-muted-foreground">Presenter-controlled · selection persists while evidence opens</span>
        </div>
      </section>
      <div className="mt-4 flex flex-col justify-between gap-2 px-1 text-[12px] text-muted-foreground sm:flex-row"><span>This replay navigates existing evidence; it does not simulate provider calls or send email.</span><span>{proofFooter(proof)}{verifiedAt ? ` · checked ${new Date(verifiedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}</span></div>
      <span className="sr-only" role="status" aria-live="polite">Stage {Math.max(active + 1, 1)}: {selected.title}. {selected.result}</span>
    </div>
  );
}

function ProofPill({ label, value, live, mono = false }: { label: string; value: string; live: boolean; mono?: boolean }) {
  return <div className="flex min-w-0 items-center gap-3"><span className={cn("size-2 shrink-0 rounded-full", live ? "bg-primary shadow-[0_0_12px_var(--primary)]" : "bg-background/25")} aria-hidden /><span className="min-w-0"><span className="block text-[11px] tracking-wide text-background/45 uppercase">{label}</span><span className={cn("mt-0.5 block truncate text-[14px] font-medium text-background", mono && "font-mono")} title={value}>{value}</span></span></div>;
}

function ImpactNumber({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return <div className="border-b border-border px-5 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"><strong className={cn("block text-[18px] tracking-[-0.02em]", accent ? "text-primary" : "text-foreground")}>{value}</strong><span className="text-[11px] text-muted-foreground">{label}</span></div>;
}

function ValueScenario({ icon: Icon, eyebrow, title, formula, detail }: { icon: LucideIcon; eyebrow: string; title: string; formula: string; detail: string }) {
  return <div className="flex gap-4 bg-card px-5 py-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="size-5" /></span><div><p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{eyebrow}</p><p className="mt-0.5 text-[20px] font-bold tracking-[-0.025em] text-foreground">{title}</p><p className="mt-1 text-[12px] font-medium text-secondary">{formula}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></div></div>;
}
