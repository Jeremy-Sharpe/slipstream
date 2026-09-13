"use client";

import Link from "next/link";
import { useState } from "react";
import { DEMO_CALL, beats, readiness, value } from "@/lib/loop";
import { Beat } from "./Beat";

/* The Revenue loop: the whole business loop as one rail, every beat linked
   to its evidence. Reads like the run page's "What Slipstream did", static. */

const runtime = [
  { label: "API", value: `${readiness.environment === "production" ? "Production" : readiness.environment}, ${readiness.integrations.api ? "connected" : "not connected"}` },
  { label: "Reasoning", value: `${readiness.reasoning_provider} · ${readiness.reasoning_model}` },
  { label: "Embeddings", value: readiness.embedding_model ?? "None" },
  { label: "Revision", value: readiness.revision },
];

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

      <section className="mt-8 rounded-2xl bg-surface-2 p-5">
        <dl className="grid grid-cols-4 gap-x-6">
          {runtime.map((r) => (
            <div key={r.label} className="min-w-0">
              <dt className="text-[12px] text-soft">{r.label}</dt>
              <dd className="mt-0.5 truncate text-[14px] tabular-nums text-ink">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[12px] text-faint">
          Storage: {readiness.storage} · Origami: {readiness.integrations.origami ? "connected" : "not connected, leads are generated and labelled fictional"} · Delivery: {readiness.integrations.delivery ? "on" : "off, nothing is sent"}
        </p>
      </section>

      <ol className="mt-10">
        {beats.map((b, i) => (
          <Beat key={b.n} beat={b} expanded={open === b.n} onToggle={() => setOpen(open === b.n ? null : b.n)} last={i === beats.length - 1} />
        ))}
      </ol>

      <section className="mt-10">
        <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">What it is worth</h2>
        <div className="grid grid-cols-3 gap-3">
          {value.map((v) => (
            <div key={v.figure} className="rounded-xl border border-line bg-white p-4">
              <p className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums text-ink">{v.figure}</p>
              <p className="mt-2 text-[14px] text-soft">{v.note}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 text-[12px] text-faint">This page navigates existing evidence. It does not simulate provider calls or send email.</p>
    </div>
  );
}
