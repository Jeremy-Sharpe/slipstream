"use client";

import { useState } from "react";
import type { CallRecord } from "@/lib/types";
import { summaryTokens, whyTokens } from "@/lib/summary";
import { StreamingText } from "./StreamingText";

/* Conversation intelligence: fades in above the timeline once phase 1 is
   done, streams the summary with transcript citations, and offers two chips. */
export function Summary({ call, runId, ready, onHighlight, onJump }: {
  call: CallRecord;
  runId: number;
  ready: boolean;
  onHighlight: (i: number | null) => void;
  onJump: (i: number) => void;
}) {
  const [why, setWhy] = useState(false);
  const [gen, setGen] = useState(0);
  const [seenRun, setSeenRun] = useState(runId);
  if (seenRun !== runId) { setSeenRun(runId); setWhy(false); setGen((g) => g + 1); }
  if (!ready) return null;

  const base = summaryTokens(call);
  const answer = whyTokens(call);
  const whyLabel = call.outcome === "won" ? "Why did this one close?" : call.outcome === "stalled" ? "Why did this one stall?" : call.outcome === "lost" ? "Why did this one get lost?" : null;
  const followUps = whyLabel && !why ? [whyLabel] : [];

  return (
    <section className="mb-4 rounded-xl bg-surface p-4" style={{ animation: "fade-in 200ms ease-out both" }}>
      <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Conversation intelligence</p>
      <StreamingText
        key={`summary-${gen}`}
        size="lg"
        tokens={base.tokens}
        sources={base.sources}
        followUps={followUps}
        onCite={onHighlight}
        onJump={onJump}
        onFollowUp={() => setWhy(true)}
      />
      {why && (
        <div className="mt-3 border-t border-line pt-3" style={{ animation: "fade-in 200ms ease-out both" }}>
          <p className="mb-1.5 text-[13px] text-soft">{whyLabel}</p>
          <StreamingText key={`why-${gen}`} size="lg" tokens={answer.tokens} sources={answer.sources} onCite={onHighlight} onJump={onJump} />
        </div>
      )}
    </section>
  );
}
