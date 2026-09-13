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

  useEffect(() => { void actions.load(); }, []);

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
        const pick = (r: Row) => (key === "draft" ? Number(r.drafted) : key === "linkedin" ? r.contact : r[key]);
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
  const onOpen = useCallback((l: Lead) => { setOpenId(l.id); if (l.status !== "approved") void actions.draftFor(l.id); }, []);
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
    <div className="grid h-[calc(100vh-32px)] grid-cols-[380px_minmax(0,1fr)] gap-8">
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

      <section className="flex min-h-0 min-w-0 flex-col">
        <div className="flex h-10 shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Search the sheet"
            onClick={() => setShowSearch((s) => !s)}
            className={cn("flex h-8 items-center gap-2 rounded-full px-3 text-[13px] text-soft transition-colors duration-150 hover:bg-surface hover:text-ink", showSearch && "bg-surface text-ink")}
          >
            <Search className="size-3.5" strokeWidth={1.75} /> Search
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={pending.length === 0 || approving}
              onClick={() => void actions.approveAll(pending.map((r) => r.id))}
            >
              {approving ? "Approving" : pending.length > 0 ? `Approve all drafts · ${pending.length}` : rows.length > 0 ? "All drafts approved" : "Approve all drafts"}
            </Button>
          </div>
        </div>
        <div className="relative mt-2 min-h-0 flex-1">
          {rows.length === 0 ? (
            <p className="flex h-full items-center justify-center px-8 text-center text-[14px] text-faint">{empty}</p>
          ) : (
            <LeadsGrid rows={rows} sort={sort} onSort={setSort} onOpen={onOpen} showSearch={showSearch} onSearchClose={() => setShowSearch(false)} />
          )}
        </div>
      </section>

      <LeadPanel lead={open} drafting={!!(open && busy[open.id])} onClose={onClose} />
    </div>
  );
}
