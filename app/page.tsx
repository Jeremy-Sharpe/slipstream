"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { AddCallDialog } from "@/components/AddCallDialog";
import { Avatar, CompanyTile } from "@/components/Avatar";
import { Button, OutcomePill, fmtDate, fmtTime } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function CallsPage() {
  const { calls, runs } = useStore();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? calls.filter((c) => `${c.contact} ${c.company} ${c.title}`.toLowerCase().includes(s)) : calls;
  }, [calls, q]);

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Calls</h1>
          <p className="mt-1 text-[13.5px] text-soft">Every call, written into HubSpot and turned into the next lead.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-soft transition-shadow duration-150 focus-within:ring-2 focus-within:ring-accent/40">
            <Search className="size-4" strokeWidth={1.75} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-40 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-faint" />
          </label>
          <Button variant="primary" onClick={() => setAdding(true)}>Add a call</Button>
        </div>
      </div>

      <ul className="mt-8 divide-y divide-line-soft border-y border-line-soft">
        {rows.length === 0 && <li className="py-16 text-center text-[14px] text-faint">Nothing matches.</li>}
        {rows.map((c) => {
          const run = runs[c.id];
          return (
            <li key={c.id}>
              <Link
                href={`/calls/${c.id}`}
                className="flex h-14 items-center gap-4 rounded-lg px-2 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <Avatar name={c.contact} size={28} />
                <span className="w-[150px] truncate text-[13.5px] font-medium text-ink">{c.contact}</span>
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <CompanyTile name={c.company} size={22} />
                  <span className="truncate text-[13.5px] text-ink">{c.company}</span>
                  <span className="truncate text-[13px] text-faint">· {c.title}</span>
                </span>
                <OutcomePill outcome={c.outcome} />
                <span className="w-[110px] truncate text-[13px] text-soft">{c.rep.split(" ")[0]}</span>
                <span className="w-[112px] font-mono text-[12px] tabular-nums text-soft">{fmtDate(c.at)} · {fmtTime(c.at)}</span>
                <span className="flex w-[110px] items-center justify-end gap-1.5 text-[12.5px]">
                  {run === "running" && <><span className="pulse-dot size-2 rounded-full bg-accent" /><span className="text-soft">Running</span></>}
                  {run === "review" && <><span className="size-2 rounded-full bg-accent" /><span className="text-ink">Needs review</span></>}
                  {run === "done" && <><Check className="size-3.5 text-faint" strokeWidth={2} /><span className="text-faint">Done</span></>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <AddCallDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
