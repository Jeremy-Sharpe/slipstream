"use client";

import Link from "next/link";
import { Check, Mail, Phone } from "lucide-react";
import { useStore } from "@/lib/store";
import type { CallRecord } from "@/lib/types";
import { Avatar } from "./Avatar";
import { OutcomePill, fmtTime } from "./ui";

export type ConversationFilter = "all" | "call" | "email";

const TZ = "Australia/Melbourne";
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const longDay = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

function dayLabel(iso: string) {
  const key = dayKey(iso);
  const now = new Date();
  if (key === dayKey(now.toISOString())) return "Today";
  if (key === dayKey(new Date(now.getTime() - 86400000).toISOString())) return "Yesterday";
  return longDay.format(new Date(iso));
}

const subjectOf = (c: CallRecord) => c.messages?.[0]?.subject ?? c.draft.subject.replace(/^Re:\s*/i, "");

export function ConversationsList({ query = "", filter = "all" }: { query?: string; filter?: ConversationFilter }) {
  const { calls, runs } = useStore();
  const q = query.trim().toLowerCase();
  const rows = calls
    .filter((c) => filter === "all" || c.kind === filter)
    .filter((c) => !q || `${c.contact} ${c.company} ${c.title} ${c.kind === "email" ? subjectOf(c) : ""}`.toLowerCase().includes(q));

  // Newest first, grouped by day.
  const groups: { key: string; label: string; rows: CallRecord[] }[] = [];
  for (const c of rows) {
    const key = dayKey(c.at);
    const g = groups[groups.length - 1];
    if (g && g.key === key) g.rows.push(c);
    else groups.push({ key, label: dayLabel(c.at), rows: [c] });
  }

  if (rows.length === 0) return <p className="border-y border-line-soft py-16 text-center text-[14px] text-faint">Nothing matches.</p>;

  return (
    <div>
      {groups.map((g, gi) => (
        <section key={g.key}>
          <h3 className={`mb-2 text-[12px] font-medium text-faint ${gi === 0 ? "mt-0" : "mt-6"}`}>{g.label}</h3>
          <ul className="border-b border-line-soft">
            {g.rows.map((c) => {
              const run = runs[c.id];
              const Glyph = c.kind === "email" ? Mail : Phone;
              return (
                <li key={c.id}>
                  <Link
                    href={`/calls/${c.id}`}
                    className="grid h-14 grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_112px_80px_132px] items-center gap-x-4 rounded-lg px-2 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={c.contact} size={28} />
                      <Glyph aria-label={c.kind === "email" ? "Email" : "Call"} className="size-4 shrink-0 text-faint" strokeWidth={1.75} />
                      <span className="truncate text-[14px] font-medium text-ink">{c.contact}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 truncate text-[14px] text-ink">{c.company}</span>
                      <span className="truncate text-[13.5px] text-soft">· {c.kind === "email" ? subjectOf(c) : c.title}</span>
                    </span>
                    <span className="flex items-center"><OutcomePill outcome={c.outcome} /></span>
                    <span className="text-[13.5px] tabular-nums text-soft">{fmtTime(c.at)}</span>
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
        </section>
      ))}
    </div>
  );
}
