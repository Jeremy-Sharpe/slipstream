"use client";

import { MessageSquare, Search } from "lucide-react";
import { useState } from "react";
import { ConversationsTable } from "@/components/conversations/ConversationsTable";
import { useConversations } from "@/lib/store/conversations";

// Same title row as Home's Recent section: 46px icon square, 26px title,
// 273×40 search. The primary action lives in the top bar.
export default function ConversationsPage() {
  const [query, setQuery] = useState("");
  const conversations = useConversations();
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="flex shrink-0 items-center justify-between px-11 pt-[34px]">
        <div className="flex items-center gap-4">
          <span className="flex size-[46px] items-center justify-center rounded-lg bg-icon-well text-foreground"><MessageSquare className="size-[22px]" strokeWidth={1.5} /></span>
          <h1 className="text-[26px] leading-none font-bold tracking-[-0.02em] text-foreground">Conversations</h1>
        </div>
        <label className="flex h-10 w-[273px] items-center gap-2.5 rounded-md border border-border bg-card px-3 text-muted-foreground transition-[box-shadow,border-color] duration-150 focus-within:border-foreground/30 focus-within:shadow-[0_0_0_2px_var(--primary)]">
          <Search className="size-4" strokeWidth={1.75} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search conversations" className="w-full bg-transparent text-[16px] text-foreground outline-none" />
        </label>
      </div>

      <ConversationsTable rows={conversations} query={query} />
    </div>
  );
}
