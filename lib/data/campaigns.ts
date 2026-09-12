import { leads } from "@/lib/data/leads";
import type { Lead } from "@/lib/types";
import type { Campaign, CampaignPerson, PersonCopy, SequenceStep } from "@/lib/types/campaigns";

// Campaigns are built from the lead drafts. The lead draft is step 1; steps 2
// and 3 are short follow-ups rendered per person. Replaced by API reads later.

const BASE = new Date("2026-09-12T09:00:00+10:00");
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const defaultSteps: SequenceStep[] = [
  { id: "s1", channel: "email", delayDays: 0, subject: "{{trigger}} at {{company}}", body: "Hi {{first_name}},\n\nWe spoke with {{similar_client}} about the same {{trigger}} a few weeks ago. {{one_thing_they_saw}}\n\nWorth fifteen minutes this week?\n\nSam" },
  { id: "s2", channel: "email", delayDays: 3, subject: "Re: {{trigger}} at {{company}}", body: "Hi {{first_name}},\n\nOne thing {{similar_client}} noticed in the first month: {{one_thing_they_saw}}\n\nStill happy to do fifteen minutes if the timing works.\n\nSam" },
  { id: "s3", channel: "linkedin", delayDays: 4, body: "Hi {{first_name}}, following up on my note about {{trigger}}. Happy to share the plan we used with {{similar_client}}." },
];

const first = (name: string) => name.split(" ")[0];

function copyFor(lead: Lead): PersonCopy[] {
  const evidence = lead.match_evidence[0]?.call_label.split(" — ")[0] ?? "a practice like yours";
  const subject = lead.draft?.subject ?? `Managed IT for ${lead.company}`;
  const body = lead.draft?.body ?? `Hi ${first(lead.person)},\n\nWe look after IT for a few ${lead.title.toLowerCase()}-run firms around ${lead.location.split(",")[0]} and ${evidence} is a close match to ${lead.company}. Happy to share what that looks like if it is useful.\n\nSam`;
  return [
    { subject, body },
    { subject: `Re: ${subject}`, body: `Hi ${first(lead.person)},\n\nOne thing ${evidence} noticed in the first month: the day-to-day tickets dropped off once the basics were in place, and the insurer questions got easier.\n\nStill happy to do fifteen minutes if the timing works.\n\nSam` },
    { body: `Hi ${first(lead.person)}, I sent a note about IT at ${lead.company} last week. ${evidence} is a similar setup to yours; happy to share the plan we used if it helps.` },
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

const essentialEight = leads.filter((l) => hasTrigger(l, "essential eight") || hasTrigger(l, "insurance")).slice(0, 4);
const officeMove = leads.filter((l) => hasTrigger(l, "office move") || hasTrigger(l, "move")).slice(0, 3);
const fallback = (picked: Lead[], n: number) => (picked.length >= n ? picked : [...picked, ...leads.filter((l) => !picked.includes(l))].slice(0, n));

export const campaigns: Campaign[] = [
  {
    id: "harbourline-outreach-icp-v3",
    name: "Harbourline outreach — ICP v3",
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
    id: "essential-eight-renewals-q4",
    name: "Essential Eight renewals — Q4",
    status: "draft",
    owner: "Jordan",
    source: "Leads — ICP v3",
    updatedMinutesAgo: 95,
    steps: defaultSteps,
    people: fallback(essentialEight, 4).map((l, i) => ({ ...person(l, i, addDays(BASE, 7)), status: "pending" as const, step: 1 })),
    log: [{ at: "2026-09-12T07:30:00+10:00", text: "Campaign created by Jordan" }],
  },
  {
    id: "office-move-follow-ups",
    name: "Office-move follow-ups",
    status: "paused",
    owner: "Sam",
    source: "Won deals",
    updatedMinutesAgo: 1440,
    steps: defaultSteps.slice(0, 2),
    people: fallback(officeMove, 3).map((l, i) => person(l, i, addDays(BASE, -5), true)),
    log: [
      { at: "2026-09-07T10:00:00+10:00", text: "Campaign created from Won deals" },
      { at: "2026-09-11T09:15:00+10:00", text: "Paused by Sam" },
    ],
  },
];
