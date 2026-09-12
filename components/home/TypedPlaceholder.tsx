"use client";

import { useEffect, useRef, useState } from "react";

/* Sample transcripts that type themselves into the empty Paste box, cycling
   through four short excerpts from the fixture calls. Hidden the moment the
   box is focused or has text. */

const SAMPLES: [string, string][][] = [
  [["Sam", "Thanks for making time, Grace. You mentioned the office move next quarter?"], ["Grace", "Yes — it's forced us to look at who actually owns our IT."], ["Sam", "And the cyber-insurance renewal, is that on your desk too?"]],
  [["Jordan", "Dev, what's the renewal asking for this year?"], ["Dev", "Essential Eight evidence. The partners want it gone before quarter close."], ["Jordan", "Then let's start with the evidence pack."]],
  [["Sam", "Olivia, when does your IT coordinator finish up?"], ["Olivia", "Three weeks. If the handover is clumsy, everyone will blame me."], ["Sam", "A shadow handover would calm that down."]],
  [["Jordan", "Aisha, what's driving the timing?"], ["Aisha", "The insurer wants Essential Eight evidence, and reception can't wait on support."], ["Jordan", "Insurance work first, then the helpdesk."]],
];

type Tok = { text: string; speaker?: boolean; br?: boolean };
const toTokens = (sample: [string, string][]): Tok[] =>
  sample.flatMap(([name, line], i) => [...(i > 0 ? [{ text: "", br: true }] : []), { text: `${name}:`, speaker: true }, ...line.split(" ").map((w) => ({ text: w }))]);
const TOKS = SAMPLES.map(toTokens);

const WORD_MS = 45, JITTER = 15, LINE_PAUSE = 220, HOLD_MS = 3400, FADE_MS = 300;

export function TypedPlaceholder({ active }: { active: boolean }) {
  const [sample, setSample] = useState(0);
  const [count, setCount] = useState(0);
  const [fading, setFading] = useState(false);
  const [reduced, setReduced] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!active) { setCount(0); setFading(false); return; }
    if (reduced) return;
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
          <span key={`${sample}-${i}`} className="inline-block" style={{ animation: reduced ? undefined : "fade-up 120ms ease-out both", color: t.speaker ? "#b0b0b0" : undefined, fontWeight: t.speaker ? 500 : undefined }}>
            {t.text}&nbsp;
          </span>
        )
      ))}
      {!reduced && !done && <span className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 rounded-full" style={{ background: "#c4c4c4", animation: "caret-blink 1s steps(1) infinite" }} />}
    </div>
  );
}
