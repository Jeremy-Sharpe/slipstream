// Three Harbourline IT email threads, shaped like ApiEmailRecord
// (docs/api-shapes.ts): ordered messages with direction, sender, recipients,
// subject, body and occurred_at. Extraction points at a message index
// (`evidence_ref`); turns mirror the messages so citations work like a call.
import type { CallRecord, EmailMessage, EmailParty, Turn } from "./types";

const SAM: EmailParty = { name: "Sam Whitfield", email: "sam@harbourlineit.example" };

type Draft = Omit<EmailMessage, "i" | "sender" | "recipients" | "direction"> & { from: EmailParty; to: EmailParty };

/** Fills in indices, direction and recipients from who wrote to whom. */
function thread(msgs: Draft[]): EmailMessage[] {
  return msgs.map(({ from, to, ...m }, i) => ({
    i,
    direction: from.email === SAM.email ? "outbound" : "inbound",
    sender: from,
    recipients: [{ ...to, kind: "to" }],
    ...m,
  }));
}

/** One turn per message so the summary, citations and highlights address messages the way they address turns. */
export function turnsOf(messages: EmailMessage[]): Turn[] {
  return messages.map((m) => ({ i: m.i, speaker: m.direction === "outbound" ? "rep" : "prospect", name: m.sender.name ?? m.sender.email, text: m.body, t: m.i }));
}

const daniel: EmailParty = { name: "Daniel Ortiz", email: "daniel@kiteandco.example" };
const kite = thread([
  {
    from: daniel, to: SAM,
    subject: "Procurement security questionnaire",
    occurred_at: "2026-09-03T10:12:00+10:00",
    body: "Hi Sam,\n\nThanks for yesterday. Procurement has come back with their supplier security questionnaire and it is longer than I expected, 41 questions across data handling, access control, incident response and insurance. They want it completed before they will add Harbourline to the shortlist for the panel review.\n\nI have attached it. Are you able to turn it around by the end of next week? The pack you mentioned on the call would cover a fair bit of it, but they want the answers in their format.\n\nDaniel",
  },
  {
    from: SAM, to: daniel,
    subject: "Re: Procurement security questionnaire",
    occurred_at: "2026-09-03T14:40:00+10:00",
    body: "Hi Daniel,\n\nNo problem, that is a normal ask for a firm your size. I will complete the questionnaire in their format and send it back by Wednesday the 9th, with our insurance certificates, data handling summary and incident response outline attached so procurement has everything in one place.\n\nOne question so I answer it the way they expect: is the questionnaire assessed by procurement alone, or does it go to the partners' risk committee as well? That changes how much detail I put into the incident response section.\n\nSam",
  },
  {
    from: daniel, to: SAM,
    subject: "Re: Procurement security questionnaire",
    occurred_at: "2026-09-04T09:05:00+10:00",
    body: "Hi Sam,\n\nWednesday works. It goes to procurement first, then the risk committee sees a summary if we make the shortlist. The level of detail you described is fine.\n\nOne thing to flag: the panel review has moved to the October partners' meeting, so nothing will be decided before then. The incumbent knows about the process and is still supporting us in the meantime.\n\nDaniel",
  },
]);

const olivia: EmailParty = { name: "Olivia Hart", email: "olivia@wattlestreetlegal.example" };
const wattle = thread([
  {
    from: olivia, to: SAM,
    subject: "Handover timing",
    occurred_at: "2026-09-08T08:31:00+10:00",
    body: "Hi Sam,\n\nQuick one. Our IT coordinator's last day is now the 26th, not the end of the month, as he has leave to take. The principal has signed off on the transition plan and the fixed quote you sent through, $59,600 for the first year all in, so we would like to start the shadow handover next week rather than the week after.\n\nCan you confirm the onboarding dates and send the agreement across so I can get it signed this week?\n\nOlivia",
  },
  {
    from: SAM, to: olivia,
    subject: "Re: Handover timing",
    occurred_at: "2026-09-08T09:47:00+10:00",
    body: "Hi Olivia,\n\nThat is good news, thank you. Bringing the start forward is fine. I will move the shadow handover to Monday the 14th so we get two full weeks alongside your coordinator before the 26th, and I will send the agreement and the onboarding schedule through by close of business today.\n\nI have also added the leaver checklist so nothing walks out the door with him, and locked in the after-hours file migration window for the weekend of the 19th.\n\nDoes the principal want to be on the kickoff call, or is it just you and the coordinator?\n\nSam",
  },
]);

const hannah: EmailParty = { name: "Hannah Lee", email: "hannah@brunswickdental.example" };
const brunswick = thread([
  {
    from: hannah, to: SAM,
    subject: "Essential Eight evidence for our insurer",
    occurred_at: "2026-09-12T08:52:00+10:00",
    body: "Hi Sam,\n\nYou were recommended by Aisha Rahman at Port Phillip Physio. We are a dental group with three practices in Brunswick, Coburg and Preston, about 41 staff in total.\n\nOur cyber insurance renewal is due at the end of October and the broker has asked for evidence of Essential Eight controls before they will quote, after a phishing scare we had in August. Our current IT support is a sole trader who is good with the practice software but has not been able to give us anything the insurer will accept.\n\nCould you let me know what is involved in getting that evidence together, and roughly what a group our size should expect to pay?\n\nHannah Lee\nOperations Manager, Brunswick Dental Group",
  },
  {
    from: SAM, to: hannah,
    subject: "Re: Essential Eight evidence for our insurer",
    occurred_at: "2026-09-12T11:20:00+10:00",
    body: "Hi Hannah,\n\nThanks for reaching out, and please pass on my thanks to Aisha. We did exactly this for Port Phillip Physio in August, so I can be fairly specific.\n\nThe short version: the insurer wants to see multi-factor authentication on email and remote access, tested backups, admin accounts separated from everyday accounts, and a patching record. We run a two-week assessment across your three sites, close the gaps, and hand you an evidence pack written for the broker. I will send the assessment outline and a sample evidence pack ahead of a call.\n\nA couple of questions so I can give you a real number rather than a range: are the three practices on the same practice management system, and who currently holds the admin passwords?\n\nWould Tuesday or Wednesday next week suit for a 30 minute call?\n\nSam",
  },
]);

const f = <T,>(value: T, confidence: number, ref: number | null) => ({ value, confidence, span: ref, evidence_ref: ref });

export const emails: CallRecord[] = [
  {
    id: "email-01-kite-and-co",
    kind: "email",
    contact: "Daniel Ortiz",
    title: "Operations Lead",
    email: daniel.email,
    company: "Kite & Co",
    industry: "Commercial law firm",
    headcount: 95,
    location: "Melbourne CBD, VIC",
    rep: "Sam Whitfield",
    at: kite[kite.length - 1].occurred_at,
    duration: 0,
    outcome: "stalled",
    valueAud: 132000,
    trigger: "Procurement security questionnaire before panel appointment",
    turns: turnsOf(kite),
    messages: kite,
    fields: {
      contact: f("Daniel Ortiz", 0.97, 0),
      company: f("Kite & Co", 0.95, 0),
      stage: f("evaluation", 0.92, 2),
      value: f(null, 0.86, null),
      next_step: f("Sam to return the completed questionnaire, certificates and incident response outline by Wednesday 9 September.", 0.98, 1),
      promises: f(["I will complete the questionnaire in their format and send it back by Wednesday the 9th", "I will attach our insurance certificates, data handling summary and incident response outline"], 0.96, 1),
    },
    scorecard: { discovery: 1, nextStepSecured: true, objection: "partial", talkRatio: 0.41, askedRightQuestions: true, responseTime: "4h 28m", spans: { discovery: 1, nextStep: 1, objection: 2 } },
    objections: [{ text: "The panel review has moved to the October partners' meeting, so nothing will be decided before then", handling: "partial" }],
    icp: { industry: "Commercial law firm", headcount_band: "81-120", role: "Operations Lead", trigger: "Procurement security questionnaire before panel appointment" },
    riskFlags: [],
    draft: {
      subject: "Re: Procurement security questionnaire",
      body: "Hi Daniel,\n\nThanks, understood on October. The questionnaire, certificates and the incident response outline will be with you by Wednesday the 9th as promised, so procurement can finish their part well before the partners meet.\n\nIf it would help the shortlist conversation, I am happy to put together a one-page summary for the risk committee that they can read in five minutes. No pressure on timing from our side.\n\nSam",
    },
  },
  {
    id: "email-02-wattle-street-legal",
    kind: "email",
    contact: "Olivia Hart",
    title: "Practice Manager",
    email: olivia.email,
    company: "Wattle Street Legal",
    industry: "Family law firm",
    headcount: 37,
    location: "Hawthorn, VIC",
    rep: "Sam Whitfield",
    at: wattle[wattle.length - 1].occurred_at,
    duration: 0,
    outcome: "won",
    valueAud: 59600,
    trigger: "Outgoing internal IT coordinator leaving in three weeks",
    turns: turnsOf(wattle),
    messages: wattle,
    fields: {
      contact: f("Olivia Hart", 0.98, 0),
      company: f("Wattle Street Legal", 0.96, 0),
      stage: f("closed_won", 0.93, 0),
      value: f(59600, 0.9, 0),
      next_step: f("Shadow handover starts Monday 14 September. Sam to send the agreement and onboarding schedule today.", 0.97, 1),
      promises: f(["I will move the shadow handover to Monday the 14th", "I will send the agreement and the onboarding schedule by close of business today", "I have added the leaver checklist and locked in the file migration window for the 19th"], 0.95, 1),
    },
    scorecard: { discovery: 1, nextStepSecured: true, objection: "none_raised", talkRatio: 0.55, askedRightQuestions: true, responseTime: "1h 16m", spans: { discovery: 1, nextStep: 1, objection: null } },
    objections: [],
    icp: { industry: "Family law firm", headcount_band: "25-80", role: "Practice Manager", trigger: "Outgoing internal IT coordinator leaving in three weeks" },
    riskFlags: [],
    draft: {
      subject: "Re: Handover timing",
      body: "Hi Olivia,\n\nAs promised, the agreement and onboarding schedule are attached. Shadow handover starts Monday the 14th, file migration is locked in for the weekend of the 19th, and the leaver checklist is in the schedule so you can tick it off with your coordinator before the 26th.\n\nOnce the agreement is signed I will send calendar invites for the kickoff and the two check-ins.\n\nSam",
    },
  },
  {
    id: "email-03-brunswick-dental-group",
    kind: "email",
    contact: "Hannah Lee",
    title: "Operations Manager",
    email: hannah.email,
    company: "Brunswick Dental Group",
    industry: "Dental group",
    headcount: 41,
    location: "Brunswick, VIC",
    rep: "Sam Whitfield",
    at: brunswick[brunswick.length - 1].occurred_at,
    duration: 0,
    outcome: "open",
    valueAud: null,
    trigger: "Cyber insurance renewal requiring Essential Eight evidence",
    turns: turnsOf(brunswick),
    messages: brunswick,
    fields: {
      contact: f("Hannah Lee", 0.98, 0),
      company: f("Brunswick Dental Group", 0.97, 0),
      stage: f("discovery", 0.9, 1),
      value: f(null, 0.86, null),
      next_step: f("Sam proposed a 30 minute call Tuesday or Wednesday next week. Waiting on Hannah.", 0.9, 1),
      promises: f(["I will send the assessment outline and a sample evidence pack ahead of a call"], 0.94, 1),
    },
    scorecard: { discovery: 2, nextStepSecured: false, objection: "none_raised", talkRatio: 0.52, askedRightQuestions: true, responseTime: "2h 28m", spans: { discovery: 1, nextStep: 1, objection: null } },
    objections: [],
    icp: { industry: "Dental group", headcount_band: "25-80", role: "Operations Manager", trigger: "Cyber insurance renewal requiring Essential Eight evidence" },
    riskFlags: [],
    draft: {
      subject: "Re: Essential Eight evidence for our insurer",
      body: "Hi Hannah,\n\nAs promised, the assessment outline and a sample evidence pack are attached, with the client name removed. The pack is what Port Phillip Physio's broker accepted in August, so it is a fair picture of what yours would look like.\n\nIf Tuesday at 10am or Wednesday at 2pm suits for the call, I will send an invite. Happy to include your current IT support if that makes the handover easier later.\n\nSam",
    },
  },
];
