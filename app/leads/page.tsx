"use client";

import { useMemo, useState } from "react";
import { ActionBar } from "@/components/leads/ActionBar";
import { FiltersPanel, applyFilters, useFiltersPanelState, type FilterValues } from "@/components/leads/FiltersPanel";
import { LeadTable } from "@/components/leads/LeadTable";
import { ResultBar } from "@/components/leads/ResultBar";
import { TopBar } from "@/components/leads/TopBar";
import { defaultBrief } from "@/lib/data/brief";
import { leads as seed } from "@/lib/data/leads";
import type { Lead } from "@/lib/types";

const WON_DEALS = 5;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(seed);
  const [filters, setFilters] = useState<FilterValues>({});
  const [filtersHidden, setFiltersHidden] = useFiltersPanelState();
  const [brief, setBrief] = useState(defaultBrief);
  const [searching, setSearching] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const visible = useMemo(() => applyFilters(leads, filters), [leads, filters]);
  const pending = visible.filter((l) => l.draft && l.draft.status === "draft").length;

  const approveAll = () =>
    setLeads((cur) => cur.map((l) => (l.draft && l.draft.status === "draft" ? { ...l, status: "approved", draft: { ...l.draft, status: "approved" } } : l)));

  // Search is mocked until the leads API lands: same rows, fresh timestamp.
  const runSearch = () => {
    setSearching(true);
    window.setTimeout(() => { setSearching(false); setUpdatedAt(new Date()); }, 1500);
  };

  return (
    <>
      <TopBar searching={searching} onRunSearch={runSearch} brief={brief} onBriefChange={setBrief} />
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <div className="flex min-h-0 flex-1">
          {!filtersHidden && <FiltersPanel values={filters} onChange={setFilters} brief={brief} onHide={() => setFiltersHidden(true)} />}
          <div className="flex min-w-0 flex-1 flex-col">
            <ResultBar count={visible.length} total={leads.length} dealCount={WON_DEALS} updatedAt={updatedAt} filtersHidden={filtersHidden} onShowFilters={() => setFiltersHidden(false)} />
            <div className="h-5 shrink-0" />
            <LeadTable leads={visible} onChange={(next) => setLeads((cur) => cur.map((l) => next.find((n) => n.id === l.id) ?? l))} />
          </div>
        </div>
        <ActionBar pending={pending} onApproveAll={approveAll} leads={visible} />
      </div>
    </>
  );
}
