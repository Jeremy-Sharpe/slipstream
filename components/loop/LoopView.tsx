"use client";

import Link from "next/link";
import { useState } from "react";
import { DEMO_CALL, beats, readiness, value } from "@/lib/loop";
import { cn } from "@/components/ui";
import { Beat } from "./Beat";

/* The Revenue loop: the whole business loop as one rail, every beat linked
   to its evidence. Reads like the run page's "What Slipstream did", static. */

export function LoopView() {
  const [open, setOpen] = useState<string | null>(beats[0].n);

  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Revenue loop</h1>
          <p className="mt-2 text-[14px] text-soft">One call becomes CRM truth, a follow-up, team intelligence, an ICP, and the next campaign. Every step below links to its evidence.</p>
        </div>
        <Link
          href={`/calls/${DEMO_CALL}?from=home`}
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

      <ol className="mt-6">
        {beats.map((b, i) => (
          <Beat key={b.n} beat={b} expanded={open === b.n} onToggle={() => setOpen(open === b.n ? null : b.n)} last={i === beats.length - 1} />
        ))}
      </ol>

      <p className="mt-10 text-[13.5px] text-soft">
        In numbers · {value.map((v) => v.line).join(" · ")}
      </p>

      <p className="mt-4 flex items-center gap-2 text-[13px] text-soft">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink" />
        <span>
          {readiness.environment === "production" ? "Production" : readiness.environment} API · {readiness.reasoning_provider} {readiness.reasoning_model} · {readiness.embedding_model} · rev {readiness.revision} · storage {readiness.storage} · Origami {readiness.integrations.origami ? "connected" : "not connected (leads labelled fictional)"} · delivery {readiness.integrations.delivery ? "on" : "off, nothing is sent"}
        </span>
      </p>
    </div>
  );
}
