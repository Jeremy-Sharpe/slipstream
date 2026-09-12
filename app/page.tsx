"use client";

import { Bell, Plus, Search } from "lucide-react";
import { useState } from "react";
import { ConversationsTable } from "@/components/conversations/ConversationsTable";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conversations } from "@/lib/data/conversations";

export default function ConversationsPage() {
  const [query, setQuery] = useState("");
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-8 py-7">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Conversations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your calls, emails and meetings, automatically analysed and turned into pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, companies or keywords" className="h-8 w-72 pl-8 text-[13px]" />
          </div>
          <Button size="sm" className="h-8"><Plus className="size-3.5" /> Add a call</Button>
          <Button size="icon" variant="ghost" className="size-8" aria-label="Notifications"><Bell className="size-4" strokeWidth={1.75} /></Button>
          <Avatar className="size-8"><AvatarFallback className="text-[11px]">MD</AvatarFallback></Avatar>
        </div>
      </header>

      <ConversationsTable rows={conversations} query={query} />
    </div>
  );
}
