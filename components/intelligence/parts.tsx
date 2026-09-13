import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/ui";

/* Small pieces shared by the Intelligence sections. */

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">{children}</h2>;
}

/** 24px white chip with a hairline; a link to a call. */
export function Chip({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full bg-white px-2.5 text-[13px] leading-none text-ink shadow-[inset_0_0_0_1px_#e8e8e8] transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {children}
    </Link>
  );
}

/** One muted line where a section could not be filled: a failed fetch, or nothing derived yet. */
export function ErrorLine({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[14px] text-faint", className)}>{children}</p>;
}

/** 44×4 bar on a hairline track. Ink for the won group, grey for the rest. */
export function Bar({ value, tone = "ink" }: { value: number; tone?: "ink" | "faint" }) {
  return (
    <span aria-hidden className="relative block h-1 w-11 shrink-0 overflow-hidden rounded-full bg-line">
      <span className={cn("absolute inset-y-0 left-0 rounded-full", tone === "ink" ? "bg-ink" : "bg-faint")} style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </span>
  );
}

/** "Won 5/5" beside its bar. The text is fixed-width so bars line up. */
export function Ratio({ label, n, of, tone }: { label: string; n: number; of: number; tone: "ink" | "faint" }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={cn("w-[76px] text-[13.5px] tabular-nums", tone === "ink" ? "text-ink" : "text-soft")}>
        {label} {n}/{of}
      </span>
      <Bar value={of ? n / of : 0} tone={tone} />
    </span>
  );
}
