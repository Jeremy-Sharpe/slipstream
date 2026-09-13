"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui";
import { useReducedMotion } from "@/lib/useReducedMotion";

/* Sample transcripts that type themselves into the empty Paste box, cycling
   through four short excerpts from the fixture calls. Hidden the moment the
   box is focused or has text. */

const SAMPLES: [string, string, string][][] = [
  [["00:00:12", "Sam Whitfield", "Thanks for making time, Grace. You mentioned the office move next quarter?"], ["00:00:21", "Grace Kim", "Yes. It has forced us to look at who actually owns our IT."], ["00:00:34", "Sam Whitfield", "And the cyber insurance renewal, is that on your desk too?"]],
  [["00:00:14", "Jordan Lee", "Dev, what is the renewal asking for this year?"], ["00:00:22", "Dev Patel", "We have got a cyber insurance renewal on my desk and the partners want it gone before quarter close."], ["00:00:38", "Jordan Lee", "Then we start with the evidence pack."]],
  [["00:00:10", "Sam Whitfield", "Olivia, when does your internal IT coordinator finish up?"], ["00:00:19", "Olivia Hart", "Three weeks. If the handover is clumsy, everyone will blame me for breaking something."], ["00:00:33", "Sam Whitfield", "A shadow handover would calm people down."]],
  [["00:00:11", "Jordan Lee", "Aisha, what is driving the timing?"], ["00:00:17", "Aisha Rahman", "The immediate issue is our cyber insurance renewal, which has become much stricter."], ["00:00:30", "Jordan Lee", "Insurance work first, then the helpdesk."]],
];

type Tok = { text: string; speaker?: boolean; stamp?: boolean; br?: boolean };
const toTokens = (sample: [string, string, string][]): Tok[] =>
  sample.flatMap(([stamp, name, line], i) => [...(i > 0 ? [{ text: "", br: true }] : []), { text: `[${stamp}]`, stamp: true }, { text: `${name}:`, speaker: true }, ...line.split(" ").map((w) => ({ text: w }))]);
const TOKS = SAMPLES.map(toTokens);

const WORD_MS = 45, JITTER = 15, LINE_PAUSE = 220, HOLD_MS = 3400, FADE_MS = 300;

export function TypedPlaceholder({ active }: { active: boolean }) {
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
    const toks = TOKS[sample];
    if (count < toks.length) {
      const prev = toks[count - 1];
      const delay = (prev?.br ? LINE_PAUSE : 0) + WORD_MS + (Math.random() * 2 - 1) * JITTER;
      timers.current.push(window.setTimeout(() => setCount((c) => c + 1), delay));
      return;
    }
    timers.current.push(window.setTimeout(() => setFading(true), HOLD_MS));
    timers.current.push(window.setTimeout(() => { setSample((s) => (s + 1) % TOKS.length); setCount(0); setFading(false); }, HOLD_MS + FADE_MS));
  }, [active, count, sample, reduced]);

  const toks = TOKS[sample];
  const shown = reduced ? TOKS[0] : toks.slice(0, count);
  const done = count >= toks.length;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 p-5 pb-10 text-[15px] leading-6 whitespace-pre-wrap transition-opacity"
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
