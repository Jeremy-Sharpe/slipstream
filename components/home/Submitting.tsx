"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { cn, mmss } from "@/components/ui";
import { fmtElapsed, useElapsed } from "@/components/run/WorkingLine";

/* The handoff after submit, shared by file, recording and paste: pixel-grid
   loader + shimmering label + elapsed timer, one line of meta, then the
   label settles ("Transcribed · 30 turns · 7:05") and hands over. */

export type Source = { kind: "file"; name: string; bytes: number } | { kind: "recording" } | { kind: "paste"; lines: number };

const DURATION = 425; // demo recording length, so the counter is honest
const TURNS = 30;
const MEDIA_MS = 2500, PASTE_MS = 600, HOLD_MS = 450, ERROR_MS = 1600;

const label = (s: Source) => (s.kind === "file" ? `Transcribing ${s.name}` : s.kind === "recording" ? "Transcribing your recording" : "Reading the transcript");
const mb = (b: number) => `${Math.max(0.1, b / 1048576).toFixed(1)} MB`;

export function Submitting({ source, error, onDone, onReset, variant = "card" }: { source: Source; error?: string; onDone: () => void; onReset?: () => void; variant?: "card" | "bar" }) {
  const [settled, setSettled] = useState(false);
  const started = useRef(Date.now());
  const ms = useElapsed(started.current, !settled);
  const total = source.kind === "paste" ? PASTE_MS : MEDIA_MS;

  useEffect(() => {
    if (error) { const t = setTimeout(() => onReset?.(), ERROR_MS); return () => clearTimeout(t); }
    const a = setTimeout(() => setSettled(true), total);
    const b = setTimeout(onDone, total + HOLD_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [error, total, onDone, onReset]);

  const at = Math.min(DURATION, Math.round((ms / total) * DURATION));
  const meta = source.kind === "paste" ? `${source.lines} lines` : `${mmss(at)} / ${mmss(DURATION)}${source.kind === "file" ? ` · ${mb(source.bytes)}` : ""}`;

  return (
    <div className={cn("flex flex-col items-center", variant === "bar" && "h-5 justify-center")} style={{ animation: "fade-in 200ms ease-out both" }}>
      <div role="status" className="flex items-center gap-2.5">
        {error ? (
          <X className="size-3.5 text-soft" strokeWidth={2.5} style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }} />
        ) : settled ? (
          <Check className="size-3.5 text-ink" strokeWidth={2.5} style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }} />
        ) : null}
        {error ? (
          <span className="text-[14px] font-medium text-soft" style={{ animation: "fade-in 300ms ease-out both" }}>{error}</span>
        ) : settled ? (
          <span className="text-[14px] font-medium text-ink" style={{ animation: "fade-in 300ms ease-out both" }}>Transcribed · {TURNS} turns · {mmss(DURATION)}</span>
        ) : (
          <span className="shimmer-text max-w-[300px] truncate text-[14px] font-medium">{label(source)}</span>
        )}
        {!error && !settled && <span className="text-[13px] tabular-nums text-faint">{fmtElapsed(ms)}</span>}
      </div>
      {!error && variant === "card" && <p className="mt-1.5 text-[13px] tabular-nums text-soft">{meta}</p>}
    </div>
  );
}
