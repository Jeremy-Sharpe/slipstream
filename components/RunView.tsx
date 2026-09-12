"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type { CallRecord } from "@/lib/types";
import { useRun } from "@/lib/useRun";
import { Avatar, CompanyTile } from "./Avatar";
import { RunTimeline } from "./RunTimeline";
import { Summary } from "./run/Summary";
import { Transcript } from "./Transcript";
import { Button, OutcomePill, fmtDate, fmtTime, mmss } from "./ui";

export function RunView({ call }: { call: CallRecord }) {
  const fromHome = useSearchParams().get("from") === "home";
  const run = useRun(call, { fromHome });
  const [highlight, setHighlight] = useState<number | null>(null);

  return (
    <div style={{ animation: "fade-up 200ms cubic-bezier(0.23,1,0.32,1) both" }}>
      <Link href="/calls" className="inline-flex items-center gap-1.5 text-[13px] text-soft transition-colors duration-150 hover:text-ink">
        <ArrowLeft className="size-3.5" strokeWidth={1.75} /> Calls
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <Avatar name={call.contact} size={36} />
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-[20px] font-semibold text-ink">
            {call.contact}
            <span className="font-normal text-faint">·</span>
            <CompanyTile name={call.company} size={22} />
            <span>{call.company}</span>
          </h1>
          <p className="mt-0.5 flex items-center gap-2 text-[13px] text-soft">
            <OutcomePill outcome={call.outcome} />
            <span>{call.rep}</span>
            <span className="text-faint">·</span>
            <span className="text-[13.5px] tabular-nums">{fmtDate(call.at)} · {fmtTime(call.at)} · {mmss(call.duration)}</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={run.rerun}><RotateCcw className="size-3.5" strokeWidth={1.75} /> Re-run</Button>
      </div>

      <div className="mt-8 grid grid-cols-[55fr_45fr] gap-10">
        <section>
          <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Transcript</h2>
          <Transcript turns={call.turns} highlight={highlight} />
        </section>
        <section className="sticky top-8 max-h-[calc(100vh-4rem)] self-start overflow-y-auto pr-1">
          <Summary call={call} runId={run.runId} ready={run.steps.find((s) => s.id === "score")?.status === "done"} onHighlight={setHighlight} />
          <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">What Slipstream did</h2>
          <RunTimeline call={call} steps={run.steps} open={run.open} toggle={run.toggle} runId={run.runId} onHighlight={setHighlight} />
        </section>
      </div>
    </div>
  );
}
