import type { CallRecord, Outcome, Turn } from "./types";
import { words, type Source, type Token } from "@/components/run/StreamingText";

const STOP = new Set(["the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "we", "our", "is", "are", "it", "that", "this", "with", "before", "before", "by"]);
const wordsOf = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => !STOP.has(w)) ?? []);

/** Best prospect turn for a phrase, by word overlap. */
export function findTurn(turns: Turn[], phrase: string | null | undefined): number | null {
  if (!phrase) return null;
  const q = wordsOf(phrase);
  let best = 0, at: number | null = null;
  turns.forEach((t) => {
    if (t.speaker !== "prospect") return;
    let n = 0;
    for (const w of wordsOf(t.text)) if (q.has(w)) n++;
    if (n > best) { best = n; at = t.i; }
  });
  return best >= 2 ? at : null;
}

const firstName = (n: string) => n.split(" ")[0];

/** Two-sentence summary with citations into the transcript. */
export function summaryTokens(call: CallRecord): { tokens: Token[]; sources: Source[]; followUps: string[] } {
  const f = firstName(call.contact);
  const trigger = findTurn(call.turns, call.trigger);
  const next = call.fields.next_step.span;
  const objection = call.scorecard.spans.objection;
  const o = call.objections[0]?.text;
  const lead: Record<Outcome, string> = {
    won: "Closed on the call.",
    stalled: "Interest is real, timing is not.",
    lost: "Not a fit right now.",
    no_show: "No conversation to summarise.",
    open: "Still open, waiting on the prospect.",
  };
  const tokens: Token[] = [
    ...words(lead[call.outcome]),
    ...words(`${f} (${call.title}, ${call.headcount} staff) ${call.trigger ? `is dealing with ${call.trigger.toLowerCase()}` : "was mostly curious and price-led"}`, trigger ?? undefined),
    ...(o ? words(`The sticking point: ${o.charAt(0).toLowerCase() + o.slice(1)}`, objection ?? undefined) : []),
    ...(call.fields.next_step.value ? words(`Next: ${call.fields.next_step.value}`, next ?? undefined) : []),
  ];
  const cited = [trigger, objection, next].filter((i): i is number => i != null);
  const sources: Source[] = [...new Set(cited)].map((i) => call.turns[i]).filter(Boolean).map((t) => ({ i: t.i, name: t.name, text: t.text, t: t.t, ...(call.kind === "email" ? { label: `Msg ${t.i + 1}` } : {}) }));
  const followUps = [
    "Draft the follow-up again, shorter",
    call.outcome === "won" ? "Why did this one close?" : call.outcome === "stalled" ? "Why did this one stall?" : "What would have changed the outcome?",
  ];
  return { tokens, sources, followUps };
}

export function whyTokens(call: CallRecord): { tokens: Token[]; sources: Source[] } {
  const s = call.scorecard;
  const parts: string[] = [];
  const email = call.kind === "email";
  parts.push(s.nextStepSecured ? `A dated next step was agreed ${email ? "in the thread" : "on the call"}.` : `No dated next step was agreed, which is the pattern in every stalled ${email ? "thread" : "call"}.`);
  if (email) parts.push(s.askedRightQuestions ? "The reply asked the right questions before quoting." : "The reply quoted before asking what it needed to.");
  else parts.push(`${s.discovery} discovery questions before pricing${s.discovery >= 5 ? ", above the winning average" : ", below the winning average of 5.6"}.`);
  if (call.objections[0]) parts.push(`The objection was ${s.objection.replace("_", " ")}.`);
  if (email) parts.push(s.responseTime ? `${call.rep.split(" ")[0]} replied in ${s.responseTime}.` : `${call.rep.split(" ")[0]} has not replied yet.`);
  else parts.push(`${call.rep.split(" ")[0]} spoke ${Math.round(s.talkRatio * 100)}% of the time.`);
  const cites = [s.spans.nextStep, s.spans.discovery, s.spans.objection];
  const tokens = parts.flatMap((p, i) => words(p, cites[i] ?? undefined));
  const sources = [...new Set(cites.filter((i): i is number => i != null))].map((i) => call.turns[i]).filter(Boolean).map((t) => ({ i: t.i, name: t.name, text: t.text, t: t.t, ...(email ? { label: `Msg ${t.i + 1}` } : {}) }));
  return { tokens, sources };
}
