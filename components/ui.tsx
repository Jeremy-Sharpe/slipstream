import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Outcome } from "@/lib/types";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost";
export function Button({ variant = "secondary", size = "md", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50",
        size === "md" ? "h-9 px-4 text-[13.5px]" : "h-7 px-3 text-[12.5px]",
        variant === "primary" && "bg-accent text-accent-ink hover:bg-[#ff7d61] active:bg-[#f25a3a]",
        variant === "secondary" && "bg-surface text-ink hover:bg-[#ececec] active:bg-[#e3e3e3]",
        variant === "ghost" && "text-soft hover:bg-surface hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

const OUTCOME: Record<Outcome, { label: string; cls: string; dot: string }> = {
  won: { label: "Won", cls: "bg-success-tint text-success", dot: "bg-success" },
  stalled: { label: "Stalled", cls: "bg-warning-tint text-warning", dot: "bg-warning" },
  lost: { label: "Lost", cls: "bg-danger-tint text-danger", dot: "bg-danger" },
  no_show: { label: "No-show", cls: "bg-surface text-soft", dot: "bg-faint" },
};

export function OutcomePill({ outcome }: { outcome: Outcome }) {
  const o = OUTCOME[outcome];
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium leading-none", o.cls)}>
      <span className={cn("size-1.5 rounded-full", o.dot)} />
      {o.label}
    </span>
  );
}

export function Pill({ children, tone = "grey", className }: { children: ReactNode; tone?: "grey" | "green" | "accent"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium leading-none",
        tone === "grey" && "bg-surface text-soft",
        tone === "green" && "bg-success-tint text-success",
        tone === "accent" && "bg-accent-tint text-[#c2410c]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Score({ value }: { value: number }) {
  return <span className={cn("text-[13.5px] font-medium tabular-nums", value >= 80 ? "text-success" : "text-ink")}>{value}</span>;
}

/** "closed_won" → "Closed won". For enum-ish values printed to people. */
export const humanize = (s: string) => { const t = s.replace(/_/g, " "); return t.charAt(0).toUpperCase() + t.slice(1); };
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const dateFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "2-digit", hour12: false });
export const fmtDate = (iso: string) => dateFmt.format(new Date(iso));
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
