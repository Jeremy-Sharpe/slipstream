import Link from "next/link";
import type { ReactNode } from "react";
import type { CallRef, Outcome } from "@/lib/types/intelligence";
import { cn } from "@/lib/utils";

/** A bordered section card with an anchor id so quick links can jump to it. */
export function Section({ id, title, meta, active, children, className }: { id: string; title: string; meta?: ReactNode; active?: boolean; children: ReactNode; className?: string }) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-6 rounded-xl border border-border bg-card transition-shadow", active && "ring-2 ring-primary", className)}
    >
      <header className="flex h-14 items-center justify-between border-b border-border px-5">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {meta && <div className="text-[13px] text-muted-foreground">{meta}</div>}
      </header>
      <div className="p-5">{children}</div>
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
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-page px-2 text-[13px] text-foreground transition-colors hover:border-foreground/30 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      {call.company}
    </Link>
  );
}

const OUTCOME: Record<Outcome, string> = { won: "Won", stalled: "Stalled", lost: "Lost", no_show: "No-show" };

export function OutcomeTag({ outcome }: { outcome: Outcome }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium",
        outcome === "won" ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
      )}
    >
      {OUTCOME[outcome]}
    </span>
  );
}
