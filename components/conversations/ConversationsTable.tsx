"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Conversation, ConversationKind } from "@/lib/types";
import { cn } from "@/lib/utils";

// Glide draws on canvas and touches window at import time, so it is client-only.
// The placeholder has the grid's exact header and row heights so nothing jumps.
function GridPlaceholder() {
  return (
    <div aria-busy="true" className="flex flex-col">
      <div className="h-12 border-b border-border" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex h-[61px] items-center gap-4 border-b border-border px-11" style={{ opacity: 1 - i * 0.1 }}>
          <span className="size-4 rounded-sm bg-muted" />
          <span className="size-8 rounded-full bg-muted" />
          <span className="h-3.5 w-36 rounded bg-muted" />
          <span className="h-3.5 w-48 rounded bg-muted" />
          <span className="h-3.5 w-32 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
const ConversationsGrid = dynamic(() => import("./ConversationsGrid").then((m) => m.ConversationsGrid), { ssr: false, loading: GridPlaceholder });

type Tab = "all" | ConversationKind;

export function ConversationsTable({ rows, query }: { rows: Conversation[]; query: string }) {
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState(0);

  const counts = useMemo(
    () => ({ all: rows.length, call: rows.filter((r) => r.kind === "call").length, email: rows.filter((r) => r.kind === "email").length }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (tab === "all" || r.kind === tab) && (!q || `${r.contact} ${r.company} ${r.title} ${r.preview}`.toLowerCase().includes(q)));
  }, [rows, tab, query]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "call", label: "Calls" },
    { key: "email", label: "Emails" },
  ];

  return (
    <div className="mt-[42px] flex min-h-0 flex-1 flex-col">
      <div className="px-11 pb-[14px]">
        <div role="tablist" className="inline-flex h-10 items-center rounded-lg border border-border bg-card p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              role="tab"
              aria-selected={tab === t.key}
              className={cn(
                "flex h-full items-center gap-2 rounded-md border border-transparent px-[18px] text-[16px] text-foreground/70 transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                tab === t.key && "border-border bg-card text-foreground shadow-[0_1px_2px_rgba(17,24,39,0.06)]",
              )}
            >
              {t.label}
              <span className="text-[13px] tabular-nums text-muted-foreground">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-border bg-card">
        <div className="min-h-0 flex-1">
          {visible.length === 0 ? (
            <div className="flex justify-center pt-[120px] text-[16px] text-muted-foreground">
              {rows.length === 0 ? "No conversations yet." : "Nothing matches."}
            </div>
          ) : (
            <ConversationsGrid rows={visible} onSelectionCount={setSelected} />
          )}
        </div>
        <div className="flex h-12 items-center justify-between border-t border-border px-11 text-[14px] text-muted-foreground">
          <span>Showing {visible.length} of {rows.length}</span>
          {selected > 0 && <span>{selected} selected</span>}
        </div>
      </div>
    </div>
  );
}
