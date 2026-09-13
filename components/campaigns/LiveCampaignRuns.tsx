"use client";

import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw, Server } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCampaigns, type ApiCampaign } from "@/lib/api/slipstream";
import { cn } from "@/lib/utils";

type LoadState =
  | { status: "loading" }
  | { status: "live"; campaigns: ApiCampaign[] }
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

export function LiveCampaignRuns({ initialCampaigns }: { initialCampaigns?: ApiCampaign[] | null }) {
  const [state, setState] = useState<LoadState>(() => initialCampaigns === undefined
    ? { status: "loading" }
    : initialCampaigns === null
      ? { status: "error", message: "Campaign API unavailable during initial render" }
      : { status: "live", campaigns: initialCampaigns });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const controllerRef = useRef<AbortController>(null);
  const requestRef = useRef(0);
  const load = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestRef.current;
    setState({ status: "loading" });
    getCampaigns(controller.signal)
      .then((campaigns) => {
        if (!controller.signal.aborted && requestRef.current === requestId) setState({ status: "live", campaigns });
      })
      .catch((error) => {
        if (controller.signal.aborted || requestRef.current !== requestId) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Campaign API unavailable" });
      });
  }, []);

  useEffect(() => {
    if (initialCampaigns === undefined) load();
    return () => {
      requestRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [initialCampaigns, load]);

  const campaigns = state.status === "live" ? state.campaigns : [];
  return (
    <section id="delivery-execution" className="mx-4 mt-7 scroll-mt-6 overflow-hidden rounded-xl border border-border bg-card sm:mx-11" aria-label="Live delivery execution">
      <p className="sr-only" role="status" aria-live="polite">
        {state.status === "loading" ? "Refreshing campaign execution status" : state.status === "error" ? `Campaign execution refresh failed: ${state.message}` : `${state.campaigns.length} live campaign records loaded`}
      </p>
      <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-icon-well"><Server className="size-4.5" strokeWidth={1.8} /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-foreground">Delivery execution</h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Live API</span>
            </div>
            <p className="truncate text-[12.5px] text-muted-foreground">Execution state from the server · expandable item outcomes</p>
          </div>
        </div>
        <button type="button" onClick={load} disabled={state.status === "loading"} className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50">
          {state.status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh
        </button>
      </div>

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
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} /></div>
                  </div>
                </summary>
                <div className="border-t border-border bg-page px-5 py-3">
                  <div className="grid gap-2">
                    {campaign.items.map((item) => {
                      const providerMessageId = item.receipt && typeof item.receipt.provider_message_id === "string" ? item.receipt.provider_message_id : null;
                      return (
                        <div key={item.draft_id} className="grid gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs md:grid-cols-[minmax(0,1fr)_120px_90px_minmax(0,1.5fr)] md:items-center">
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
