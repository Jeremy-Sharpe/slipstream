"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { ConversationsList, type ConversationFilter } from "@/components/ConversationsList";
import { Segmented } from "@/components/home/Segmented";

const FILTERS: { key: ConversationFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "call", label: "Calls" },
  { key: "email", label: "Emails" },
];

export default function ConversationsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Conversations</h1>
          <p className="mt-1 text-[13.5px] text-soft">Every call and email, and what Slipstream did with it.</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented value={filter} options={FILTERS} onChange={setFilter} />
          <label className="flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-soft transition-shadow duration-150 focus-within:ring-2 focus-within:ring-accent/40">
            <Search className="size-4" strokeWidth={1.75} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-40 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-faint" />
          </label>
        </div>
      </div>
      <div className="mt-8">
        <ConversationsList query={q} filter={filter} />
      </div>
    </div>
  );
}
