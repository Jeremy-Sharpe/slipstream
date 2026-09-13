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

const mailbox = { name: "Sam Whitfield", email: "sam@eleno.example" };

export const emailThreads: DemoEmailThread[] = [
  {
    id: "email-fairfield-source-logging",
    contact: "Olivia Hart",
    company: "Fairfield Wealth Partners",
    title: "Practice Manager",
    industry: "Financial planning and wealth advice firm",
    headcount: 37,
    location: "Kew, VIC",
    subject: "Source logging and next steps",
    provider: "demo",
    mailboxExternalId: "eleno-sales",
    threadExternalId: "fairfield-source-logging",
    messages: [
      {
        provider: "demo", mailbox_external_id: "eleno-sales", mailbox,
        source_external_id: "fairfield-001", thread_external_id: "fairfield-source-logging", direction: "inbound",
        sender: { name: "Olivia Hart", email: "olivia@fairfieldwealth.example" },
        recipients: [{ ...mailbox, kind: "to" }], subject: "Source logging and next steps",
        body: "Hi Sam,\n\nOur compliance manager wants to see how the drafting assistant records every source it relies on before we roll it out to the advisers. Could you send the recommended first phase, timing, and who you need from our side?\n\nRegards,\nOlivia",
        occurred_at: "2026-09-12T00:12:00Z",
      },
      {
        provider: "demo", mailbox_external_id: "eleno-sales", mailbox,
        source_external_id: "fairfield-002", thread_external_id: "fairfield-source-logging", direction: "outbound",
        sender: mailbox,
        recipients: [{ name: "Olivia Hart", email: "olivia@fairfieldwealth.example", kind: "to" }], subject: "Re: Source logging and next steps",
        body: "Hi Olivia,\n\nAbsolutely. I will put the source logging design first: every generated paragraph carries a reference to the meeting note, fact find field or research document it came from. That sits inside a three-week discovery phase scope, with the lift from your paraplanners written out explicitly. I can send it Wednesday and walk the principals and your compliance manager through it Thursday.\n\nBest,\nSam",
        occurred_at: "2026-09-12T00:41:00Z", in_reply_to: "fairfield-001",
      },
      {
        provider: "demo", mailbox_external_id: "eleno-sales", mailbox,
        source_external_id: "fairfield-003", thread_external_id: "fairfield-source-logging", direction: "inbound",
        sender: { name: "Olivia Hart", email: "olivia@fairfieldwealth.example" },
        recipients: [{ ...mailbox, kind: "to" }], subject: "Re: Source logging and next steps",
        body: "Thanks Sam. Thursday at 2 works. Please include the fixed build price and two worked examples from our own template, one simple and one with a superannuation recommendation.",
        occurred_at: "2026-09-12T01:06:00Z", in_reply_to: "fairfield-002",
      },
    ],
  },
  {
    id: "email-kestrel-broker-season",
    contact: "Felix Morgan",
    company: "Kestrel Lending",
    title: "Head of Credit Operations",
    industry: "Non-bank commercial lender",
    headcount: 64,
    location: "Docklands, VIC",
    subject: "Sequencing before broker season",
    provider: "demo",
    mailboxExternalId: "eleno-sales",
    threadExternalId: "kestrel-broker-season",
    messages: [
      {
        provider: "demo", mailbox_external_id: "eleno-sales", mailbox,
        source_external_id: "kestrel-001", thread_external_id: "kestrel-broker-season", direction: "inbound",
        sender: { name: "Felix Morgan", email: "felix@kestrellending.example" },
        recipients: [{ ...mailbox, kind: "to" }], subject: "Sequencing before broker season",
        body: "Hi Sam,\n\nThe CEO signed off after our session with risk. Can we build the standard facility letter first and take the security schedule variants after broker season? Please confirm what the discovery phase needs from the documentation officers and how the baseline gets measured.\n\nFelix",
        occurred_at: "2026-09-11T05:22:00Z",
      },
    ],
  },
];

export const emailById = (id: string) => emailThreads.find((thread) => thread.id === id);
