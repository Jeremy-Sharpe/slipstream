"use client";

import { useState } from "react";
import { ActionBar } from "@/components/leads/ActionBar";
import { FiltersPanel } from "@/components/leads/FiltersPanel";
import { LeadTable } from "@/components/leads/LeadTable";
import { ResultBar } from "@/components/leads/ResultBar";
import { leads as seed } from "@/lib/data/leads";
import type { Lead } from "@/lib/types";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(seed);
  const pending = leads.filter((l) => l.draft && l.draft.status === "draft").length;

  const approveAll = () =>
    setLeads((cur) => cur.map((l) => (l.draft && l.draft.status === "draft" ? { ...l, status: "approved", draft: { ...l.draft, status: "approved" } } : l)));

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex min-h-0 flex-1">
        <FiltersPanel />
        <div className="flex min-w-0 flex-1 flex-col">
          <ResultBar count={leads.length} total={leads.length} />
          <div className="h-5 shrink-0" />
          <LeadTable leads={leads} onChange={setLeads} />
        </div>
      </div>
      <ActionBar pending={pending} onApproveAll={approveAll} />
    </div>
  );
}
