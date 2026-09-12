"use client";

import { useEffect, useState } from "react";

/* A sample transcript that types itself into the empty Paste box, loops,
   and hides the moment the box is focused or has text. */

const SAMPLE = [
  ["Sam", "Thanks for making time, Grace. You mentioned the office move next quarter?"],
  ["Grace", "Yes — it's forced us to look at who actually owns our IT."],
  ["Sam", "And the cyber-insurance renewal, is that on your desk too?"],
] as const;

type Tok = { text: string; speaker?: boolean; br?: boolean };
const TOKENS: Tok[] = SAMPLE.flatMap(([name, line], i) => [
  ...(i > 0 ? [{ text: "", br: true }] : []),
  { text: `${name}:`, speaker: true },
  ...line.split(" ").map((w) => ({ text: w })),
]);

const WORD_MS = 55, HOLD_MS = 3400, FADE_MS = 300;

export function TypedPlaceholder({ active }: { active: boolean }) {
  const [count, setCount] = useState(0);
  const [fading, setFading] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);

  useEffect(() => {
    if (!active) { setCount(0); setFading(false); return; }
    if (reduced) return;
    if (count < TOKENS.length) {
      const t = setTimeout(() => setCount((c) => c + 1), WORD_MS);
      return () => clearTimeout(t);
    }
    const hold = setTimeout(() => setFading(true), HOLD_MS);
    const restart = setTimeout(() => { setFading(false); setCount(0); }, HOLD_MS + FADE_MS);
    return () => { clearTimeout(hold); clearTimeout(restart); };
  }, [active, count, reduced]);

  const shown = reduced ? TOKENS : TOKENS.slice(0, count);
  const done = count >= TOKENS.length;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 p-5 pb-10 text-[15px] leading-6 text-faint whitespace-pre-wrap transition-opacity"
      style={{ opacity: active ? (fading ? 0 : 1) : 0, transitionDuration: active ? `${FADE_MS}ms` : "150ms" }}
    >
      {shown.map((t, i) => (t.br ? <br key={i} /> : t.speaker ? <span key={i} className="font-medium text-soft">{t.text} </span> : <span key={i}>{t.text} </span>))}
      {!reduced && !done && <span className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 rounded-full bg-faint" />}
    </div>
  );
}
