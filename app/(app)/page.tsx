"use client";

import { MessageSquare, Search } from "lucide-react";
import { useState } from "react";
import { ConversationsTable } from "@/components/conversations/ConversationsTable";
import { Input } from "@/components/ui/input";
import { conversations } from "@/lib/data/conversations";

export default function ConversationsPage() {
  const [query, setQuery] = useState("");
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      <header className="shrink-0 px-8 pt-7">
        <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your calls, emails and meetings, automatically analysed and turned into pipeline.</p>
      </header>

      <div className="mt-8 flex shrink-0 items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <span className="flex size-9 items-center justify-center rounded-md bg-icon-well text-foreground"><MessageSquare className="size-[18px]" strokeWidth={1.75} /></span>
          <h2 className="text-xl font-bold tracking-tight">All conversations</h2>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-9 w-[240px] rounded-md pl-8 text-sm" />
        </div>
      </div>

      <ConversationsTable rows={conversations} query={query} />
    </div>
  );
}
