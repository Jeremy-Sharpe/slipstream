#!/usr/bin/env node

// Builds lib/data/calls.ts and lib/data/conversations.ts from fixtures/calls/*
// and fixtures/seller.json. Every derived field below is a rule, never a hand
// edit, so a fixture rewrite only needs `npm run generate:fixture-ui`.

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const callsRoot = path.join(root, "fixtures", "calls");

// Confidence is a function of how the value was grounded, not a guess:
// quoted verbatim in a turn, asserted by the labeller as a closed vocabulary
// (stage, outcome, amount, headcount), or inferred free text with no quote.
const GROUNDED = 0.96;
const LABELLED = 0.88;
const INFERRED = 0.82;

const OUTCOME_LEDE = {
  won: "Strong buying signal.",
  stalled: "Interest is real, timing is not.",
  lost: "Not a fit right now.",
  no_show: "No conversation happened.",
  open: "Call logged, outcome still open.",
};

const PREVIEW_MAX = 116;

async function readJson(...segments) {
  return JSON.parse(await readFile(path.join(...segments), "utf8"));
}

/** Same normalisation fixtures/validate.py uses to check verbatim quotes. */
function normalise(text) {
  return String(text).replace(/\s+/g, " ").trim().toLowerCase();
}

const WORD_CHAR = /[a-z0-9']/;

/** Substring match that will not find "won" inside "won't". */
function containsVerbatim(haystack, needle) {
  const startBounded = WORD_CHAR.test(needle[0]);
  const endBounded = WORD_CHAR.test(needle[needle.length - 1]);
  for (let from = 0; from <= haystack.length - needle.length; ) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return false;
    const before = at === 0 ? " " : haystack[at - 1];
    const after = haystack[at + needle.length] ?? " ";
    if ((!startBounded || !WORD_CHAR.test(before)) && (!endBounded || !WORD_CHAR.test(after))) return true;
    from = at + 1;
  }
  return false;
}

/** Turn index whose text contains one of the renderings verbatim, or null. */
function findSpan(turns, ...renderings) {
  const needles = renderings.map(normalise).filter(Boolean);
  if (needles.length === 0) return null;
  const index = turns.findIndex((turn) => {
    const text = normalise(turn.text);
    return needles.some((needle) => containsVerbatim(text, needle));
  });
  return index === -1 ? null : index;
}

/** How a deal value can appear in dialogue: 48600, 48,600, $48,600. */
function moneyRenderings(amount) {
  if (!amount) return [String(amount ?? "")];
  const grouped = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return [`$${grouped}`, grouped, String(amount)];
}

function extracted(turns, value, ungroundedConfidence, ...renderings) {
  const span = findSpan(turns, ...(renderings.length > 0 ? renderings : [value]));
  return { value, confidence: span === null ? ungroundedConfidence : GROUNDED, span };
}

/** A closed-vocabulary label the rep never says out loud, so never a quote. */
function labelled(value) {
  return { value, confidence: LABELLED, span: null };
}

function lowerFirst(text) {
  if (!text) return text;
  // Leave acronyms alone: only drop the case of a normal sentence opener.
  if (text.length > 1 && text[1] === text[1].toUpperCase() && text[1] !== text[1].toLowerCase()) return text;
  return text[0].toLowerCase() + text.slice(1);
}

function upperFirst(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

/** "I will send the scope by Thursday" -> "Send the scope by Thursday". */
function commitment(promise) {
  return upperFirst(promise.replace(/^\s*(?:i\s+will|i'll)\s+/i, "").trim());
}

/**
 * Turn start times, using the same words-per-turn split the API applies in
 * api/app/routers/calls.py::_fixture_transcript. The API scales that split by
 * the measured audio length where there is an mp3; here it is always scaled by
 * duration_target_seconds, which is the duration the header shows, so the last
 * turn can never land past the end of the call.
 */
function turnStarts(script) {
  const durationMs = Math.round(script.duration_target_seconds * 1000);
  const words = script.turns.map((turn) => Math.max(1, turn.text.trim().split(/\s+/).length));
  const total = words.reduce((sum, count) => sum + count, 0);
  const last = script.turns.length - 1;
  let cursor = 0;
  return script.turns.map((_turn, index) => {
    const start = Math.round(cursor / 1000);
    cursor = index === last ? durationMs : cursor + Math.round((durationMs * words[index]) / total);
    return start;
  });
}

/** Add seconds to an ISO timestamp, keeping its written UTC offset. */
function shiftIso(iso, seconds) {
  const offset = iso.slice(-6);
  const sign = offset.startsWith("-") ? -1 : 1;
  const offsetMinutes = sign * (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4, 6)));
  const shifted = new Date(Date.parse(iso) + seconds * 1000 + offsetMinutes * 60_000);
  return `${shifted.toISOString().slice(0, 19)}${offset}`;
}

function buildTurns(script) {
  const starts = turnStarts(script);
  return script.turns.map((turn, index) => ({
    index,
    speaker: turn.speaker,
    name: turn.name,
    text: turn.text,
    at: starts[index],
  }));
}

function buildExtraction(script, expected, turns) {
  const { contact, company, deal, promises, objections, next_step: nextStep } = expected.extraction;
  const promiseFields = promises.map((promise) => extracted(turns, promise, INFERRED));
  return {
    contact: {
      name: extracted(turns, contact.name, INFERRED),
      role: extracted(turns, contact.role, INFERRED),
      email: extracted(turns, contact.email, INFERRED),
      phone: extracted(turns, contact.phone, INFERRED),
    },
    company: {
      name: extracted(turns, company.name, INFERRED),
      industry: extracted(turns, company.industry, INFERRED),
      headcount: labelled(company.headcount),
      // Locations are said as the suburb, never with the state on the end.
      location: extracted(turns, company.location, INFERRED, company.location, company.location.split(",")[0]),
    },
    deal: {
      stage: labelled(deal.stage),
      // The only deal field ever said aloud, and only when the rep quotes a price.
      valueAud: extracted(turns, deal.value_aud, LABELLED, ...moneyRenderings(deal.value_aud)),
      outcome: labelled(deal.outcome),
    },
    promises: promiseFields,
    objections: objections.map((objection) => ({
      text: objection.text,
      handling: objection.handling,
      span: findSpan(turns, objection.text),
    })),
    // The next step is written by the labeller, never quoted, so it is anchored
    // to the last thing the rep committed to on the call.
    nextStep: nextStep
      ? {
          value: nextStep.description,
          confidence: LABELLED,
          span: promiseFields.at(-1)?.span ?? null,
        }
      : null,
    nextStepDue: nextStep?.due ?? null,
  };
}

/** First rep turn that ends in a question, which is where discovery starts. */
function discoverySpan(turns, asked) {
  if (asked <= 0) return null;
  const index = turns.findIndex((turn) => turn.speaker === "rep" && turn.text.trim().endsWith("?"));
  return index === -1 ? null : index;
}

function buildScorecard(expected, turns, extraction) {
  const scorecard = expected.scorecard;
  return {
    discoveryQuestions: {
      value: scorecard.discovery_questions,
      span: discoverySpan(turns, scorecard.discovery_questions),
    },
    nextStepSecured: { value: scorecard.next_step_secured, span: extraction.nextStep?.span ?? null },
    objectionHandling: {
      value: scorecard.objection_handling,
      span: extraction.objections[0]?.span ?? null,
    },
    talkRatio: scorecard.rep_talk_ratio,
    notes: scorecard.notes,
  };
}

function buildSummary(script, expected) {
  const lede = OUTCOME_LEDE[script.outcome] ?? OUTCOME_LEDE.open;
  const first = script.prospect.name.split(" ")[0];
  const detail = script.trigger
    ? `${first} (${script.prospect.role}, ${script.company.headcount} staff) is dealing with ${lowerFirst(script.trigger)}.`
    : expected.scorecard.notes;
  return `${lede} ${detail}`;
}

function buildDraft(script, extraction) {
  const first = script.prospect.name.split(" ")[0];
  const owed = extraction.promises.map((promise) => `- ${commitment(promise.value)}`);
  const lines = [`Hi ${first},`, ""];

  if (script.outcome === "lost") {
    lines.push("Thanks for being straight with me today. It sounds like the current setup is working for you, so I won't push.");
  } else if (script.outcome === "no_show") {
    lines.push("No problem about missing each other today, I know how these things go.");
  } else {
    lines.push("Thanks for the time today.");
    if (script.trigger) lines.push(`You mentioned ${lowerFirst(script.trigger)}; that's the part I'd focus on first.`);
  }

  if (owed.length > 0) lines.push("", "What I owe you:", ...owed);
  if (extraction.nextStep) lines.push("", `Next step: ${extraction.nextStep.value}`);

  if (script.outcome === "stalled") {
    lines.push("", "No rush on your side; when the timing is clearer I'm happy to walk the decision makers through it.");
  } else if (script.outcome === "lost") {
    lines.push("", "If that changes, send me a note and I'll pick it up from there.");
  } else if (script.outcome === "no_show") {
    lines.push("", "Send me a couple of times that suit and I'll lock one in.");
  }

  lines.push("", script.rep);
  return { subject: `Next steps — ${script.company.name}`, body: lines.join("\n") };
}

function buildTimeline(script) {
  // The pipeline runs once the call ends: transcript two minutes later, then
  // extraction and scorecard together, then the draft a minute after that.
  const transcribed = shiftIso(script.scheduled_at, script.duration_target_seconds + 120);
  const analysed = shiftIso(transcribed, 60);
  return [
    { title: "Call transcribed", meta: "Scribe · diarised", at: transcribed, icon: "call" },
    { title: "Fields extracted", meta: "Claude · awaiting approval", at: analysed, icon: "sparkles" },
    { title: "Scorecard computed", meta: "4 dimensions", at: analysed, icon: "gauge" },
    { title: "Follow-up drafted", meta: "Ready to review", at: shiftIso(analysed, 60), icon: "mail" },
  ];
}

function buildCall(script, expected) {
  const turns = buildTurns(script);
  const extraction = buildExtraction(script, expected, turns);
  return {
    id: script.call_id,
    rep: script.rep,
    prospect: script.prospect.name,
    company: script.company.name,
    domain: script.company.domain,
    at: script.scheduled_at,
    durationSeconds: script.duration_target_seconds,
    outcome: script.outcome,
    trigger: script.trigger ?? null,
    summary: buildSummary(script, expected),
    turns,
    extraction,
    scorecard: buildScorecard(expected, turns, extraction),
    icpSignals: {
      industry: expected.icp_signals.industry,
      headcountBand: expected.icp_signals.headcount_band,
      role: expected.icp_signals.role,
      trigger: expected.icp_signals.trigger ?? null,
    },
    // Fixture risk flags are 1-based turn numbers; UI turns are 0-based.
    riskFlags: expected.risk_flags.map((flag) => ({
      turnIndex: flag.turn_index - 1,
      text: flag.text,
      kind: flag.kind,
    })),
    draft: buildDraft(script, extraction),
    timeline: buildTimeline(script),
  };
}

function buildPreview(script) {
  const turn = script.turns.find((item) => item.speaker === "prospect") ?? script.turns[0];
  const text = turn.text.replace(/\s+/g, " ").trim();
  if (text.length <= PREVIEW_MAX) return text;
  const words = text.split(" ");
  let preview = "";
  for (const word of words) {
    const next = preview ? `${preview} ${word}` : word;
    if (next.length > PREVIEW_MAX - 1) break;
    preview = next;
  }
  return `${preview || text.slice(0, PREVIEW_MAX - 1)}…`;
}

/** Where the conversation sits in the pipeline the demo walks through. */
function conversationStatus(script) {
  if (script.demo) return "processing";
  if (script.outcome === "stalled") return "needs_review";
  if (script.outcome === "won") return "action_ready";
  return "synced";
}

function buildConversation(script) {
  return {
    id: script.call_id,
    kind: "call",
    contact: script.prospect.name,
    title: script.prospect.role,
    company: script.company.name,
    industry: script.company.industry,
    headcount: script.company.headcount,
    location: script.company.location,
    rep: script.rep,
    at: script.scheduled_at,
    durationSeconds: script.duration_target_seconds,
    outcome: script.outcome,
    ...(script.deal_value_aud === null || script.deal_value_aud === undefined ? {} : { valueAud: script.deal_value_aud }),
    ...(script.trigger ? { trigger: script.trigger } : {}),
    preview: buildPreview(script),
    status: conversationStatus(script),
  };
}

function renderCallsFile(calls) {
  return `import type { CallRecord } from "@/lib/types/calls";

// GENERATED FILE — do not edit by hand.
// Written by scripts/generate-fixture-ui.mjs from fixtures/calls/*/{script,expected}.json
// and fixtures/seller.json. Run \`npm run generate:fixture-ui\` after any fixture change.
export const calls: CallRecord[] = ${JSON.stringify(calls, null, 1)};

export const callById = (id: string) => calls.find((c) => c.id === id);
`;
}

function renderConversationRow(conversation) {
  const fields = Object.entries(conversation).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return `  { ${fields.join(", ")} },`;
}

function renderConversationsFile(conversations, seller) {
  return `import type { Conversation } from "@/lib/types";
import { emailConversations } from "@/lib/data/emails";

// GENERATED FILE — do not edit by hand.
// Written by scripts/generate-fixture-ui.mjs from fixtures/calls/*/script.json.
// The ${conversations.length} ${seller.name} fixture calls, newest first, after the email threads.
// Run \`npm run generate:fixture-ui\` after any fixture change.
export const conversations: Conversation[] = [
  ...emailConversations,
${conversations.map(renderConversationRow).join("\n")}
];
`;
}

async function main() {
  const seller = await readJson(root, "fixtures", "seller.json");
  const entries = await readdir(callsRoot, { withFileTypes: true });
  const ids = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (ids.length === 0) throw new Error("No call fixtures found under fixtures/calls");

  const scripts = [];
  const calls = [];
  for (const id of ids) {
    const script = await readJson(callsRoot, id, "script.json");
    const expected = await readJson(callsRoot, id, "expected.json");
    if (script.call_id !== id) throw new Error(`${id}/script.json has call_id ${script.call_id}`);
    if (expected.call_id !== id) throw new Error(`${id}/expected.json has call_id ${expected.call_id}`);
    scripts.push(script);
    calls.push(buildCall(script, expected));
  }

  const conversations = [...scripts]
    .sort((left, right) => right.scheduled_at.localeCompare(left.scheduled_at) || right.call_id.localeCompare(left.call_id))
    .map(buildConversation);

  await writeFile(path.join(root, "lib/data/calls.ts"), renderCallsFile(calls), "utf8");
  await writeFile(path.join(root, "lib/data/conversations.ts"), renderConversationsFile(conversations, seller), "utf8");
  process.stdout.write(`Generated lib/data/calls.ts (${calls.length} calls) and lib/data/conversations.ts\n`);
}

await main();
