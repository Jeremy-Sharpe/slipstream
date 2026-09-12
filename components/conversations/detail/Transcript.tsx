"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { CallRecord, Turn } from "@/lib/types/calls";
import { cn } from "@/lib/utils";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

/** One badge everywhere: 24px, radius 6, 12px/500, grey fill. */
export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-6 items-center rounded-md bg-muted px-2 text-[12px] font-medium text-foreground/80", className)}>{children}</span>;
}

export function Card({ title, aside, children, className }: { title?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(17,24,39,0.06)]", className)}>
      {title && (
        <header className="flex h-14 items-center justify-between border-b border-line px-6">
          <h3 className="flex items-center gap-2 text-[17px] font-semibold text-ink">{title}</h3>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

export function AudioPlayer({ duration }: { duration: number }) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setT((v) => { if (v + 1 >= duration) { setPlaying(false); return duration; } return v + 1; }), 1000);
    return () => window.clearInterval(id);
  }, [playing, duration]);
  const pct = duration ? (t / duration) * 100 : 0;
  return (
    <div className="flex h-[72px] items-center gap-4 rounded-xl border border-line bg-card px-5 shadow-[0_1px_2px_rgba(17,24,39,0.06)]">
      <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity duration-150 hover:opacity-90 active:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none">
        {playing ? <Pause className="size-4" strokeWidth={2} /> : <Play className="ml-0.5 size-4" strokeWidth={2} />}
      </button>
      <span className="w-12 text-[14px] text-muted-foreground tabular-nums">{fmt(t)}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-foreground transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-[14px] text-muted-foreground tabular-nums">{fmt(duration)}</span>
    </div>
  );
}

export function Transcript({ call, highlight }: { call: CallRecord; highlight: number | null }) {
  useEffect(() => {
    if (highlight == null) return;
    document.getElementById(`turn-${highlight}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);
  const risky = new Set(call.riskFlags.map((r) => r.turnIndex));
  return (
    <Card title="Transcript" aside={<span className="text-[14px] text-muted-foreground">{call.turns.length} turns · diarised</span>}>
      <ol className="divide-y divide-line">
        {call.turns.map((t) => <TurnRow key={t.index} turn={t} active={highlight === t.index} risky={risky.has(t.index)} />)}
      </ol>
    </Card>
  );
}

function TurnRow({ turn, active, risky }: { turn: Turn; active: boolean; risky: boolean }) {
  const rep = turn.speaker === "rep";
  return (
    <li id={`turn-${turn.index}`} className={cn("grid grid-cols-[36px_1fr_auto] gap-4 px-6 py-4 transition-colors duration-150", active && "bg-primary-soft")}>
      <span className={cn("flex size-9 items-center justify-center rounded-md text-[12px] font-semibold", rep ? "bg-muted text-ink-2" : "bg-foreground text-background")}>{initials(turn.name)}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-ink">{turn.name}</span>
          {risky && <Badge>Coach flag</Badge>}
        </div>
        <p className="mt-1 text-[16px] leading-6 text-ink-2">{turn.text}</p>
      </div>
      <time className="pt-0.5 font-mono text-[15px] text-muted-foreground tabular-nums">{fmt(turn.at)}</time>
    </li>
  );
}
