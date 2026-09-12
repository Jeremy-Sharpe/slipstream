"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { Avatar, CompanyTile } from "./Avatar";
import { OutcomePill, fmtDate, fmtTime } from "./ui";

export function CallsList({ query = "" }: { query?: string }) {
  const { calls, runs } = useStore();
  const q = query.trim().toLowerCase();
  const rows = q ? calls.filter((c) => `${c.contact} ${c.company} ${c.title}`.toLowerCase().includes(q)) : calls;
  return (
    <ul className="divide-y divide-line-soft border-y border-line-soft">
      {rows.length === 0 && <li className="py-16 text-center text-[14px] text-faint">Nothing matches.</li>}
      {rows.map((c) => {
        const run = runs[c.id];
        return (
          <li key={c.id}>
            <Link
              href={`/calls/${c.id}`}
              className="grid h-14 grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)_104px_72px_128px_120px] items-center gap-x-4 rounded-lg px-2 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={c.contact} size={28} />
                <span className="truncate text-[14px] font-medium text-ink">{c.contact}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2.5">
                <CompanyTile name={c.company} size={28} />
                <span className="truncate text-[14px] text-ink">{c.company}</span>
                <span className="truncate text-[13.5px] text-soft">· {c.title}</span>
              </span>
              <span className="flex items-center"><OutcomePill outcome={c.outcome} /></span>
              <span className="truncate text-[13.5px] text-soft">{c.rep.split(" ")[0]}</span>
              <span className="text-[13.5px] tabular-nums text-soft">{fmtDate(c.at)} · {fmtTime(c.at)}</span>
              <span className="flex items-center justify-end gap-1.5 text-[13.5px]">
                {run === "running" && <><span className="pulse-dot size-2 rounded-full bg-accent" /><span className="text-soft">Running</span></>}
                {run === "review" && <><span className="size-2 rounded-full bg-accent" /><span className="text-soft">Needs review</span></>}
                {run === "done" && <><Check className="size-3.5 text-faint" strokeWidth={2} /><span className="text-soft">Done</span></>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
