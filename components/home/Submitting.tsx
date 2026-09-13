"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/components/ui";
import { fmtElapsed, useElapsed } from "@/components/run/WorkingLine";

/* The handoff after submit, shared by fixture, file, recording, paste and
   email: shimmering label + elapsed timer while the request is in flight, then
   the label settles with what the API actually returned and hands over. */

export type Source =
  | { kind: "fixture"; company: string; prospect: string }
  | { kind: "file"; name: string; bytes: number }
  | { kind: "recording"; bytes: number }
  | { kind: "paste"; lines: number }
  | { kind: "email"; messages: number };

const HOLD_MS = 450, ERROR_MS = 2600;

const label = (s: Source) =>
  s.kind === "fixture" ? `Filing ${s.company}`
  : s.kind === "file" ? `Transcribing ${s.name}`
  : s.kind === "recording" ? "Transcribing your recording"
  : s.kind === "email" ? "Reading the thread"
  : "Reading the transcript";

const mb = (b: number) => `${Math.max(0.1, b / 1048576).toFixed(1)} MB`;

export function Submitting({ source, error, done, onDone, onReset, variant = "card" }: {
  source: Source;
  /** The API's message when the request failed. */
  error?: string;
  /** What came back, once it has: "Transcribed · 26 turns · 7:00". */
  done?: string;
  onDone: () => void;
  onReset?: () => void;
  variant?: "card" | "bar";
}) {
  const [started] = useState(() => Date.now());
  const ms = useElapsed(started, !done && !error);

  useEffect(() => {
    if (error) {
      const timer = window.setTimeout(() => onReset?.(), ERROR_MS);
      return () => window.clearTimeout(timer);
    }
    if (!done) return;
    const timer = window.setTimeout(onDone, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [error, done, onDone, onReset]);

  const meta =
    source.kind === "paste" ? `${source.lines} lines`
    : source.kind === "email" ? `${source.messages} message${source.messages === 1 ? "" : "s"}`
    : source.kind === "fixture" ? source.prospect
    : source.kind === "file" ? `${source.name} · ${mb(source.bytes)}`
    : mb(source.bytes);

  return (
    <div className={cn("flex flex-col items-center", variant === "bar" && "h-5 justify-center")} style={{ animation: "fade-in 200ms ease-out both" }}>
      <div role="status" className="flex items-center gap-2.5">
        {error ? (
          <X className="size-3.5 text-soft" strokeWidth={2.5} style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }} />
        ) : done ? (
          <Check className="size-3.5 text-ink" strokeWidth={2.5} style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }} />
        ) : null}
        {error ? (
          <span className="max-w-[440px] text-[14px] font-medium text-soft" style={{ animation: "fade-in 300ms ease-out both" }}>{error}</span>
        ) : done ? (
          <span className="text-[14px] font-medium text-ink" style={{ animation: "fade-in 300ms ease-out both" }}>{done}</span>
        ) : (
          <span className="shimmer-text max-w-[300px] truncate text-[14px] font-medium">{label(source)}</span>
        )}
        {!error && !done && <span className="text-[13px] tabular-nums text-faint">{fmtElapsed(ms)}</span>}
      </div>
      {!error && variant === "card" && <p className="mt-1.5 max-w-[440px] truncate text-[13px] tabular-nums text-soft">{meta}</p>}
    </div>
  );
}
