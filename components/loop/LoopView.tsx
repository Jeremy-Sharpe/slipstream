"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/components/ui";
import type { Loop } from "@/lib/loop";
import { Beat } from "./Beat";

/* The Revenue loop: the whole business loop as one rail, every beat linked
   to its evidence. Reads like the run page's "What Slipstream did", static.
   Every number in the beats and the runtime line comes from the API; the
   figures in numbers are stated scenarios, not results. */

export function LoopView({ loop }: { loop: Loop }) {
  const { beats } = loop;
  const [open, setOpen] = useState<string | null>(beats[0].n);
  const errors = [loop.errors.readiness, loop.errors.evidence, loop.errors.leads].filter((item): item is string => item !== null);

  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Revenue loop</h1>
          <p className="mt-2 text-[14px] text-soft">One call becomes CRM truth, a follow-up, team intelligence, an ICP, and the next campaign. Every step below links to its evidence.</p>
        </div>
        <Link
          href={`${loop.demoHref}?from=home`}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-accent px-4 text-[13.5px] font-medium whitespace-nowrap text-accent-ink transition-colors duration-150 hover:bg-[#ff7d61] active:bg-[#f25a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Watch it run →
        </Link>
      </div>

      {/* The loop strip: seven numbered circles on a hairline; the open beat in tangerine. */}
      <ol className="mt-10 flex items-center" aria-label="Beats">
        {beats.map((b, i) => (
          <li key={b.n} className="flex items-center">
            <button
              type="button"
              aria-label={`${b.verb}: ${b.title}`}
              aria-current={open === b.n ? "step" : undefined}
              onClick={() => setOpen(b.n)}
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[11px] font-medium tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                open === b.n ? "bg-accent text-accent-ink" : "bg-ink text-white hover:bg-[#2f3040]",
              )}
            >
              {i + 1}
            </button>
            {i < beats.length - 1 && <span aria-hidden className="h-px w-10 bg-line" />}
          </li>
        ))}
      </ol>

      {errors.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {errors.map((error) => (
            <li key={error} className="text-[13px] text-faint">Some numbers are missing: {error}</li>
          ))}
        </ul>
      )}

      <ol className="mt-6">
        {beats.map((b, i) => (
          <Beat key={b.n} beat={b} expanded={open === b.n} onToggle={() => setOpen(open === b.n ? null : b.n)} last={i === beats.length - 1} />
        ))}
      </ol>

      <p className="mt-10 text-[13.5px] text-soft">
        In numbers, illustrative · {loop.value.map((v) => v.figure).join(" · ")}
      </p>
      <p className="mt-1 text-[12px] text-faint">{loop.value.map((v) => v.note).join(" ")} Scenarios from these assumptions, not measured results.</p>

      <p className="mt-4 flex items-center gap-2 text-[13px] text-soft">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink" />
        <span>{loop.runtimeLine}</span>
      </p>
    </div>
  );
}
