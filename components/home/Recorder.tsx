"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Square, X } from "lucide-react";
import { Button, cn, mmss } from "@/components/ui";

/* Voice bar for the Record tab. Idle: a flat row of dots and a tangerine mic.
   Recording: cancel · live scrolling waveform · stop · submit. Levels come
   from the microphone when allowed; otherwise a smooth pseudo signal. */

const SAMPLE_MS = 80;
// Bar geometry (px): 400 wide, 6px padding, 32px buttons, 8px gaps.
const BAR_W = 400, PAD = 6, BTN = 32, GAP = 8;
const PITCH = 5; // 2px dot/bar on a 5px pitch
// Idle track: from 16px after the left edge to 12px before the mic.
const IDLE_TRACK = BAR_W - 16 - 12 - BTN - PAD;
// Recording track: between × and ■ with 8px gaps.
const REC_TRACK = BAR_W - PAD * 2 - BTN * 3 - GAP * 3;
const IDLE_DOTS = Math.floor(IDLE_TRACK / PITCH);
const BARS = Math.floor(REC_TRACK / PITCH);

type State = "idle" | "recording" | "stopped";

export function Recorder({ onUse }: { onUse: () => void }) {
  const [state, setState] = useState<State>("idle");
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const reduced = useRef(false);

  const release = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    ctx.current?.close().catch(() => {});
    ctx.current = null;
    analyser.current = null;
  };
  useEffect(() => release, []);

  const start = async () => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    startedAt.current = Date.now();
    setSeconds(0);
    setLevels(Array(BARS).fill(0));
    setState("recording");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const ac = new AudioContext();
      ctx.current = ac;
      const an = ac.createAnalyser();
      an.fftSize = 256;
      ac.createMediaStreamSource(s).connect(an);
      analyser.current = an;
    } catch {
      // No permission or device: the pseudo signal keeps the bar moving.
    }
  };

  useEffect(() => {
    if (state !== "recording") return;
    let phase = Math.random() * 10;
    const buf = new Uint8Array(128);
    const t = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
      let level: number;
      if (reduced.current) level = 0.5;
      else if (analyser.current) {
        analyser.current.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
      } else {
        phase += 0.35;
        const speaking = Math.sin(phase / 6) > -0.2;
        level = speaking ? Math.max(0, 0.25 + 0.35 * Math.sin(phase) + 0.25 * Math.sin(phase * 2.7) + (Math.random() - 0.5) * 0.3) : Math.random() * 0.05;
      }
      setLevels((l) => [...l.slice(1), level]);
    }, SAMPLE_MS);
    return () => clearInterval(t);
  }, [state]);

  const stop = () => { setState("stopped"); release(); };
  const cancel = () => { setState("idle"); release(); };

  const circle = "flex size-8 shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

  return (
    <div className="relative flex w-full flex-col items-center justify-center gap-3">
      <div className="flex h-5 items-center text-[13px] leading-5 text-soft">
        {state === "idle" ? "Record the call" : <>{state === "stopped" ? "Recorded" : "Recording"} · <span className="tabular-nums">{mmss(seconds)}</span></>}
      </div>
      <div className="flex h-11 items-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.08),inset_0_0_0_1px_#e8e8e8]" style={{ width: BAR_W, padding: PAD, gap: GAP }}>
        {state === "idle" ? (
          <>
            <div aria-hidden className="flex h-8 items-center" style={{ width: IDLE_TRACK, marginLeft: 16 - PAD, marginRight: 12 - GAP, gap: PITCH - 2 }}>
              {Array.from({ length: IDLE_DOTS }).map((_, i) => <span key={i} className="size-[2px] shrink-0 rounded-full bg-[#d4d4d4]" />)}
            </div>
            <button type="button" aria-label="Start recording" onClick={start} className={cn(circle, "bg-accent text-accent-ink hover:bg-[#ff7a5c]")}>
              <Mic className="size-4" strokeWidth={2} />
            </button>
          </>
        ) : (
          <>
            <button type="button" aria-label="Cancel" onClick={cancel} className={cn(circle, "text-soft shadow-[inset_0_0_0_1px_#e8e8e8] hover:bg-surface hover:text-ink")} style={{ animation: "fade-in 200ms ease-out both" }}>
              <X className="size-4" strokeWidth={2} />
            </button>
            <div aria-hidden className="flex h-8 items-center overflow-hidden" style={{ width: REC_TRACK, gap: PITCH - 2 }}>
              {levels.map((lv, i) => {
                const age = (BARS - 1 - i) / (BARS - 1);
                const h = Math.round(2 + lv * 24 * (1 - age * 0.55));
                const color = age > 0.7 ? "#d4d4d4" : age > 0.35 ? "#a3a3a3" : "#181925";
                return <span key={i} className="w-[2px] shrink-0 rounded-full" style={{ height: h, background: color, transition: "height 100ms ease-out, background-color 300ms linear" }} />;
              })}
            </div>
          </>
        )}
        {state === "recording" && (
          <button type="button" aria-label="Stop" onClick={stop} className={cn(circle, "text-ink shadow-[inset_0_0_0_1px_#e8e8e8] hover:bg-surface")} style={{ animation: "fade-in 200ms ease-out both" }}>
            <Square className="size-3 fill-current" />
          </button>
        )}
        {state === "stopped" && (
          <span className={cn(circle, "text-faint shadow-[inset_0_0_0_1px_#e8e8e8]")}><Square className="size-3 fill-current" /></span>
        )}
        {state !== "idle" && (
          <button type="button" aria-label="Use recording" onClick={onUse} className={cn(circle, "bg-accent text-accent-ink hover:bg-[#ff7d61]")} style={{ animation: "fade-in 200ms ease-out both" }}>
            <ArrowUp className="size-4" strokeWidth={2.25} />
          </button>
        )}
      </div>
      <div className={cn("absolute top-full mt-3 flex h-8 items-center gap-1 transition-opacity duration-200", state === "stopped" ? "opacity-100" : "pointer-events-none opacity-0")}>
        <Button variant="primary" size="sm" onClick={onUse}>Use recording</Button>
        <Button variant="ghost" size="sm" onClick={cancel}>Discard</Button>
      </div>
    </div>
  );
}
