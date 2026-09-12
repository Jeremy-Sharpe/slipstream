"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { Avatar, CompanyTile } from "./Avatar";
import { OutcomePill, fmtDate, fmtTime } from "./ui";

export function CallsList() {
  const { calls, runs } = useStore();
  return (
    <ul className="divide-y divide-line-soft border-y border-line-soft">
      {calls.map((c) => {
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
              <span className="w-[70px] truncate text-[13px] text-soft">{c.rep.split(" ")[0]}</span>
              <span className="w-[112px] font-mono text-[12px] tabular-nums text-soft">{fmtDate(c.at)} · {fmtTime(c.at)}</span>
              <span className="flex w-[110px] items-center justify-end gap-1.5 text-[12.5px]">
                {run === "running" && <><span className="pulse-dot size-2 rounded-full bg-accent" /><span className="text-soft">Running</span></>}
                {run === "review" && <><span className="size-2 rounded-full bg-accent" /><span className="text-soft">Needs review</span></>}
                {run === "done" && <><Check className="size-3.5 text-faint" strokeWidth={2} /><span className="text-faint">Done</span></>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
