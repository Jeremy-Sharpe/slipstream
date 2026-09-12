import Link from "next/link";
import type { ReactNode } from "react";
import type { CallRef, Outcome } from "@/lib/types/intelligence";
import { cn } from "@/lib/utils";

/** A bordered section card with an anchor id so quick links can jump to it. */
export function Section({ id, title, meta, active, children, className }: { id: string; title: string; meta?: ReactNode; active?: boolean; children: ReactNode; className?: string }) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-6 rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(17,24,39,0.06)] transition-shadow duration-500", active && "ring-2 ring-foreground/15", className)}
    >
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <h2 className="text-[20px] font-semibold text-foreground">{title}</h2>
        {meta && <div className="text-[15px] text-muted-foreground">{meta}</div>}
      </header>
      <div className="p-6 text-[16px]">{children}</div>
    </section>
  );
}

/** Thin ink bar on a grey track. `share` is 0–1. */
export function Bar({ share, className }: { share: number; className?: string }) {
  return (
    <span className={cn("block h-1 w-full overflow-hidden rounded-full bg-border", className)} aria-hidden>
      <span className="block h-full rounded-full bg-foreground" style={{ width: `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%` }} />
    </span>
  );
}

/** A won call as a chip that opens its conversation. */
export function EvidenceChip({ call }: { call: CallRef }) {
  return (
    <Link
      href={`/conversations/${call.id}`}
      className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border bg-card px-2.5 text-[14px] text-foreground transition-colors duration-150 hover:bg-muted active:bg-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      {call.company}
    </Link>
  );
}

const OUTCOME: Record<Outcome, string> = { won: "Won", stalled: "Stalled", lost: "Lost", no_show: "No-show" };

export function OutcomeTag({ outcome }: { outcome: Outcome }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md px-2 text-[12px] font-medium",
        outcome === "won" ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
      )}
    >
      {OUTCOME[outcome]}
    </span>
  );
}
