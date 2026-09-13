"use client";

import { useEffect, useState } from "react";

/* Spinner, elapsed timer and the "working" line used by long-running steps. */

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block size-3 shrink-0 rounded-full border-[1.5px] border-line border-t-text ${className}`} style={{ animation: "spin 700ms linear infinite" }} />;
}

export function useElapsed(startedAt?: number, running = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [running]);
  const ms = Math.max(0, now - (startedAt ?? now));
  return ms;
}

export function fmtElapsed(ms: number) {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`;
}

export function WorkingLine({ label, startedAt, detail }: { label: string; startedAt?: number; detail?: string }) {
  const ms = useElapsed(startedAt);
  return (
    <span role="status" className="inline-flex items-center gap-2.5">
      <Spinner className="size-3.5 border-t-ink" />
      <span className="shimmer-text text-[13.5px] font-medium">{label}</span>
      {detail && <span className="text-[13.5px] tabular-nums text-ink">{detail}</span>}
      <span className="text-[13px] tabular-nums text-faint">{fmtElapsed(ms)}</span>
    </span>
  );
}
