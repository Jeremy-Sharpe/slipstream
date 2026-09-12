"use client";

import { useEffect, useState } from "react";
import type { CallRecord } from "@/lib/types";
import { summaryTokens, whyTokens } from "@/lib/summary";
import { StreamingText } from "./StreamingText";

/* Conversation intelligence: the two-sentence summary streams in once the
   call is scored, with transcript citations. Follow-ups re-stream the card. */
export function Summary({ call, runId, ready, onHighlight }: { call: CallRecord; runId: number; ready: boolean; onHighlight: (i: number | null) => void }) {
  const [mode, setMode] = useState<"summary" | "why" | "shorter">("summary");
  const [gen, setGen] = useState(0);
  useEffect(() => { setMode("summary"); setGen((g) => g + 1); }, [runId]);
  if (!ready) return null;

  const base = summaryTokens(call);
  const view = mode === "why" ? whyTokens(call) : mode === "shorter"
    ? { tokens: [{ text: "Shorter follow-up drafted below. Two paragraphs, same promise, same next step." }], sources: [] }
    : base;

  return (
    <section className="mb-6 rounded-xl bg-surface p-4" style={{ animation: "fade-up 320ms cubic-bezier(0.23,1,0.32,1) both" }}>
      <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Conversation intelligence</p>
      <StreamingText
        key={`${mode}-${gen}`}
        size="lg"
        tokens={view.tokens}
        sources={view.sources}
        followUps={base.followUps}
        onCite={onHighlight}
        onFollowUp={(_, i) => {
          if (i === 0) { setMode("shorter"); window.dispatchEvent(new CustomEvent("slipstream:shorter-draft")); }
          else setMode("why");
          setGen((g) => g + 1);
        }}
      />
    </section>
  );
}
