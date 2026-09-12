"use client";

import { MessageSquare, Search } from "lucide-react";
import { useState } from "react";
import { ConversationsTable } from "@/components/conversations/ConversationsTable";
import { Input } from "@/components/ui/input";
import { conversations } from "@/lib/data/conversations";

export default function ConversationsPage() {
  const [query, setQuery] = useState("");
  return (
    <div className="flex flex-col">
      <header className="px-10 pt-8">
        <h1 className="text-[28px] font-bold tracking-tight">Conversations</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">Your calls, emails and meetings, automatically analysed and turned into pipeline.</p>
      </header>

      <div className="mt-10 flex items-center justify-between px-10">
        <div className="flex items-center gap-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted"><MessageSquare className="size-5" strokeWidth={1.75} /></span>
          <h2 className="text-2xl font-bold tracking-tight">All conversations</h2>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-10 w-[260px] rounded-lg pl-9 text-[15px]" />
        </div>
      </div>

      <ConversationsTable rows={conversations} query={query} />
    </div>
  );
}
