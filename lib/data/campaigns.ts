import { leads } from "@/lib/data/leads";
import type { Lead } from "@/lib/types";
import type { Campaign, CampaignPerson, PersonCopy, SequenceStep } from "@/lib/types/campaigns";

// Campaigns are built from the lead drafts. The lead draft is step 1; steps 2
// and 3 are short follow-ups rendered per person. Replaced by API reads later.

const BASE = new Date("2026-09-12T09:00:00+10:00");
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const defaultSteps: SequenceStep[] = [
  { id: "s1", channel: "email", delayDays: 0, subject: "{{subject}}", body: "Personalised first note from the closest won call. Two short paragraphs, one concrete example, one ask." },
  { id: "s2", channel: "email", delayDays: 3, subject: "Re: {{subject}}", body: "A two-line nudge: one thing the comparable client saw, and the same fifteen-minute ask." },
  { id: "s3", channel: "linkedin", delayDays: 4, body: "Short connection note that references the email and offers to share the plan we used." },
];

const first = (name: string) => name.split(" ")[0];

function copyFor(lead: Lead): PersonCopy[] {
  const evidence = lead.match_evidence[0]?.call_label.split(" — ")[0] ?? "a firm like yours";
  const subject = lead.draft?.subject ?? `An automation build for ${lead.company}`;
  const body = lead.draft?.body ?? `Hi ${first(lead.person)},\n\nWe build document and reporting agents for ${lead.title.toLowerCase()}-led firms around ${lead.location.split(",")[0]}, and ${evidence} is a close match to ${lead.company}. It runs in their own systems and the IP transferred to them at handover. Happy to share what that looked like if it is useful.\n\nSam`;
  return [
    { subject, body },
    { subject: `Re: ${subject}`, body: `Hi ${first(lead.person)},\n\nOne thing ${evidence} noticed in the first month: the drafting queue stopped being the bottleneck, and the team reviewed work instead of assembling it.\n\nStill happy to do fifteen minutes if the timing works.\n\nSam` },
    { body: `Hi ${first(lead.person)}, I sent a note about the drafting workload at ${lead.company} last week. ${evidence} is a similar setup to yours; happy to share the scope we used if it helps.` },
  ];
}

function person(lead: Lead, i: number, campaignStart: Date, paused = false): CampaignPerson {
  const approved = lead.draft?.status === "approved" || lead.status === "approved";
  const step = approved ? 2 : 1;
  return {
    id: `${lead.id}`,
    leadId: lead.id,
    name: lead.person,
    company: lead.company,
    title: lead.title,
    step,
    status: paused ? "paused" : approved ? "approved" : "pending",
    nextAction: iso(addDays(campaignStart, (approved ? 3 : 0) + (i % 3))),
    copy: copyFor(lead),
  };
}

const hasTrigger = (l: Lead, needle: string) => l.match_evidence.some((e) => `${e.attribute} ${e.value}`.toLowerCase().includes(needle));

const draftingBacklog = leads.filter((l) => hasTrigger(l, "backlog") || hasTrigger(l, "document")).slice(0, 4);
const leaseReporting = leads.filter((l) => hasTrigger(l, "lease") || hasTrigger(l, "reporting")).slice(0, 3);
const fallback = (picked: Lead[], n: number) => (picked.length >= n ? picked : [...picked, ...leads.filter((l) => !picked.includes(l))].slice(0, n));

export const campaigns: Campaign[] = [
  {
    id: "eleno-outreach-icp-v3",
    name: "Eleno outreach — ICP v3",
    status: "active",
    owner: "Sam",
    source: "Leads — ICP v3",
    updatedMinutesAgo: 12,
    steps: defaultSteps,
    people: leads.map((l, i) => person(l, i, BASE)),
    log: [
      { at: "2026-09-11T16:20:00+10:00", text: "Campaign created from Leads — ICP v3" },
      { at: "2026-09-11T16:24:00+10:00", text: "12 sequences drafted from the closest won calls" },
      { at: "2026-09-12T08:41:00+10:00", text: "Sam approved 1 person · nothing is sent" },
    ],
  },
  {
    id: "drafting-backlog-q4",
    name: "Drafting backlog — Q4",
    status: "draft",
    owner: "Jordan",
    source: "Leads — ICP v3",
    updatedMinutesAgo: 95,
    steps: defaultSteps,
    people: fallback(draftingBacklog, 4).map((l, i) => ({ ...person(l, i, addDays(BASE, 7)), status: "pending" as const, step: 1 })),
    log: [{ at: "2026-09-12T07:30:00+10:00", text: "Campaign created by Jordan" }],
  },
  {
    id: "lease-and-reporting-follow-ups",
    name: "Lease and reporting follow-ups",
    status: "paused",
    owner: "Sam",
    source: "Won deals",
    updatedMinutesAgo: 1440,
    steps: defaultSteps.slice(0, 2),
    people: fallback(leaseReporting, 3).map((l, i) => person(l, i, addDays(BASE, -5), true)),
    log: [
      { at: "2026-09-07T10:00:00+10:00", text: "Campaign created from Won deals" },
      { at: "2026-09-11T09:15:00+10:00", text: "Paused by Sam" },
    ],
  },
];
