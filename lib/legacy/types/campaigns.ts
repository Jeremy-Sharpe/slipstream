// Campaign shapes for the UI. Nothing here is ever sent: a campaign is a set of
// drafted sequences a rep approves one person at a time.

export type CampaignStatus = "active" | "paused" | "draft";
export type StepChannel = "email" | "linkedin";
export type PersonStatus = "pending" | "approved" | "paused" | "skipped";
export type Owner = "Sam" | "Jordan" | "Maxim";

export type SequenceStep = {
  id: string;
  channel: StepChannel;
  /** Days after the previous step. */
  delayDays: number;
  /** Template preview shown on the step card. */
  subject?: string;
  body: string;
};

export type PersonCopy = { subject?: string; body: string };

export type CampaignPerson = {
  id: string;
  leadId: string | null;
  name: string;
  company: string;
  title: string;
  /** 1-based index of the step they are on. */
  step: number;
  status: PersonStatus;
  /** ISO date of the next action. */
  nextAction: string;
  /** Rendered copy per step, same length as the campaign's steps. */
  copy: PersonCopy[];
};

export type Campaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  owner: Owner;
  source: string;
  updatedMinutesAgo: number;
  steps: SequenceStep[];
  people: CampaignPerson[];
  /** Append-only activity log, newest last. */
  log: { at: string; text: string }[];
};
