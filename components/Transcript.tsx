"use client";

import type { EmailMessage, Turn } from "@/lib/types";
import { Avatar } from "./Avatar";
import { cn, fmtDate, mmss } from "./ui";

/* Highlighting never scrolls; only an explicit click (RunView.jump) does. */
export function Transcript({ turns, highlight }: { turns: Turn[]; highlight: number | null }) {
  return (
    <ol className="flex flex-col gap-1">
      {turns.map((t) => (
        <li
          key={t.i}
          data-turn={t.i}
          className={cn("flex gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200", highlight === t.i ? "bg-accent-tint" : "bg-transparent")}
        >
          <Avatar name={t.name} size={24} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[14px] font-medium text-ink">{t.name}</span>
              <span className="text-[13px] tabular-nums text-soft">{mmss(t.t)}</span>
            </div>
            <p className={cn("mt-0.5 text-[15px] leading-6", t.speaker === "rep" ? "text-ink" : "text-text")}>{t.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const clock = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hour12: false });
const who = (m: EmailMessage) => m.sender.name ?? m.sender.email;
const toLine = (m: EmailMessage) => m.recipients.filter((r) => r.kind === "to").map((r) => r.name ?? r.email).join(", ");

/* An email thread rendered like the transcript: same rows, same highlight,
   same `data-turn` index so citations address messages the way they address
   turns. Inbound messages read in ink, outbound in text grey. */
export function Thread({ messages, highlight }: { messages: EmailMessage[]; highlight: number | null }) {
  return (
    <ol className="flex flex-col gap-1">
      {messages.map((m) => (
        <li
          key={m.i}
          data-turn={m.i}
          className={cn("flex gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200", highlight === m.i ? "bg-accent-tint" : "bg-transparent")}
        >
          <Avatar name={who(m)} size={24} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[14px] font-medium text-ink">{who(m)}</span>
              <span className="truncate text-[13px] text-faint">to {toLine(m)} · <span className="tabular-nums">{fmtDate(m.occurred_at)} · {clock.format(new Date(m.occurred_at))}</span></span>
            </div>
            {m.i === 0 && <p className="mt-0.5 text-[15px] font-medium text-ink">{m.subject}</p>}
            <div className={cn("mt-0.5 flex flex-col gap-3 text-[15px] leading-6", m.direction === "inbound" ? "text-ink" : "text-text")}>
              {m.body.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
