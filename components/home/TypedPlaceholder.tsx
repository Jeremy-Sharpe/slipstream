"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui";
import { EMAIL_SAMPLES, TRANSCRIPT_SAMPLES } from "@/lib/data/placeholders";
import { useReducedMotion } from "@/lib/useReducedMotion";

/* Types the sample excerpts from lib/data/placeholders into the empty Paste box.
   Hidden the moment the box is focused or has text. */



type Tok = { text: string; speaker?: boolean; stamp?: boolean; br?: boolean };
const toTokens = (sample: [string, string, string][]): Tok[] =>
  sample.flatMap(([stamp, name, line], i) => [...(i > 0 ? [{ text: "", br: true }] : []), { text: `[${stamp}]`, stamp: true }, { text: `${name}:`, speaker: true }, ...line.split(" ").map((w) => ({ text: w }))]);
const toEmailTokens = (lines: string[]): Tok[] =>
  lines.flatMap((line, i) => {
    const br: Tok[] = i > 0 ? [{ text: "", br: true }] : [];
    if (!line) return br;
    const header = line.match(/^(From|To|Subject|Date):\s*(.*)$/);
    return header ? [...br, { text: `${header[1]}:`, speaker: true }, ...header[2].split(" ").map((w) => ({ text: w }))] : [...br, ...line.split(" ").map((w) => ({ text: w }))];
  });
const TOKS = TRANSCRIPT_SAMPLES.map(toTokens);
const EMAIL_TOKS = EMAIL_SAMPLES.map(toEmailTokens);

const WORD_MS = 45, JITTER = 15, LINE_PAUSE = 220, HOLD_MS = 3400, FADE_MS = 300;

export function TypedPlaceholder({ active, variant = "transcript" }: { active: boolean; variant?: "transcript" | "email" }) {
  const all = variant === "email" ? EMAIL_TOKS : TOKS;
  const [sample, setSample] = useState(0);
  const [count, setCount] = useState(0);
  const [fading, setFading] = useState(false);
  const reduced = useReducedMotion();
  const timers = useRef<number[]>([]);
  // Restart from the top whenever the box becomes active again.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) { setWasActive(active); if (active) { setCount(0); setFading(false); } }

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!active || reduced) return;
    const toks = all[sample];
    if (count < toks.length) {
      const prev = toks[count - 1];
      const delay = (prev?.br ? LINE_PAUSE : 0) + WORD_MS + (Math.random() * 2 - 1) * JITTER;
      timers.current.push(window.setTimeout(() => setCount((c) => c + 1), delay));
      return;
    }
    timers.current.push(window.setTimeout(() => setFading(true), HOLD_MS));
    timers.current.push(window.setTimeout(() => { setSample((s) => (s + 1) % all.length); setCount(0); setFading(false); }, HOLD_MS + FADE_MS));
  }, [active, count, sample, reduced, all]);

  const toks = all[sample];
  const shown = reduced ? all[0] : toks.slice(0, count);
  const done = count >= toks.length;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden p-5 pb-10 text-[15px] leading-6 whitespace-pre-wrap transition-opacity"
      style={{ color: "#c4c4c4", opacity: active ? (fading ? 0 : 1) : 0, transitionDuration: active ? `${FADE_MS}ms` : "150ms", willChange: "opacity", minHeight: 72 }}
    >
      {shown.map((t, i) => (
        t.br ? <br key={`${sample}-${i}`} /> : (
          <span key={`${sample}-${i}`} className={cn("inline-block", t.stamp && "tabular-nums")} style={{ animation: reduced ? undefined : "fade-up 120ms ease-out both", color: t.speaker ? "#b0b0b0" : t.stamp ? "#d4d4d4" : undefined, fontWeight: t.speaker ? 500 : undefined }}>
            {t.text}&nbsp;
          </span>
        )
      ))}
      {!reduced && !done && <span className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 rounded-full" style={{ background: "#c4c4c4", animation: "caret-blink 1s steps(1) infinite" }} />}
    </div>
  );
}
