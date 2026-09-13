"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Fingerprint, Loader2, RefreshCw, Server, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCampaigns, getIcpFreshness, type ApiCampaign, type ApiIcpFreshness } from "@/lib/api/slipstream";
import { cn } from "@/lib/legacy/utils";

type LoadState =
  | { status: "loading" }
  | { status: "live"; campaigns: ApiCampaign[] }
  | { status: "error"; message: string };

type FreshnessLoadState =
  | { status: "loading" }
  | { status: "live"; freshness: ApiIcpFreshness }
  | { status: "missing" }
  | { status: "error"; message: string };

const STATUS_LABEL: Record<ApiCampaign["status"], string> = {
  scheduled: "Scheduled",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  attention: "Needs attention",
};

const ITEM_LABEL: Record<ApiCampaign["items"][number]["state"], string> = {
  queued: "Queued",
  running: "Running",
  sent: "Sent",
  retryable: "Retry scheduled",
  failed: "Failed",
  reconcile: "Reconcile",
};

function dueLabel(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function RevenueDnaGate({ state }: { state: FreshnessLoadState }) {
  const freshness = state.status === "live" ? state.freshness : null;
  const current = freshness?.status === "current";
  const stale = freshness?.status === "stale";
  const statusLabel = current ? "Current" : stale ? "Sourcing blocked" : freshness ? "Relearn required" : state.status === "loading" ? "Checking" : "Unavailable";
  const detail = current
    ? `ICP v${freshness.profile_version} matches cohort ${freshness.current_cohort_revision.slice(0, 7)}. ${freshness.leads_on_profile} lead${freshness.leads_on_profile === 1 ? "" : "s"} inherit this targeting version.`
    : stale
      ? `A CRM outcome changed the target. ${freshness.leads_needing_rescore} lead${freshness.leads_needing_rescore === 1 ? "" : "s"} must be re-scored before another provider search.`
      : freshness
        ? `ICP v${freshness.profile_version} predates cohort fingerprinting. Relearn before spending another sourcing credit.`
        : state.status === "loading"
          ? "Comparing the current ICP with the latest CRM outcomes…"
          : state.status === "error"
            ? `Targeting proof unavailable: ${state.message}`
            : "No derived ICP exists yet. Derive Revenue DNA before sourcing the next campaign.";

  return (
    <div className={cn("mx-5 mt-4 grid gap-3 rounded-legacy-lg border px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center", current ? "border-emerald-200 bg-emerald-50/60" : stale ? "border-amber-300 bg-amber-50" : "border-border bg-page")}>
      <span className={cn("flex size-9 items-center justify-center rounded-full", current ? "bg-emerald-100 text-emerald-700" : stale ? "bg-amber-100 text-amber-800" : "bg-legacy-muted text-muted-foreground")}>
        {current ? <ShieldCheck className="size-[18px]" /> : <Fingerprint className="size-[18px]" />}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold text-foreground">Revenue DNA spend gate</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", current ? "bg-emerald-100 text-emerald-800" : stale ? "bg-amber-100 text-amber-900" : "bg-legacy-muted text-muted-foreground")}>{statusLabel}</span>
        </div>
        <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{detail}</p>
      </div>
      <Link href="/legacy/intelligence#revenue-dna" className="inline-flex h-8 w-fit items-center gap-1.5 rounded-legacy-md border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-legacy-muted">
        Inspect evidence <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

export function LiveCampaignRuns({ initialCampaigns, initialFreshness, initialFreshnessError }: { initialCampaigns?: ApiCampaign[] | null; initialFreshness?: ApiIcpFreshness | null; initialFreshnessError?: string }) {
  const [state, setState] = useState<LoadState>(() => initialCampaigns === undefined
    ? { status: "loading" }
    : initialCampaigns === null
      ? { status: "error", message: "Campaign API unavailable during initial render" }
      : { status: "live", campaigns: initialCampaigns });
  const [freshnessState, setFreshnessState] = useState<FreshnessLoadState>(() => initialFreshnessError
    ? { status: "error", message: initialFreshnessError }
    : initialFreshness === undefined
    ? { status: "loading" }
    : initialFreshness === null
      ? { status: "missing" }
      : { status: "live", freshness: initialFreshness });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const controllerRef = useRef<AbortController>(null);
  const requestRef = useRef(0);
  const load = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestRef.current;
    setState({ status: "loading" });
    setFreshnessState({ status: "loading" });
    getCampaigns(controller.signal)
      .then((campaigns) => {
        if (!controller.signal.aborted && requestRef.current === requestId) setState({ status: "live", campaigns });
      })
      .catch((error) => {
        if (controller.signal.aborted || requestRef.current !== requestId) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Campaign API unavailable" });
      });
    getIcpFreshness(controller.signal)
      .then((freshness) => {
        if (controller.signal.aborted || requestRef.current !== requestId) return;
        setFreshnessState(freshness ? { status: "live", freshness } : { status: "missing" });
      })
      .catch((error) => {
        if (controller.signal.aborted || requestRef.current !== requestId) return;
        setFreshnessState({ status: "error", message: error instanceof Error ? error.message : "Revenue DNA API unavailable" });
      });
  }, []);

  useEffect(() => {
    if (initialCampaigns === undefined || (initialFreshness === undefined && !initialFreshnessError)) load();
    return () => {
      requestRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [initialCampaigns, initialFreshness, initialFreshnessError, load]);

  const campaigns = state.status === "live" ? state.campaigns : [];
  return (
    <section id="delivery-execution" className="mx-4 mt-7 scroll-mt-6 overflow-hidden rounded-legacy-xl border border-border bg-card sm:mx-11" aria-label="Live delivery execution">
      <p className="sr-only" role="status" aria-live="polite">
        {state.status === "loading" ? "Refreshing campaign execution status" : state.status === "error" ? `Campaign execution refresh failed: ${state.message}` : `${state.campaigns.length} live campaign records loaded`}
      </p>
      <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-legacy-lg bg-icon-well"><Server className="size-4.5" strokeWidth={1.8} /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-foreground">Delivery execution</h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Live API</span>
            </div>
            <p className="truncate text-[12.5px] text-muted-foreground">Execution state from the server · expandable item outcomes</p>
          </div>
        </div>
        <button type="button" onClick={load} disabled={state.status === "loading"} className="flex h-8 items-center gap-1.5 rounded-legacy-md border border-border px-2.5 text-xs font-medium text-foreground hover:bg-legacy-muted disabled:opacity-50">
          {state.status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh
        </button>
      </div>

      <RevenueDnaGate state={freshnessState} />

      {state.status === "loading" && <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Reading execution state…</div>}
      {state.status === "error" && (
        <div className="flex min-h-24 items-center gap-3 px-5 py-4" role="alert">
          <AlertTriangle className="size-5 shrink-0 text-amber-600" />
          <div><p className="text-sm font-medium text-foreground">Live execution status is unavailable</p><p className="text-xs text-muted-foreground">{state.message}. The sequence workspace below remains evaluation data.</p></div>
        </div>
      )}
      {state.status === "live" && campaigns.length === 0 && (
        <div className="flex min-h-24 items-center gap-3 px-5 py-4">
          <Server className="size-5 shrink-0 text-muted-foreground" />
          <div><p className="text-sm font-medium text-foreground">API connected; no campaign records returned</p><p className="text-xs text-muted-foreground">When a trusted scheduler enrolls approved draft IDs, their confirmed execution state will appear here.</p></div>
        </div>
      )}
      {state.status === "live" && campaigns.length > 0 && (
        <div className="divide-y divide-border">
          {campaigns.map((campaign) => {
            const attention = campaign.counts.failed + campaign.counts.reconcile;
            const pending = campaign.counts.queued + campaign.counts.running + campaign.counts.retryable;
            const progress = Math.round((campaign.counts.sent / campaign.items.length) * 100);
            return (
              <details
                key={campaign.id}
                className="group"
                open={expanded.has(campaign.id)}
                onToggle={(event) => {
                  const open = event.currentTarget.open;
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (open) next.add(campaign.id);
                    else next.delete(campaign.id);
                    return next;
                  });
                }}
              >
                <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 marker:hidden md:grid-cols-[minmax(0,1fr)_130px_210px] md:items-center">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{campaign.name}</p><p className="mt-0.5 text-xs text-muted-foreground">Created by {campaign.created_by} · due {dueLabel(campaign.scheduled_for)} · select for item outcomes</p></div>
                  <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-semibold", campaign.status === "completed" ? "bg-emerald-50 text-emerald-700" : campaign.status === "attention" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>{STATUS_LABEL[campaign.status]}</span>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground"><span>{campaign.counts.sent} sent · {pending} pending{attention ? ` · ${attention} attention` : ""}</span><span>{progress}%</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-legacy-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} /></div>
                  </div>
                </summary>
                <div className="border-t border-border bg-page px-5 py-3">
                  <div className="grid gap-2">
                    {campaign.items.map((item) => {
                      const providerMessageId = item.receipt && typeof item.receipt.provider_message_id === "string" ? item.receipt.provider_message_id : null;
                      return (
                        <div key={item.draft_id} className="grid gap-1 rounded-legacy-lg border border-border bg-card px-3 py-2 text-xs md:grid-cols-[minmax(0,1fr)_120px_90px_minmax(0,1.5fr)] md:items-center">
                          <span className="truncate font-mono text-[11px] text-muted-foreground" title={item.draft_id}>{item.draft_id}</span>
                          <span className={cn("font-semibold", item.state === "sent" ? "text-emerald-700" : item.state === "failed" || item.state === "reconcile" ? "text-amber-700" : "text-foreground")}>{ITEM_LABEL[item.state]}</span>
                          <span className="text-muted-foreground">{item.attempt_count} attempt{item.attempt_count === 1 ? "" : "s"}</span>
                          <span className="truncate text-muted-foreground" title={item.detail ?? providerMessageId ?? undefined}>{item.detail ?? (providerMessageId ? `Receipt ${providerMessageId}` : item.outcome ?? "Awaiting execution")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-page px-5 py-2 text-[11.5px] text-muted-foreground">
        <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-emerald-600" /> confirmed sends</span>
        <span className="flex items-center gap-1"><Clock3 className="size-3.5" /> resumable retries</span>
        <span className="flex items-center gap-1"><AlertTriangle className="size-3.5 text-amber-600" /> reconciliation surfaced</span>
      </div>
    </section>
  );
}
