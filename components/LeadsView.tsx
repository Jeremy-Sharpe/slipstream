"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { actions, useLeads } from "@/lib/store/leads";
import type { Lead } from "@/lib/types";
import { useLeadSearch } from "@/lib/useLeadSearch";
import { SearchPane } from "./leads/SearchPane";
import { LeadPanel } from "./leads/LeadPanel";
import { SORT_KEYS, type Row, type Sort } from "./leads/columns";
import { Button, cn } from "./ui";

const LeadsGrid = dynamic(() => import("./leads/LeadsGridInner"), { ssr: false, loading: () => <div className="h-full w-full" /> });

/* Leads: searches on the left (the same run primitive as a call), the sheet on the right. */
export function LeadsView() {
  const { leads, searches, profile, wonDeals, selectedId, status, error, busy } = useLeads();
  const params = useSearchParams();
  const { start } = useLeadSearch({ instant: params.get("instant") === "1" });
  const [sort, setSort] = useState<Sort>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { void actions.load().then(() => actions.warmDrafts()); }, []);

  const search = searches.find((s) => s.id === selectedId) ?? null;
  const busySearch = searches.some((s) => s.status === "running");

  const rows = useMemo<Row[]>(() => {
    const mine = selectedId ? leads.filter((l) => l.searchId === selectedId) : leads;
    const running = search?.status === "running";
    const scoredCount = search?.scored ?? 0;
    const out = [...mine]
      .sort((a, b) => b.similarity - a.similarity)
      .map((l, i) => ({ ...l, scored: !running || i < scoredCount, drafted: l.status !== "new" }));
    if (sort) {
      const key = SORT_KEYS[sort.col];
      out.sort((a, b) => {
        const pick = (r: Row) => (key === "draft" ? Number(r.drafted) : key === "n" ? 0 : r[key]);
        const av = pick(a), bv = pick(b);
        const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sort.dir === "asc" ? c : -c;
      });
    }
    return out;
  }, [leads, search, selectedId, sort]);

  const pending = rows.filter((r) => r.drafted && r.status !== "approved");
  const approving = pending.some((r) => busy[r.id]);
  const open = openId ? leads.find((l) => l.id === openId) ?? null : null;

  const onFind = useCallback((brief: string, count: number) => { setSort(null); setOpenId(null); void start(brief, count); }, [start]);
  const onSelect = useCallback((id: string) => { actions.select(selectedId === id ? null : id); setSort(null); }, [selectedId]);
  const onOpen = useCallback((l: Lead) => { setOpenId(l.id); void actions.draftFor(l.id); }, []);
  const onClose = useCallback(() => setOpenId(null), []);

  const empty = status === "error"
    ? error ?? "The Slipstream API is not reachable"
    : status !== "ready"
      ? "Loading the profile"
      : !profile
        ? "No ICP derived yet. Run a call through Slipstream to build one."
        : search?.status === "running"
          ? "Searching"
          : "No leads found yet. Find leads to start a search.";

  return (
    <div className="flex h-[calc(100vh-72px)] flex-col">
      <div className="shrink-0">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Leads</h1>
        <p className="mt-2 text-[14px] text-soft">Companies like the ones you closed, found from your won calls.</p>
      </div>

      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[380px_1px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col pr-8">
          <header className="flex h-12 shrink-0 items-center border-b border-line text-[13.5px] font-medium text-ink">Brief</header>
          <div className="min-h-0 flex-1 pt-3">
            <SearchPane
              searches={searches}
              leads={leads}
              profile={profile}
              wonDeals={wonDeals}
              selectedId={selectedId}
              onSelect={onSelect}
              onFind={onFind}
              busy={busySearch || status !== "ready" || !profile}
            />
          </div>
        </div>

        <div aria-hidden className="bg-line" />

        <section className="flex min-h-0 min-w-0 flex-col pl-8">
          <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line">
            <p className="text-[13.5px] font-medium text-ink">Preview · {rows.length} {rows.length === 1 ? "lead" : "leads"}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Search the sheet"
                onClick={() => setShowSearch((s) => !s)}
                className={cn("flex h-9 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] text-soft shadow-[inset_0_0_0_1px_#e8e8e8] transition-colors duration-150 hover:text-ink", showSearch && "bg-surface text-ink")}
              >
                <Search className="size-4" strokeWidth={1.75} /> Search
              </button>
              <Button
                variant="primary"
                className="h-9 gap-2 px-4 text-[13.5px]"
                disabled={pending.length === 0 || approving}
                onClick={() => void actions.approveAll(pending.map((r) => r.id))}
              >
                {approving ? "Approving" : pending.length > 0 || search?.status === "running" || rows.length === 0 ? "Approve all drafts" : "All drafts approved"}
                {pending.length > 0 && !approving && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-[12px] tabular-nums">{pending.length}</span>}
              </Button>
            </div>
          </header>
          <div className="relative min-h-0 flex-1 pt-3">
            {rows.length === 0 ? (
              <p className="flex h-full items-center justify-center px-8 text-center text-[14px] text-faint">{empty}</p>
            ) : (
              <LeadsGrid rows={rows} sort={sort} onSort={setSort} onOpen={onOpen} showSearch={showSearch} onSearchClose={() => setShowSearch(false)} selectedId={openId} />
            )}
          </div>
        </section>
      </div>

      <LeadPanel lead={open} drafting={!!(open && busy[open.id])} onClose={onClose} />
    </div>
  );
}
