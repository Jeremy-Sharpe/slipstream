"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { actions, useStore } from "@/lib/store";
import type { Lead } from "@/lib/types";
import { useLeadSearch } from "@/lib/useLeadSearch";
import { SearchPane } from "./leads/SearchPane";
import { LeadPanel } from "./leads/LeadPanel";
import { SORT_KEYS, type Row, type Sort } from "./leads/columns";
import { Button, cn } from "./ui";

const LeadsGrid = dynamic(() => import("./leads/LeadsGridInner"), { ssr: false, loading: () => <div className="h-full w-full" /> });

/* Leads: searches on the left (the same run primitive as a call), the sheet on the right. */
export function LeadsView() {
  const { leads, searches } = useStore();
  const params = useSearchParams();
  const { start } = useLeadSearch({ instant: params.get("instant") === "1" });
  const [selectedId, setSelectedId] = useState<string>(searches[0]?.id ?? "s1");
  const [sort, setSort] = useState<Sort>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const search = searches.find((s) => s.id === selectedId) ?? searches[0];
  const busy = searches.some((s) => s.status === "running");

  const rows = useMemo<Row[]>(() => {
    if (!search) return [];
    const mine = leads.filter((l) => l.searchId === search.id);
    const running = search.status === "running";
    const out = mine.map((l, i) => ({ ...l, scored: !running || i < search.scored, drafted: !running || i < search.drafted }));
    // Rows that landed from a search sit newest first; the seed search keeps its order.
    if (out.some((l) => l.landedAt)) out.reverse();
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
  }, [leads, search, sort]);

  const drafts = rows.filter((r) => r.drafted && r.status !== "approved").length;
  const open = openId ? leads.find((l) => l.id === openId) ?? null : null;

  const onFind = useCallback((brief: string, count: number) => { const id = start(brief, count); setSelectedId(id); setSort(null); setOpenId(null); }, [start]);
  const onOpen = useCallback((l: Lead) => setOpenId(l.id), []);
  const onClose = useCallback(() => setOpenId(null), []);

  return (
    <div className="grid h-[calc(100vh-32px)] grid-cols-[380px_minmax(0,1fr)] gap-8">
      <SearchPane searches={searches} leads={leads} selectedId={search?.id ?? null} onSelect={setSelectedId} onFind={onFind} busy={busy} />

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
            <Button variant="primary" size="sm" disabled={drafts === 0 || !search} onClick={() => search && actions.approveAllLeads(search.id)}>
              {drafts > 0 ? `Approve all drafts · ${drafts}` : search?.status === "running" ? "Approve all drafts" : "All drafts approved"}
            </Button>
          </div>
        </div>
        <div className="relative mt-2 min-h-0 flex-1">
          {rows.length === 0 ? (
            <p className="flex h-full items-center justify-center text-[14px] text-faint">{search?.status === "running" ? "Searching Victoria" : "No companies matched this brief"}</p>
          ) : (
            <LeadsGrid rows={rows} sort={sort} onSort={setSort} onOpen={onOpen} showSearch={showSearch} onSearchClose={() => setShowSearch(false)} />
          )}
        </div>
      </section>

      <LeadPanel lead={open} onClose={onClose} />
    </div>
  );
}
