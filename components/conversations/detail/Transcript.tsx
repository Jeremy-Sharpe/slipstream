"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { CallRecord, Turn } from "@/lib/types/calls";
import { cn } from "@/lib/utils";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export function Card({ title, aside, children, className }: { title?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-line bg-card", className)}>
      {title && (
        <header className="flex h-12 items-center justify-between border-b border-line px-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">{title}</h3>
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
    <div className="flex h-16 items-center gap-4 rounded-lg border border-line bg-card px-4">
      <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none">
        {playing ? <Pause className="size-4" strokeWidth={2} /> : <Play className="ml-0.5 size-4" strokeWidth={2} />}
      </button>
      <span className="w-10 text-xs text-muted-foreground tabular-nums">{fmt(t)}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{fmt(duration)}</span>
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
    <Card title="Transcript" aside={<span className="text-xs text-muted-foreground">{call.turns.length} turns · diarised</span>}>
      <ol className="divide-y divide-line">
        {call.turns.map((t) => <TurnRow key={t.index} turn={t} active={highlight === t.index} risky={risky.has(t.index)} />)}
      </ol>
    </Card>
  );
}

function TurnRow({ turn, active, risky }: { turn: Turn; active: boolean; risky: boolean }) {
  const rep = turn.speaker === "rep";
  return (
    <li id={`turn-${turn.index}`} className={cn("grid grid-cols-[32px_1fr_auto] gap-3 px-5 py-3 transition-colors", active && "bg-primary-soft")}>
      <span className={cn("flex size-8 items-center justify-center rounded-md text-[11px] font-semibold", rep ? "bg-muted text-ink-2" : "bg-foreground text-background")}>{initials(turn.name)}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">{turn.name}</span>
          {risky && <span className="rounded-full bg-primary-soft px-1.5 py-px text-[11px] font-medium text-ink">Coach flag</span>}
        </div>
        <p className="mt-0.5 text-sm leading-6 text-ink-2">{turn.text}</p>
      </div>
      <time className="pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">{fmt(turn.at)}</time>
    </li>
  );
}
