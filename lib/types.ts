export type Outcome = "won" | "stalled" | "lost" | "no_show" | "open";

export type EmailParty = { name: string | null; email: string };
export type EmailRecipient = EmailParty & { kind: "to" | "cc" | "bcc" };
/** One message of a thread, the shape of ApiEmailRecord (docs/api-shapes.ts). */
export type EmailMessage = {
  i: number;
  direction: "inbound" | "outbound";
  sender: EmailParty;
  recipients: EmailRecipient[];
  subject: string;
  body: string;
  occurred_at: string;
};

export type Turn = { i: number; speaker: "rep" | "prospect"; name: string; text: string; t: number };

/** `span` points at the source turn (or message). Calls cite a time (`evidence_ms`); threads cite a message index (`evidence_ref`). */
export type Field<T = string | number | string[] | null> = { value: T; confidence: number; span: number | null; evidence_ms?: number | null; evidence_ref?: number | null };

export type CallRecord = {
  id: string;
  kind: "call" | "email";
  contact: string;
  title: string;
  email?: string | null;
  company: string;
  industry: string;
  headcount: number;
  location: string;
  rep: string;
  at: string;
  duration: number;
  outcome: Outcome;
  valueAud?: number | null;
  trigger?: string | null;
  /** Calls: diarised turns. Threads: one turn per message (body, in order), so citations work the same way. */
  turns: Turn[];
  /** Threads only: the messages, oldest first. */
  messages?: EmailMessage[];
  fields: {
    contact: Field<string>;
    company: Field<string>;
    stage: Field<string>;
    value: Field<number | null>;
    next_step: Field<string | null>;
    promises: Field<string[]>;
  };
  scorecard: {
    discovery: number;
    nextStepSecured: boolean;
    objection: string;
    talkRatio: number;
    /** Threads only: whether the reply asked what it needed to, and how fast it came. */
    askedRightQuestions?: boolean;
    responseTime?: string;
    spans: { discovery: number | null; nextStep: number | null; objection: number | null };
  };
  objections: { text: string; handling: string }[];
  icp: { industry: string; headcount_band: string; role: string; trigger: string | null } | null;
  riskFlags: unknown[];
  draft: { subject: string; body: string };
  /** Set when the call came from a dropped recording / pasted transcript. */
  fileName?: string;
  pasted?: boolean;
};

export type Evidence = { attribute: string; value: string; quote: string; call: string; t: string };

export type Lead = {
  id: string;
  company: string;
  contact: string;
  title: string;
  location: string;
  industry: string;
  headcount: number;
  similarity: number;
  status: "drafted" | "approved";
  /** Short phrase from the evidence, e.g. "Cyber-insurance renewal". */
  trigger: string;
  /** Mock profile URL. */
  linkedinUrl: string;
  /** The search that found this lead. */
  searchId: string;
  /** When the row landed in a running search (drives the arrival highlight). */
  landedAt?: number;
  evidence: Evidence[];
  draft: { subject: string; body: string };
};

export type SearchStatus = "running" | "done";
export type SearchStep = "read" | "search" | "score" | "draft";
export type Search = {
  id: string;
  /** 1-based, "Search 3". */
  n: number;
  brief: string;
  count: number;
  status: SearchStatus;
  step: SearchStep;
  /** Rows landed / scored / drafted so far. */
  found: number;
  scored: number;
  drafted: number;
  startedAt: number;
  elapsedMs?: number;
};
