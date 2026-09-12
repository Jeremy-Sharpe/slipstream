"use client";

import { useEffect, useState } from "react";

/* Pixel-grid loader for long-running work: 3×3 4px cells with a chevron
   wavefront ("Drive", 650ms), a shimmering label and a live elapsed timer.
   Reduced motion freezes the grid (globals.css kills the animation); the
   timer keeps ticking. */

const CHEVRON = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

export function LoaderGrid({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px] ${className}`}>
      {CHEVRON.map((delay, i) => (
        <span key={i} className="size-[4px] rounded-[1px] bg-ink" style={{ opacity: 0.15, animation: `pixel-on 650ms ease-in-out ${delay}ms infinite` }} />
      ))}
    </span>
  );
}

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
      <LoaderGrid />
      <span className="shimmer-text text-[13.5px] font-medium">{label}</span>
      {detail && <span className="text-[13.5px] tabular-nums text-ink">{detail}</span>}
      <span className="text-[13px] tabular-nums text-faint">{fmtElapsed(ms)}</span>
    </span>
  );
}
