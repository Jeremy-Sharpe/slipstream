import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
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

/** 28px chip: the won contact's gradient disc and their company, linking to the call. */
export function PersonChip({ href, name, children }: { href: string; name: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white py-0 pr-2.5 pl-1 text-[13px] leading-none text-ink shadow-[inset_0_0_0_1px_#e8e8e8] transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <Avatar name={name} size={20} />
      {children}
    </Link>
  );
}

/** Bar on a hairline track: 44px by default, 120px for the pattern rows. Ink for the won group, grey for the rest. */
export function Bar({ value, tone = "ink", width = 44 }: { value: number; tone?: "ink" | "faint"; width?: number }) {
  return (
    <span aria-hidden className="relative block h-1 shrink-0 overflow-hidden rounded-full bg-line" style={{ width }}>
      <span className={cn("absolute inset-y-0 left-0 rounded-full", tone === "ink" ? "bg-ink" : "bg-[#d4d4d4]")} style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
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

/** Won against the rest on the same 120px track, values right-aligned on one line. */
export function Compare({ won, other }: { won: { n: number; of: number }; other: { n: number; of: number } }) {
  return (
    <div className="grid grid-cols-[44px_120px_40px] items-center gap-x-3 gap-y-1.5">
      <span className="text-[12.5px] text-ink">Won</span>
      <Bar value={won.of ? won.n / won.of : 0} width={120} />
      <span className="text-right text-[13px] tabular-nums text-ink">{won.n}/{won.of}</span>
      <span className="text-[12.5px] text-soft">Other</span>
      <Bar value={other.of ? other.n / other.of : 0} tone="faint" width={120} />
      <span className="text-right text-[13px] tabular-nums text-soft">{other.n}/{other.of}</span>
    </div>
  );
}
