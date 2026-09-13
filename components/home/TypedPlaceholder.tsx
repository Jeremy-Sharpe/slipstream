"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui";
import { useReducedMotion } from "@/lib/useReducedMotion";

/* Sample transcripts (or forwarded emails) that type themselves into the
   empty Paste box, cycling through short excerpts from the fixture calls.
   Hidden the moment the box is focused or has text. */

const SAMPLES: [string, string, string][][] = [
  [["00:00:34", "Sam Whitfield", "Tell me about the note load itself. What are you producing now, and what does doubling actually mean in numbers?"], ["00:00:44", "Maya Chen", "We publish about sixty notes a month across four strategies. After the launch it's closer to a hundred and twenty."], ["00:01:09", "Sam Whitfield", "Who does the first draft today, and how long does one note take them?"]],
  [["00:00:20", "Jordan Lee", "Walk me through what happens from the moment a seller brings a piece in?"], ["00:00:31", "Aisha Rahman", "A specialist writes condition notes on paper, someone re-keys them into our sale system, then a cataloguer writes the lot description."], ["00:00:55", "Jordan Lee", "How many lots go through that path in a spring season?"]],
  [["00:00:18", "Sam Whitfield", "How many statements of advice are you producing in a month now, and how many were you doing before?"], ["00:00:27", "Olivia Hart", "Before the acquisition, about thirty a month. Now it's closer to fifty-five and the paraplanning team is still four people."], ["00:00:49", "Sam Whitfield", "Which of those steps takes the longest?"]],
  [["00:00:15", "Sam Whitfield", "Felix, what happens to a loan file between credit approval and the documents going out?"], ["00:00:24", "Felix Morgan", "It sits with two analysts who rebuild the facility letter by hand, and broker season starts in six weeks."], ["00:00:41", "Sam Whitfield", "Who checks it before it leaves?"]],
];

/* Forwarded emails: header lines, a blank line, then the body. */
const EMAIL_SAMPLES: string[][] = [
  ["From: Olivia Hart <olivia@fairfieldwealth.example>", "To: Sam Whitfield <sam@eleno.example>", "Subject: Source logging and next steps", "Date: Sat 12 Sept 2026 10:12", "", "Hi Sam,", "", "Our compliance manager wants to see how the drafting assistant records every source it relies on before we roll it out to the advisers. Could you send the recommended first phase, timing, and who you need from our side?"],
  ["From: Felix Morgan <felix@kestrellending.example>", "To: Sam Whitfield <sam@eleno.example>", "Subject: Facility letter drafting before broker season", "Date: Tue 8 Sept 2026 08:31", "", "Hi Sam,", "", "Our head of risk wants the redrafted facility letter side by side with the original before we commit. We are 64 people and the season starts in six weeks. What does the discovery phase involve, and roughly what should a lender our size expect?"],
];

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
const TOKS = SAMPLES.map(toTokens);
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
