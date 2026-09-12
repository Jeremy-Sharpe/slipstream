"use client";

import { useMemo, useState } from "react";
import type { Conversation, ConversationKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConversationsGrid } from "./ConversationsGrid";

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
    <div className="mt-5 flex min-h-0 flex-1 flex-col">
      <div className="px-8 pb-4">
        <div className="inline-flex h-9 items-center rounded-md border border-border bg-muted/70 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex h-full items-center gap-2 rounded-[5px] px-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                tab === t.key && "border border-border bg-card font-medium text-foreground shadow-xs",
              )}
            >
              {t.label}
              <span className="text-xs tabular-nums text-muted-foreground">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-border bg-card">
        <div className="min-h-0 flex-1">
          {visible.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              {rows.length === 0 ? "No conversations yet. Add a call to get started." : "Nothing matches."}
            </div>
          ) : (
            <ConversationsGrid rows={visible} onSelectionCount={setSelected} />
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-8 py-2.5 text-[13px] text-muted-foreground">
          <span>Showing {visible.length} of {rows.length}</span>
          {selected > 0 && <span>{selected} selected</span>}
        </div>
      </div>
    </div>
  );
}
