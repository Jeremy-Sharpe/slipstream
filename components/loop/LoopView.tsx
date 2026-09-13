"use client";

import Link from "next/link";
import { useState } from "react";
import type { Loop } from "@/lib/loop";
import { Beat } from "./Beat";

/* The Revenue loop: the whole business loop as one rail, every beat linked to
   its evidence. The runtime strip and every number in the beats come from the
   API; the value tiles are stated scenarios, not results. */

export function LoopView({ loop }: { loop: Loop }) {
  const [open, setOpen] = useState<string | null>(loop.beats[0].n);
  const errors = [loop.errors.readiness, loop.errors.evidence, loop.errors.leads].filter((item): item is string => item !== null);

  return (
    <div className="mx-auto max-w-[880px]">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Revenue loop</h1>
          <p className="mt-1 text-[13.5px] text-soft">One call becomes CRM truth, a follow-up, team intelligence, an ICP, and the next campaign. Every step below links to its evidence.</p>
        </div>
        <Link
          href={`${loop.demoHref}?from=home`}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-accent px-4 text-[13.5px] font-medium whitespace-nowrap text-accent-ink transition-colors duration-150 hover:bg-[#ff7d61] active:bg-[#f25a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Watch it run →
        </Link>
      </div>

      <section className="mt-8 rounded-2xl bg-surface-2 p-5">
        <dl className="grid grid-cols-4 gap-x-6">
          {loop.runtime.map((r) => (
            <div key={r.label} className="min-w-0">
              <dt className="text-[12px] text-soft">{r.label}</dt>
              <dd className="mt-0.5 truncate text-[14px] tabular-nums text-ink" title={r.value}>{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[12px] text-faint">{loop.runtimeNote}</p>
        {loop.runtimeCaveat && <p className="mt-1 text-[12px] text-faint">{loop.runtimeCaveat}</p>}
      </section>

      {errors.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {errors.map((error) => (
            <li key={error} className="text-[13px] text-faint">Some numbers are missing: {error}</li>
          ))}
        </ul>
      )}

      <ol className="mt-10">
        {loop.beats.map((b, i) => (
          <Beat key={b.n} beat={b} expanded={open === b.n} onToggle={() => setOpen(open === b.n ? null : b.n)} last={i === loop.beats.length - 1} />
        ))}
      </ol>

      <section className="mt-12">
        <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">What it is worth</h2>
        <div className="grid grid-cols-3 gap-3">
          {loop.value.map((v) => (
            <div key={v.figure} className="rounded-xl border border-line bg-white p-4">
              <p className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums text-ink">{v.figure}</p>
              <p className="mt-1 text-[13.5px] text-soft">{v.note}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 text-[12px] text-faint">This page navigates existing evidence. It does not simulate provider calls or send email. The three figures above are scenarios from the stated assumptions, not measured results.</p>
    </div>
  );
}
