import type { Intelligence } from "@/lib/types/intelligence";

// Every number here is computed from fixtures/calls/*/expected.json over the
// twelve history calls (call-01 to call-12). The voiced demo call (call-13) is
// excluded from training figures. Recompute if the fixtures change.

const c = (id: string, company: string) => ({ id, company });

const northstar = c("call-01-northstar-labs", "Northstar Labs");
const kestrel = c("call-02-kestrel-lending", "Kestrel Lending");
const afterglow = c("call-03-afterglow-studio", "Afterglow Studio");
const kite = c("call-04-kite-and-co", "Kite & Co");
const craftwork = c("call-05-craftwork", "Craftwork");
const meridian = c("call-06-meridian-mutual", "Meridian Mutual");
const fairfield = c("call-07-fairfield-wealth", "Fairfield Wealth Partners");
const ridgeline = c("call-08-ridgeline-commercial", "Ridgeline Commercial");
const bellbird = c("call-09-bellbird-auctions", "Bellbird Auctions");
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
      wins: { value: "6.0 avg", share: 1 },
      others: { value: "2.4 avg", share: 2.4 / 6 },
      takeaway: "The three lost calls asked zero questions before quoting a build price.",
    },
    {
      label: "Objection handled",
      wins: { value: "5 / 5 handled", share: 1 },
      others: { value: "3 / 7 partial, 4 ignored", share: 3 / 14 },
      takeaway: "Handling means naming the risk and offering a plan, not moving on.",
    },
    {
      label: "Rep talk ratio",
      wins: { value: "45%", share: 0.45 },
      others: { value: "57%", share: 0.57 },
      takeaway: "Wins sit under half. The lost calls were 67% rep talk.",
    },
  ],

  icp: {
    summary: "Investment research, lending, advice, commercial property and auction businesses in Victoria with 25–80 staff, a document or reporting workflow buckling under volume, and the workflow owner on the call.",
    attributes: [
      {
        label: "Industry",
        value: "Investment research, lending, wealth advice, commercial property and auctions",
        evidence: [northstar, kestrel, fairfield, ridgeline, bellbird],
      },
      {
        label: "Company size",
        value: "25–80 staff",
        evidence: [northstar, kestrel, fairfield, ridgeline, bellbird],
      },
      {
        label: "Champion title",
        value: "Managing partner, head of credit operations, practice manager, director or general manager",
        evidence: [fairfield, kestrel, bellbird, ridgeline, northstar],
      },
      {
        label: "Buying trigger",
        value: "A drafting, reporting or intake backlog created by a fund launch, an acquisition, a season or a volume step-up",
        evidence: [northstar, bellbird, kestrel, ridgeline, fairfield],
      },
    ],
  },

  objections: [
    { call: northstar, outcome: "won", handling: "handled", text: "we don't want another subscription sitting on the books" },
    { call: kestrel, outcome: "won", handling: "handled", text: "we'd be buying a tool we then depend on you to run for the next five years" },
    { call: fairfield, outcome: "won", handling: "handled", text: "Our compliance manager will want to see how it logs its sources before any adviser is allowed to use it" },
    { call: ridgeline, outcome: "won", handling: "handled", text: "If it quietly guesses a rent review mechanism and gets it wrong, that is worse than the analyst typing it" },
    { call: bellbird, outcome: "won", handling: "handled", text: "We do not want another subscription that we can never switch off" },
    { call: kite, outcome: "stalled", handling: "partial", text: "That number has to go to the partnership, and they will not approve it before they have seen the pilot work on our own leases" },
    { call: meridian, outcome: "stalled", handling: "partial", text: "Budget sits with the board in the new financial year, not with me this month" },
    { call: banksia, outcome: "stalled", handling: "partial", text: "The directors will not sign anything until the fit-out budget is settled" },
    { call: afterglow, outcome: "lost", handling: "ignored", text: "We do not have the volume to justify a build like that" },
    { call: afterglow, outcome: "lost", handling: "ignored", text: "That is more than we spent on our entire software stack last year" },
    { call: craftwork, outcome: "lost", handling: "ignored", text: "My daughter built us a booking spreadsheet that does most of this" },
    { call: lumen, outcome: "lost", handling: "ignored", text: "We are comparing you to a freelancer who set up our stock alerts for a few hundred dollars" },
  ],

  talkRatios: [
    { call: kestrel, outcome: "won", rep: "Sam Whitfield", ratio: 0.43 },
    { call: northstar, outcome: "won", rep: "Sam Whitfield", ratio: 0.44 },
    { call: kite, outcome: "stalled", rep: "Sam Whitfield", ratio: 0.44 },
    { call: bellbird, outcome: "won", rep: "Jordan Lee", ratio: 0.44 },
    { call: banksia, outcome: "stalled", rep: "Sam Whitfield", ratio: 0.44 },
    { call: meridian, outcome: "stalled", rep: "Jordan Lee", ratio: 0.45 },
    { call: ridgeline, outcome: "won", rep: "Sam Whitfield", ratio: 0.47 },
    { call: fairfield, outcome: "won", rep: "Sam Whitfield", ratio: 0.48 },
    { call: dockside, outcome: "no_show", rep: "Jordan Lee", ratio: 0.63 },
    { call: lumen, outcome: "lost", rep: "Jordan Lee", ratio: 0.65 },
    { call: afterglow, outcome: "lost", rep: "Jordan Lee", ratio: 0.66 },
    { call: craftwork, outcome: "lost", rep: "Jordan Lee", ratio: 0.69 },
  ],

  nextSteps: [
    { call: northstar, outcome: "won", description: "Sam to send the discovery phase scope, measurement plan and two redrafted research notes, then walk Maya and her co-founder through the research note drafting pilot scope.", due: "2026-09-03" },
    { call: kestrel, outcome: "won", description: "Sam to send the discovery phase scope, a redrafted facility letter and the measurement plan, then review them with Felix and the head of risk.", due: "2026-09-10" },
    { call: fairfield, outcome: "won", description: "Sam to send scope, source logging design and fixed price, then walk both principals and the compliance manager through it.", due: "2026-09-10" },
    { call: ridgeline, outcome: "won", description: "Sam to send the discovery scope and fixed build price, then review the sample extraction with Ben and the head of property management.", due: "2026-09-11" },
    { call: bellbird, outcome: "won", description: "Jordan to send the discovery scope and build proposal, then meet Aisha and the managing director to walk it through.", due: "2026-09-10" },
    { call: kite, outcome: "stalled", description: "Sam to send a one-page discovery phase scope and a sample lease summary for Daniel to put in front of the managing partner, with no date agreed.", due: null },
    { call: meridian, outcome: "stalled", description: "Jordan to send a decision brief and staging plan for Tom to circulate to the chief operating officer and the board.", due: null },
    { call: banksia, outcome: "stalled", description: "Sam to send the findings note and fee proposal workflow map for Grace to raise with the directors once the fit-out budget is settled.", due: null },
    { call: afterglow, outcome: "lost", description: "No next step agreed.", due: null },
    { call: craftwork, outcome: "lost", description: "No next step agreed.", due: null },
    { call: lumen, outcome: "lost", description: "No next step agreed.", due: null },
    { call: dockside, outcome: "no_show", description: "Reschedule message left with reception.", due: null },
  ],

  triggers: [
    { label: "Drafting backlog blowing out", count: 3, calls: [kestrel, fairfield, banksia] },
    { label: "Reporting or note production volume spike", count: 2, calls: [northstar, ridgeline] },
    { label: "Intake and cataloguing bottleneck before a season", count: 1, calls: [bellbird] },
    { label: "Complaints volume after a system migration", count: 1, calls: [meridian] },
    { label: "Contract review pilot before the financial year", count: 1, calls: [kite] },
    { label: "No trigger", count: 4, calls: [afterglow, craftwork, lumen, dockside] },
  ],
};
