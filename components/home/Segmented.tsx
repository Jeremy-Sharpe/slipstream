"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/components/ui";

/* Segmented pill: one white indicator slides between segments. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const el = track.current?.querySelector<HTMLButtonElement>(`[data-key="${value}"]`);
    const box = track.current?.getBoundingClientRect();
    if (el && box) {
      const r = el.getBoundingClientRect();
      setPos({ x: r.left - box.left, w: r.width });
    }
  }, [value, options]);

  return (
    <div ref={track} role="tablist" className="relative inline-flex h-9 items-center rounded-full bg-surface p-1">
      {pos && (
        <span
          aria-hidden
          className="absolute top-1 left-0 h-7 rounded-full bg-white shadow-[var(--shadow-card)] motion-safe:transition-[transform,width] motion-safe:duration-[220ms]"
          style={{ transform: `translateX(${pos.x}px)`, width: pos.w, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
        />
      )}
      {options.map((o) => (
        <button
          key={o.key}
          data-key={o.key}
          role="tab"
          type="button"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "relative z-10 h-7 rounded-full px-3.5 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            value === o.key ? "text-ink" : "text-soft hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
