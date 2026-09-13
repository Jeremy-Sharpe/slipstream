import type { EmailIngestInput } from "@/lib/api/slipstream";

export type DemoEmailThread = {
  id: string;
  contact: string;
  company: string;
  title: string;
  industry: string;
  headcount: number;
  location: string;
  subject: string;
  provider: string;
  mailboxExternalId: string;
  threadExternalId: string;
  messages: EmailIngestInput[];
};

const mailbox = { name: "Sam Whitfield", email: "sam@harbourline.example" };

export const emailThreads: DemoEmailThread[] = [
  {
    id: "email-wattle-security-review",
    contact: "Olivia Hart",
    company: "Wattle Street Legal",
    title: "Practice Manager",
    industry: "Family law firm",
    headcount: 37,
    location: "Hawthorn, VIC",
    subject: "Security review and next steps",
    provider: "demo",
    mailboxExternalId: "harbourline-sales",
    threadExternalId: "wattle-security-review",
    messages: [
      {
        provider: "demo", mailbox_external_id: "harbourline-sales", mailbox,
        source_external_id: "wattle-001", thread_external_id: "wattle-security-review", direction: "inbound",
        sender: { name: "Olivia Hart", email: "olivia@wattlestreet.example" },
        recipients: [{ ...mailbox, kind: "to" }], subject: "Security review and next steps",
        body: "Hi Sam,\n\nOur cyber insurer has asked for evidence of MFA and a documented response plan before renewal. Could you send through the recommended first phase, timing, and who you would need from our side?\n\nRegards,\nOlivia",
        occurred_at: "2026-09-12T00:12:00Z",
      },
      {
        provider: "demo", mailbox_external_id: "harbourline-sales", mailbox,
        source_external_id: "wattle-002", thread_external_id: "wattle-security-review", direction: "outbound",
        sender: mailbox,
        recipients: [{ name: "Olivia Hart", email: "olivia@wattlestreet.example", kind: "to" }], subject: "Re: Security review and next steps",
        body: "Hi Olivia,\n\nAbsolutely. I will map the insurer requirements to a 30-day first phase and keep the lift from your team explicit. I can send that by Friday, then walk you and the managing partner through it Monday.\n\nBest,\nSam",
        occurred_at: "2026-09-12T00:41:00Z", in_reply_to: "wattle-001",
      },
      {
        provider: "demo", mailbox_external_id: "harbourline-sales", mailbox,
        source_external_id: "wattle-003", thread_external_id: "wattle-security-review", direction: "inbound",
        sender: { name: "Olivia Hart", email: "olivia@wattlestreet.example" },
        recipients: [{ ...mailbox, kind: "to" }], subject: "Re: Security review and next steps",
        body: "Thanks Sam. Monday at 10 works. Please include indicative pricing and whether the MFA rollout can happen without disrupting court days.",
        occurred_at: "2026-09-12T01:06:00Z", in_reply_to: "wattle-002",
      },
    ],
  },
  {
    id: "email-arcwell-rollout",
    contact: "Felix Morgan",
    company: "Arcwell Health",
    title: "Operations Manager",
    industry: "Multi-site allied health clinic",
    headcount: 64,
    location: "Brunswick and Essendon, VIC",
    subject: "Clinic rollout sequencing",
    provider: "demo",
    mailboxExternalId: "harbourline-sales",
    threadExternalId: "arcwell-rollout",
    messages: [
      {
        provider: "demo", mailbox_external_id: "harbourline-sales", mailbox,
        source_external_id: "arcwell-001", thread_external_id: "arcwell-rollout", direction: "inbound",
        sender: { name: "Felix Morgan", email: "felix@arcwell.example" },
        recipients: [{ ...mailbox, kind: "to" }], subject: "Clinic rollout sequencing",
        body: "Hi Sam,\n\nThe board approved the security uplift. Can we start Brunswick first and schedule Essendon after the school holidays? Please confirm the onboarding workshop and what staff need to prepare.\n\nFelix",
        occurred_at: "2026-09-11T05:22:00Z",
      },
    ],
  },
];

export const emailById = (id: string) => emailThreads.find((thread) => thread.id === id);
