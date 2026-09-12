import type { Intelligence } from "@/lib/types/intelligence";

// Every number here is computed from fixtures/calls/*/expected.json over the
// twelve history calls (call-01 to call-12). The voiced demo call (call-13) is
// excluded from training figures. Recompute if the fixtures change.

const c = (id: string, company: string) => ({ id, company });

const northstar = c("call-01-northstar-labs", "Northstar Labs");
const arcwell = c("call-02-arcwell-health", "Arcwell Health");
const afterglow = c("call-03-afterglow-studio", "Afterglow Studio");
const kite = c("call-04-kite-and-co", "Kite & Co");
const craftwork = c("call-05-craftwork", "Craftwork");
const meridian = c("call-06-meridian-ai", "Meridian AI");
const wattle = c("call-07-wattle-street-legal", "Wattle Street Legal");
const elm = c("call-08-elm-and-ledger-accounting", "Elm & Ledger Accounting");
const portPhillip = c("call-09-port-phillip-physio-group", "Port Phillip Physio Group");
const lumen = c("call-10-lumen-lane-retail", "Lumen Lane Retail");
const banksia = c("call-11-banksia-architects", "Banksia Architects");
const dockside = c("call-12-dockside-dental", "Dockside Dental");

export const intelligence: Intelligence = {
  callsAnalysed: 12,
  wonDeals: 5,
  icpVersion: 3,
  confidence: 91,

  tiles: [
    { label: "Calls analysed", value: "12", delta: "Sam 6 · Jordan 6 · last 14 days" },
    { label: "Win rate", value: "42%", delta: "5 won · 3 stalled · 3 lost · 1 no-show" },
    { label: "Dated next step in wins", value: "5 of 5", delta: "0 of 7 in calls that stalled or were lost" },
  ],

  // wins: calls 01, 02, 07, 08, 09 · others: 03, 04, 05, 06, 10, 11, 12
  lens: [
    {
      label: "Secured a dated next step",
      wins: { value: "5 / 5", share: 1 },
      others: { value: "0 / 7", share: 0 },
      takeaway: "Every win left the call with a date. Three stalled calls had a next step but no date.",
    },
    {
      label: "Discovery questions before pricing",
      wins: { value: "5.6 avg", share: 5.6 / 6 },
      others: { value: "2.1 avg", share: 2.1 / 6 },
      takeaway: "The three lost calls asked zero questions before quoting a price.",
    },
    {
      label: "Objection handled",
      wins: { value: "5 / 5 handled", share: 1 },
      others: { value: "3 / 7 partial, 3 ignored", share: 3 / 14 },
      takeaway: "Handling means naming the risk and offering a plan, not moving on.",
    },
    {
      label: "Rep talk ratio",
      wins: { value: "47%", share: 0.47 },
      others: { value: "56%", share: 0.56 },
      takeaway: "Wins sit under half. The lost calls were 61% rep talk.",
    },
  ],

  icp: {
    summary: "Professional services and allied health firms in Victoria with 25–80 staff, a concrete trigger, and a practice or operations manager on the call.",
    attributes: [
      {
        label: "Industry",
        value: "Professional services & allied health",
        evidence: [northstar, arcwell, wattle, elm, portPhillip],
      },
      {
        label: "Company size",
        value: "25–80 staff",
        evidence: [northstar, arcwell, wattle, elm, portPhillip],
      },
      {
        label: "Champion title",
        value: "Practice, operations or general manager; a director or partner",
        evidence: [wattle, arcwell, portPhillip, elm, northstar],
      },
      {
        label: "Buying trigger",
        value: "Cyber-insurance renewal, a phishing incident, an office move or an IT person leaving",
        evidence: [northstar, portPhillip, arcwell, elm, wattle],
      },
    ],
  },

  objections: [
    { call: northstar, outcome: "won", handling: "handled", text: "Our insurer is asking for Essential Eight evidence, and I am worried we will pay for a managed service but still fail the questionnaire" },
    { call: arcwell, outcome: "won", handling: "handled", text: "Data sovereignty is the thing our clinical director will ask about" },
    { call: wattle, outcome: "won", handling: "handled", text: "I am nervous about changing provider while our internal IT coordinator is leaving" },
    { call: elm, outcome: "won", handling: "handled", text: "We cannot have a messy migration in the middle of tax planning work" },
    { call: portPhillip, outcome: "won", handling: "handled", text: "Our current provider says they already do security, so I need to understand why this is different" },
    { call: kite, outcome: "stalled", handling: "partial", text: "Procurement will not let us progress without the full questionnaire and insurance certificates" },
    { call: meridian, outcome: "stalled", handling: "partial", text: "Budget sits with finance next financial year, not with me this month" },
    { call: banksia, outcome: "stalled", handling: "partial", text: "The directors will not approve anything until the new financial year budget is clearer" },
    { call: afterglow, outcome: "lost", handling: "ignored", text: "We are probably too small for a monthly managed service" },
    { call: afterglow, outcome: "lost", handling: "ignored", text: "That is more than double what we pay now" },
    { call: craftwork, outcome: "lost", handling: "ignored", text: "My cousin helps us for cheap when the till or Wi-Fi plays up" },
    { call: lumen, outcome: "lost", handling: "ignored", text: "We are comparing you to a break-fix provider who charges by the hour" },
  ],

  talkRatios: [
    { call: kite, outcome: "stalled", rep: "Sam Whitfield", ratio: 0.43 },
    { call: northstar, outcome: "won", rep: "Sam Whitfield", ratio: 0.44 },
    { call: arcwell, outcome: "won", rep: "Sam Whitfield", ratio: 0.46 },
    { call: elm, outcome: "won", rep: "Sam Whitfield", ratio: 0.47 },
    { call: banksia, outcome: "stalled", rep: "Sam Whitfield", ratio: 0.47 },
    { call: wattle, outcome: "won", rep: "Sam Whitfield", ratio: 0.48 },
    { call: portPhillip, outcome: "won", rep: "Jordan Lee", ratio: 0.5 },
    { call: meridian, outcome: "stalled", rep: "Jordan Lee", ratio: 0.51 },
    { call: afterglow, outcome: "lost", rep: "Jordan Lee", ratio: 0.61 },
    { call: craftwork, outcome: "lost", rep: "Jordan Lee", ratio: 0.61 },
    { call: lumen, outcome: "lost", rep: "Jordan Lee", ratio: 0.61 },
    { call: dockside, outcome: "no_show", rep: "Jordan Lee", ratio: 0.65 },
  ],

  nextSteps: [
    { call: northstar, outcome: "won", description: "Sam to send the Essential Eight gap summary and onboarding sequence, then meet Maya and the finance partner for proposal review.", due: "2026-09-03" },
    { call: arcwell, outcome: "won", description: "Sam to send proposal and meet Felix plus clinical director for rollout approval.", due: "2026-09-04" },
    { call: wattle, outcome: "won", description: "Sam to send transition plan and meet Olivia plus principal solicitor for sign-off.", due: "2026-09-08" },
    { call: elm, outcome: "won", description: "Sam to send migration proposal and run site walk-through with Ben and office manager.", due: "2026-09-09" },
    { call: portPhillip, outcome: "won", description: "Jordan to send proposal and meet Aisha plus clinic director for decision.", due: "2026-09-10" },
    { call: kite, outcome: "stalled", description: "Sam to send security pack and sample service schedule for Daniel to circulate.", due: null },
    { call: meridian, outcome: "stalled", description: "Jordan to send capability deck and rough migration outline for Tom to share internally.", due: null },
    { call: banksia, outcome: "stalled", description: "Sam to send findings note and risk checklist for Grace to discuss with directors.", due: null },
    { call: afterglow, outcome: "lost", description: "No next step agreed.", due: null },
    { call: craftwork, outcome: "lost", description: "No next step agreed.", due: null },
    { call: lumen, outcome: "lost", description: "No next step agreed.", due: null },
    { call: dockside, outcome: "no_show", description: "Reschedule message left with reception.", due: null },
  ],

  triggers: [
    { label: "Cyber-insurance renewal or evidence gap", count: 4, calls: [northstar, arcwell, portPhillip, banksia] },
    { label: "Office move", count: 2, calls: [elm, banksia] },
    { label: "Microsoft 365 migration", count: 2, calls: [meridian, elm] },
    { label: "Procurement security questionnaire", count: 1, calls: [kite] },
    { label: "Internal IT person leaving", count: 1, calls: [wattle] },
    { label: "Phishing incident", count: 1, calls: [arcwell] },
    { label: "No trigger", count: 4, calls: [afterglow, craftwork, lumen, dockside] },
  ],
};
