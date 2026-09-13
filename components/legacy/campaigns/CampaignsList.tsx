"use client";

import { MoreHorizontal, Search, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/legacy/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/legacy/ui/tooltip";
import type { ApiCampaign, ApiIcpFreshness } from "@/lib/api/slipstream";
import type { Campaign, CampaignStatus } from "@/lib/legacy/types/campaigns";
import { cn } from "@/lib/legacy/utils";
import { NewCampaignDialog } from "./NewCampaignDialog";
import { StatusBadge } from "./StatusBadge";
import { campaignActions, useCampaigns } from "./store";
import { LiveCampaignRuns } from "./LiveCampaignRuns";

type Tab = "all" | CampaignStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "draft", label: "Draft" },
];

const COLS = "grid-cols-[minmax(0,1fr)_120px_90px_110px_80px_90px_minmax(110px,0.2fr)_150px_64px]";

function ago(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const h = Math.round(minutes / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export const approvedCount = (c: Campaign) => c.people.filter((p) => p.status === "approved").length;

export function CampaignsList({ loading = false, initialLiveCampaigns, initialFreshness, initialFreshnessError }: { loading?: boolean; initialLiveCampaigns?: ApiCampaign[] | null; initialFreshness?: ApiIcpFreshness | null; initialFreshnessError?: string }) {
  const router = useRouter();
  const campaigns = useCampaigns();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [deleted, setDeleted] = useState<{ campaign: Campaign; index: number } | null>(null);

  useEffect(() => {
    if (!deleted) return;
    const t = window.setTimeout(() => setDeleted(null), 5000);
    return () => window.clearTimeout(t);
  }, [deleted]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter((c) => (tab === "all" || c.status === tab) && (!q || `${c.name} ${c.owner} ${c.source}`.toLowerCase().includes(q)));
  }, [campaigns, tab, query]);

  const remove = (id: string) => { const r = campaignActions.remove(id); if (r) setDeleted(r); };
  const undo = () => { if (deleted) { campaignActions.restore(deleted.campaign, deleted.index); setDeleted(null); } };
  const onRowKey = (e: KeyboardEvent, id: string) => { if (e.key === "Enter") router.push(`/legacy/campaigns/${id}`); };

  const emptyLabel = campaigns.length === 0 ? "No campaigns yet. Create one from a lead list." : query ? "Nothing matches." : `No ${tab} campaigns.`;

  return (
    <section className="flex flex-col pt-6 sm:pt-[34px]">
      <div className="flex flex-col items-stretch justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-11">
        <div className="flex items-center gap-4">
          <span className="flex size-[46px] items-center justify-center rounded-legacy-lg bg-icon-well text-foreground"><Send className="size-[22px]" strokeWidth={1.75} /></span>
          <h1 className="text-[26px] leading-none font-bold tracking-[-0.02em] text-foreground">Campaigns</h1>
        </div>
        <div className="flex min-w-0 items-center gap-2.5">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-legacy-md border border-border bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-primary sm:w-[273px] sm:flex-none">
            <Search className="size-4" strokeWidth={1.75} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search campaigns" className="w-full bg-transparent text-[16px] text-foreground outline-none" />
          </label>
          <NewCampaignDialog />
        </div>
      </div>

      <LiveCampaignRuns initialCampaigns={initialLiveCampaigns} initialFreshness={initialFreshness} initialFreshnessError={initialFreshnessError} />

      <div className="mt-8 flex flex-col items-stretch justify-between gap-3 px-4 pb-[14px] sm:flex-row sm:items-end sm:px-11">
        <div><h2 className="text-[15px] font-semibold text-foreground">Sequence workspace</h2><p className="mt-0.5 text-xs text-muted-foreground">Evaluation data for designing and approving outreach sequences</p></div>
        <div className="inline-flex h-10 max-w-full items-center overflow-x-auto rounded-legacy-lg border border-border bg-card p-0.5">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn("flex h-full shrink-0 items-center gap-2 rounded-legacy-md px-3 text-[14px] text-muted-foreground transition-colors hover:text-foreground sm:px-[18px] sm:text-[16px]", tab === t.key && "border border-border bg-card text-foreground shadow-[0_1px_2px_rgba(17,24,39,0.08)]")}>
              {t.label}
              <span className="text-[13px] tabular-nums text-muted-foreground">{t.key === "all" ? campaigns.length : campaigns.filter((c) => c.status === t.key).length}</span>
            </button>
          ))}
        </div>
      </div>

      {deleted && (
        <div className="mx-11 mb-3 flex h-10 items-center justify-between rounded-legacy-lg border border-border bg-page px-3 text-[15px] text-foreground">
          <span>Deleted “{deleted.campaign.name}”.</span>
          <button type="button" onClick={undo} className="font-medium text-primary hover:underline">Undo</button>
        </div>
      )}

      <TooltipProvider>
        <div className="overflow-x-auto border-t border-border">
          <div className={cn("grid h-12 min-w-[980px] items-center border-b border-border px-6 text-[14.5px] font-semibold text-foreground sm:px-11", COLS)}>
            <span>Name</span><span>Status</span><span>People</span><span>Approved</span><span>Sent</span><span>Replies</span><span>Owner</span><span>Updated</span><span />
          </div>

          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cn("grid h-[61px] min-w-[980px] items-center border-b border-border px-6 sm:px-11", COLS)} aria-busy="true">
              <span className="h-3.5 w-56 rounded bg-legacy-muted" /><span className="h-6 w-16 rounded-full bg-legacy-muted" /><span className="h-3.5 w-6 rounded bg-legacy-muted" /><span className="h-3.5 w-6 rounded bg-legacy-muted" /><span className="h-3.5 w-6 rounded bg-legacy-muted" /><span className="h-3.5 w-6 rounded bg-legacy-muted" /><span className="h-3.5 w-14 rounded bg-legacy-muted" /><span className="h-3.5 w-20 rounded bg-legacy-muted" /><span />
            </div>
          ))}

          {!loading && visible.length === 0 && <div className="flex h-40 items-center justify-center text-[15px] text-muted-foreground">{emptyLabel}</div>}

          {!loading && visible.map((c) => (
            <div
              key={c.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/legacy/campaigns/${c.id}`)}
              onKeyDown={(e) => onRowKey(e, c.id)}
              className={cn("grid h-[61px] min-w-[980px] cursor-pointer items-center border-b border-border px-6 text-[16px] text-foreground transition-colors hover:bg-page focus-visible:bg-page focus-visible:outline-none sm:px-11", COLS)}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Send className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="truncate">{c.name}</span>
              </span>
              <span><StatusBadge status={c.status} /></span>
              <span className="tabular-nums">{c.people.length}</span>
              <span className="tabular-nums">{approvedCount(c)}</span>
              <Tooltip>
                <TooltipTrigger render={<span className="w-fit cursor-default tabular-nums text-muted-foreground" />}>0</TooltipTrigger>
                <TooltipContent>Evaluation sequence · no live delivery record</TooltipContent>
              </Tooltip>
              <span className="text-muted-foreground">—</span>
              <span className="flex items-center gap-2"><span className="size-4 rounded-full bg-foreground" />{c.owner}</span>
              <span className="text-foreground">{ago(c.updatedMinutesAgo)}</span>
              <span className="flex justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<button type="button" aria-label={`Actions for ${c.name}`} className="flex size-8 items-center justify-center rounded-legacy-md border border-border text-muted-foreground hover:bg-legacy-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
                    <MoreHorizontal className="size-4" strokeWidth={1.75} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => router.push(`/legacy/campaigns/${c.id}`)}>Open</DropdownMenuItem>
                    {c.status !== "draft" && <DropdownMenuItem onClick={() => campaignActions.toggleStatus(c.id)}>{c.status === "active" ? "Pause" : "Resume"}</DropdownMenuItem>}
                    {c.status === "draft" && <DropdownMenuItem onClick={() => campaignActions.toggleStatus(c.id)}>Activate</DropdownMenuItem>}
                    <DropdownMenuItem onClick={() => campaignActions.duplicate(c.id)}>Duplicate</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => remove(c.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </div>
          ))}
        </div>
      </TooltipProvider>
    </section>
  );
}
