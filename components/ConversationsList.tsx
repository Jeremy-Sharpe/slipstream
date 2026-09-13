"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Mail, Phone } from "lucide-react";
import { useConversationList, type ConversationRow } from "@/lib/conversations";
import { Avatar } from "./Avatar";
import { Button, OutcomePill, fmtTime } from "./ui";

export type ConversationFilter = "all" | "call" | "email";

const TZ = "Australia/Melbourne";
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const longDay = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

/** `now` arrives after mount, so the server and the first client render agree. */
function dayLabel(iso: string, now: number | null) {
  if (now == null) return longDay.format(new Date(iso));
  const key = dayKey(iso);
  if (key === dayKey(new Date(now).toISOString())) return "Today";
  if (key === dayKey(new Date(now - 86400000).toISOString())) return "Yesterday";
  return longDay.format(new Date(iso));
}

/** The subject earns its slot only when it says more than the company and contact already do. */
function showSubject(row: ConversationRow): boolean {
  const subject = (row.subject ?? "").trim();
  if (!subject || subject === row.company) return false;
  const [head] = subject.split(/\s+[—–-]\s+/);
  return !(head.trim() === row.company && subject.includes(row.contact));
}

export function ConversationsList({ query = "", filter = "all" }: { query?: string; filter?: ConversationFilter }) {
  const { rows: all, loading, error, retry } = useConversationList();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const q = query.trim().toLowerCase();
  const rows = all
    .filter((row) => filter === "all" || row.kind === filter)
    .filter((row) => !q || `${row.contact} ${row.company} ${row.subject}`.toLowerCase().includes(q));

  if (loading) {
    // Same bones as the list: a day label, then 56px rows with a disc and two bars.
    return (
      <div aria-busy>
        <div className="mb-2 h-3.5 w-40 rounded bg-surface-2" />
        <ul className="border-b border-line-soft">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex h-14 items-center gap-3 px-2" style={{ opacity: 1 - i * 0.1 }}>
              <span className="size-7 shrink-0 rounded-full bg-surface" />
              <span className="ml-7 h-3.5 w-32 rounded bg-surface" />
              <span className="ml-4 h-3.5 w-56 rounded bg-surface-2" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-y border-line-soft py-16 text-center">
        <p className="text-[14px] text-soft">{error}</p>
        <Button className="mt-4" onClick={retry}>Try again</Button>
      </div>
    );
  }

  if (rows.length === 0) return <p className="border-y border-line-soft py-16 text-center text-[14px] text-faint">Nothing matches.</p>;

  // Newest first, grouped by day.
  const groups: { key: string; label: string; rows: ConversationRow[] }[] = [];
  for (const row of rows) {
    const key = dayKey(row.at);
    const group = groups[groups.length - 1];
    if (group && group.key === key) group.rows.push(row);
    else groups.push({ key, label: dayLabel(row.at, now), rows: [row] });
  }

  return (
    <div>
      {groups.map((group, gi) => (
        <section key={group.key}>
          <h3 className={`mb-2 text-[12px] font-medium text-faint ${gi === 0 ? "mt-0" : "mt-6"}`}>{group.label}</h3>
          <ul className="border-b border-line-soft">
            {group.rows.map((row) => {
              const state = row.run?.state;
              const Glyph = row.kind === "email" ? Mail : Phone;
              return (
                <li key={row.id}>
                  <Link
                    href={`/calls/${row.id}`}
                    className="grid h-14 grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_112px_80px_132px] items-center gap-x-4 rounded-lg px-2 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={row.contact} size={28} />
                      <Glyph aria-label={row.kind === "email" ? "Email" : "Call"} className="size-4 shrink-0 text-faint" strokeWidth={1.75} />
                      <span className="truncate text-[14px] font-medium text-ink">{row.contact}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 max-w-[60%] truncate text-[14px] text-ink">{row.company}</span>
                      {showSubject(row) && <><span className="shrink-0 text-faint">·</span><span className="min-w-0 truncate text-[13.5px] text-soft">{row.subject}</span></>}
                    </span>
                    <span className="flex items-center">{row.run?.outcome && <OutcomePill outcome={row.run.outcome} />}</span>
                    <span className="text-[13.5px] tabular-nums text-soft">{fmtTime(row.at)}</span>
                    <span className="flex items-center justify-end gap-1.5 text-[13.5px]">
                      {state === "running" && <><span className="pulse-dot size-2 rounded-full bg-accent" /><span className="text-soft">Running</span></>}
                      {state === "review" && <><span className="size-2 rounded-full bg-accent" /><span className="text-soft">Needs review</span></>}
                      {state === "done" && <><Check className="size-3.5 text-faint" strokeWidth={2} /><span className="text-soft">Done</span></>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
