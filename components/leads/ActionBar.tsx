"use client";

import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Lead } from "@/lib/types";

const COLUMNS: [string, (l: Lead) => string | number][] = [
  ["Company", (l) => l.company],
  ["Person", (l) => l.person],
  ["Title", (l) => l.title],
  ["Location", (l) => l.location],
  ["Relevance", (l) => l.relevance_score ?? ""],
  ["Similarity", (l) => l.similarity ?? ""],
  ["Status", (l) => l.status],
];

function rows(leads: Lead[]) {
  return [COLUMNS.map(([h]) => h), ...leads.map((l) => COLUMNS.map(([, get]) => String(get(l))))];
}

function downloadCsv(leads: Lead[]) {
  const csv = rows(leads).map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `slipstream-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const BTN = "flex items-center bg-primary text-base font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50";

export function ActionBar({ pending, onApproveAll, leads }: { pending: number; onApproveAll: () => void; leads: Lead[] }) {
  return (
    <div className="flex h-[65px] shrink-0 items-center justify-end border-t border-line bg-card pr-[22px]">
      <div className="flex h-10 items-stretch">
        <button type="button" onClick={onApproveAll} disabled={pending === 0} className={`${BTN} rounded-l-md pr-3.5 pl-4`}>
          Approve all drafts
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<button type="button" aria-label="More actions" className={`${BTN} rounded-r-md pr-3 pl-1.5`} />}>
            <ChevronDown className="size-4" strokeWidth={2.25} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled={pending === 0} onClick={onApproveAll}>Approve all drafts</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => downloadCsv(leads)}>Export CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(rows(leads).map((r) => r.join("\t")).join("\n"))}>Copy as table</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
