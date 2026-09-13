"use client";

import { useEffect, useRef } from "react";
import type { Turn } from "@/lib/types";
import { Avatar } from "./Avatar";
import { cn, mmss } from "./ui";

export function Transcript({ turns, highlight }: { turns: Turn[]; highlight: number | null }) {
  const refs = useRef<Record<number, HTMLLIElement | null>>({});
  useEffect(() => {
    if (highlight == null) return;
    const el = refs.current[highlight];
    if (!el) return;
    // Scroll the page (left column) only; the sticky right column stays put.
    const r = el.getBoundingClientRect();
    if (r.top < 80 || r.bottom > window.innerHeight - 40) window.scrollBy({ top: r.top - window.innerHeight / 2 + r.height / 2, behavior: "smooth" });
  }, [highlight]);
  return (
    <ol className="flex flex-col gap-1">
      {turns.map((t) => (
        <li
          key={t.i}
          ref={(el) => { refs.current[t.i] = el; }}
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
