"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { CallsList } from "@/components/CallsList";

export default function CallsPage() {
  const [q, setQ] = useState("");
  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Calls</h1>
          <p className="mt-1 text-[13.5px] text-soft">Every call and what Slipstream did with it.</p>
        </div>
        <label className="flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-soft transition-shadow duration-150 focus-within:ring-2 focus-within:ring-accent/40">
          <Search className="size-4" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-40 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-faint" />
        </label>
      </div>
      <div className="mt-8">
        <CallsList query={q} />
      </div>
    </div>
  );
}
