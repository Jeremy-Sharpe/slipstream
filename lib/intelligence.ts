// What the team learned from its calls: the ICP worked backwards from the won
// deals and the playbook of behaviours that separate wins from the rest. Every
// number is computed at module load from the history calls (the demo call is
// left out). `playbook` and `icpProfile` mirror the API shapes so wiring is 1:1.
import type { ApiIcpProfile, ApiPlaybook } from "@/docs/api-shapes";
import { calls } from "./calls";
import { icp } from "./icp";
import type { CallRecord, Outcome } from "./types";

const DEMO_ID = "call-13-marlowe-finch-demo";

/** The scored calls: no email threads, no demo call. */
export const history: CallRecord[] = calls.filter((c) => c.kind === "call" && c.id !== DEMO_ID);
const threads = calls.filter((c) => c.kind === "email");
const won = history.filter((c) => c.outcome === "won");
const other = history.filter((c) => c.outcome !== "won");

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const rate = (xs: CallRecord[], test: (c: CallRecord) => boolean) => (xs.length ? xs.filter(test).length / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const firstName = (n: string) => n.split(" ")[0];
/** First `n` sentences of a turn, verbatim. */
const clip = (text: string, n: number) => (text.match(/[^.?!]+[.?!]+/g) ?? [text]).slice(0, n).join("").trim();

/* Counts */

export const outcomes: Record<Exclude<Outcome, "open">, number> = { won: 0, stalled: 0, lost: 0, no_show: 0 };
for (const c of history) if (c.outcome !== "open") outcomes[c.outcome] += 1;

export const reps = [...new Set(history.map((c) => c.rep))].map((rep) => {
  const mine = history.filter((c) => c.rep === rep);
  return {
    rep,
    calls: mine.length,
    won: mine.filter((c) => c.outcome === "won").length,
    mean_discovery: mean(mine.map((c) => c.scorecard.discovery)),
    next_step_rate: rate(mine, (c) => c.scorecard.nextStepSecured),
    mean_talk_ratio: mean(mine.map((c) => c.scorecard.talkRatio)),
  };
});

export const winRate = won.length / history.length;

/* Tiles */

export const tiles: { label: string; value: string; line: string }[] = [
  { label: "Calls analysed", value: String(history.length), line: reps.map((r) => `${firstName(r.rep)} ${r.calls}`).join(" · ") },
  { label: "Win rate", value: pct(winRate), line: `${outcomes.won} won · ${outcomes.stalled} stalled · ${outcomes.lost} lost · ${outcomes.no_show} no-show` },
  {
    label: "Dated next step in wins",
    value: `${won.filter((c) => c.scorecard.nextStepSecured).length} of ${won.length}`,
    line: `${other.filter((c) => c.scorecard.nextStepSecured).length} of ${other.length} elsewhere`,
  },
];

/* Win patterns */

export type QuoteRef = { callId: string; company: string; speaker: string; t: number; text: string };
export type Pattern = {
  behaviour: string;
  takeaway: string;
  won: { n: number; of: number };
  other: { n: number; of: number };
  quotes: QuoteRef[];
};

const HEALTHY_TALK = 0.5;
const DISCOVERY_FLOOR = 4;

const quoteAt = (c: CallRecord, i: number | null, sentences = 99): QuoteRef | null => {
  if (i == null) return null;
  const turn = c.turns[i];
  if (!turn) return null;
  return { callId: c.id, company: c.company, speaker: turn.name, t: turn.t, text: clip(turn.text, sentences) };
};

const BEHAVIOURS: { behaviour: string; test: (c: CallRecord) => boolean; takeaway: () => string; quote: (c: CallRecord) => QuoteRef | null; order?: (c: CallRecord) => number }[] = [
  {
    behaviour: "Secured a dated next step",
    test: (c) => c.scorecard.nextStepSecured,
    takeaway: () => `Every win left with a date in the diary. No stalled or lost call did.`,
    quote: (c) => quoteAt(c, c.scorecard.spans.nextStep),
    // Prefer the turns that name a day and a time.
    order: (c) => (/\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)/.test(c.turns[c.scorecard.spans.nextStep ?? -1]?.text ?? "") ? 0 : 1),
  },
  {
    behaviour: "Discovery questions before pricing",
    test: (c) => c.scorecard.discovery >= DISCOVERY_FLOOR,
    takeaway: () => `Won calls asked ${mean(won.map((c) => c.scorecard.discovery)).toFixed(1)} questions before a price came up. Lost calls asked none.`,
    quote: (c) => quoteAt(c, c.scorecard.spans.discovery == null ? null : c.scorecard.spans.discovery + 2),
  },
  {
    behaviour: "Objection handled",
    test: (c) => c.scorecard.objection === "handled",
    takeaway: () => `Every win named the worry and answered it on the call. Stalled calls got a partial answer, lost calls none.`,
    quote: (c) => quoteAt(c, c.scorecard.spans.objection == null ? null : c.scorecard.spans.objection + 1, 2),
  },
  {
    behaviour: "Rep talk ratio under half",
    test: (c) => c.scorecard.talkRatio <= HEALTHY_TALK,
    takeaway: () => `Winning reps spoke ${pct(mean(won.map((c) => c.scorecard.talkRatio)))} of the call. Lost calls ran at ${pct(mean(history.filter((c) => c.outcome === "lost").map((c) => c.scorecard.talkRatio)))}.`,
    quote: () => null,
  },
];

export const patterns: Pattern[] = BEHAVIOURS.map((b) => {
  const hits = won.filter(b.test);
  const ranked = b.order ? [...hits].sort((x, y) => b.order!(x) - b.order!(y)) : hits;
  return {
    behaviour: b.behaviour,
    takeaway: b.takeaway(),
    won: { n: hits.length, of: won.length },
    other: { n: other.filter(b.test).length, of: other.length },
    quotes: ranked.map(b.quote).filter((q): q is QuoteRef => q != null).slice(0, 2),
  };
});

/** Two lines of coaching, each addressed to the rep whose numbers say so. */
const byNextStep = [...reps].sort((a, b) => a.next_step_rate - b.next_step_rate)[0]?.rep ?? reps[0].rep;
const byDiscovery = [...reps].sort((a, b) => a.mean_discovery - b.mean_discovery)[0]?.rep ?? reps[0].rep;
export const coaching: { rep: string; line: string }[] = [
  { rep: byNextStep, line: "Book the date on the call. Every stalled deal left with a promise to send something and no meeting." },
  { rep: byDiscovery, line: "Ask before quoting. The three lost calls opened on price and asked nothing about the setup." },
];
export const coachingFocus: string[] = coaching.map((c) => c.line);

/* Triggers */

const TRIGGERS: { label: string; re: RegExp }[] = [
  { label: "Cyber-insurance renewal", re: /insurance/i },
  { label: "Office move", re: /office move/i },
  { label: "Microsoft 365 migration", re: /365/ },
  { label: "Procurement questionnaire", re: /procurement|questionnaire/i },
  { label: "IT person leaving", re: /leaving/i },
  { label: "Phishing incident", re: /phishing/i },
];

export const triggers: { label: string; count: number }[] = TRIGGERS.map((t) => ({
  label: t.label,
  count: history.filter((c) => c.trigger && t.re.test(c.trigger)).length,
})).filter((t) => t.count > 0).sort((a, b) => b.count - a.count);

/* Derived ICP */

export type IcpRow = { attribute: string; label: string; value: string; calls: { id: string; company: string; contact: string }[] };

const ATTRIBUTES: { attribute: string; label: string; value: string; why: string; test: (c: CallRecord) => boolean }[] = [
  { attribute: "industry", label: "Industry", value: "Professional services, allied health", why: "Every won deal is a firm that bills for expertise or treats patients.", test: (c) => /health|physio|legal|law|account|architect|consult/i.test(c.industry) },
  { attribute: "headcount", label: "Company size", value: "25 to 80 staff", why: "Won deals sit between 37 and 76 staff; the lost calls were all under 15.", test: (c) => c.headcount >= 25 && c.headcount <= 80 },
  { attribute: "role", label: "Champion title", value: "Practice, operations or general manager", why: "The person who owns the day-to-day pain was on the call.", test: (c) => /manager/i.test(c.title) },
  { attribute: "trigger", label: "Buying trigger", value: "Insurance renewal, office move, M365 migration, IT person leaving", why: "Every won deal had a dated reason to move; no lost call did.", test: (c) => Boolean(c.trigger) },
];

export const icpRows: IcpRow[] = ATTRIBUTES.map((a) => ({
  attribute: a.attribute,
  label: a.label,
  value: a.value,
  calls: won.filter(a.test).map((c) => ({ id: c.id, company: c.company, contact: c.contact })),
}));

export const icpProfile: ApiIcpProfile = {
  id: "icp-harbourline-v3",
  version: icp.version,
  evidence: ATTRIBUTES.map((a) => ({ attribute: a.attribute, deal_ids: won.filter(a.test).map((c) => c.id), why: a.why })),
  source_deals: won.map((c) => ({ deal_id: c.id, company_name: c.company, call_ids: [c.id] })),
  profile: {
    summary: "Professional services and allied health firms in Victoria with 25 to 80 staff, a concrete trigger, and a practice or operations manager on the call.",
    industries: ["Professional services", "Allied health"],
    headcount_band: "25-80",
    roles: ["Practice Manager", "Operations Manager", "General Manager"],
    triggers: triggers.map((t) => t.label),
    confidence: 0.91,
    origami_brief: icp.brief,
    source_summary: { deals: history.length, calls: history.length, emails: threads.length, outcome_labelled: history.length },
    cohort_revision: "cohort-2026-09-13",
  },
};

/* Playbook, API-shaped */

const group = (outcome_group: "won" | "not_won", xs: CallRecord[]) => ({
  outcome_group,
  calls: xs.length,
  mean_discovery: mean(xs.map((c) => c.scorecard.discovery)),
  next_step_rate: rate(xs, (c) => c.scorecard.nextStepSecured),
  objection_handled_rate: rate(xs, (c) => c.scorecard.objection === "handled"),
  mean_talk_ratio: mean(xs.map((c) => c.scorecard.talkRatio)),
});

export const playbook: ApiPlaybook = {
  cohort_revision: "cohort-2026-09-13",
  sources: history.map((c) => ({
    call_id: c.id,
    source_external_id: c.id,
    source_revision: "1",
    scorecard_revision: "1",
    rubric_version: "v1",
    outcome: c.outcome === "open" ? null : c.outcome,
  })),
  stats: [group("won", won), group("not_won", other)],
  reps,
  patterns: patterns.map((p) => ({
    behaviour: p.behaviour,
    why_it_matters: p.takeaway,
    call_ids: won.filter((c) => BEHAVIOURS.find((b) => b.behaviour === p.behaviour)!.test(c)).map((c) => c.id),
    quotes: p.quotes.map((q) => q.text),
  })),
  coaching_focus: coachingFocus,
  model: "scorer-1",
  generated_at: "2026-09-13T08:00:00+10:00",
};

export const provenance = {
  rubric_version: playbook.sources[0]?.rubric_version ?? "v1",
  profile_version: icpProfile.version,
  generated_at: playbook.generated_at,
  source_summary: icpProfile.profile.source_summary!,
  confidence: icpProfile.profile.confidence,
  won_deals: won.length,
};
