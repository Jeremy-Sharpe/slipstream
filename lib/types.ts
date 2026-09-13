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
  /** The API id the pipeline is addressed by: `source_external_id` for a call, the thread id for a thread. */
  sourceId?: string;
  contact: string;
  title?: string | null;
  email?: string | null;
  company: string;
  industry?: string | null;
  headcount?: number | null;
  location?: string | null;
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
  /** Threads only: how long the reply took. */
  responseTime?: string;
  /** Each block below is absent until its step has run. */
  fields?: {
    contact: Field<string | null>;
    company: Field<string | null>;
    stage: Field<string | null>;
    value: Field<number | null>;
    next_step: Field<string | null>;
    promises: Field<string[]>;
  };
  scorecard?: {
    discovery: number;
    nextStepSecured: boolean;
    objection: string;
    talkRatio: number;
    /** Threads only: whether the reply asked what it needed to, and how fast it came. */
    askedRightQuestions?: boolean;
    responseTime?: string;
    spans: { discovery: number | null; nextStep: number | null; objection: number | null };
  };
  objections?: { text: string; handling: string }[];
  icp?: { industry: string; headcount_band: string; role: string; trigger: string | null } | null;
  riskFlags?: unknown[];
  draft?: { id?: string; subject: string; body: string; approved?: boolean };
  /** Set when the call came from a dropped recording / pasted transcript. */
  fileName?: string;
  pasted?: boolean;
};

export type Evidence = {
  /** ICP attribute the lead was matched on, e.g. "Industry". */
  attribute: string;
  /** This lead's value for that attribute. */
  value: string;
  /** Why the attribute is in the ICP, from the derived profile's evidence. */
  why: string;
  /** Won-deal companies the attribute was derived from. */
  deals: string[];
};

export type LeadStatus = "new" | "drafted" | "approved";

export type Lead = {
  id: string;
  company: string;
  contact: string;
  title: string;
  location: string;
  industry: string;
  headcount: number | null;
  /** Cosine similarity to the won-deal centroid, 0 to 100. */
  similarity: number;
  status: LeadStatus;
  /** Why the provider put this row forward. */
  trigger: string;
  linkedinUrl: string | null;
  email: string | null;
  /** The search that put this lead on the sheet; "" for rows already on the profile. */
  searchId: string;
  /** When the row landed in a running search (drives the arrival highlight). */
  landedAt?: number;
  evidence: Evidence[];
  draft: { id: string; subject: string; body: string } | null;
};

export type SearchStatus = "running" | "done" | "error";
export type SearchStep = "read" | "search" | "score" | "draft";
export type Search = {
  /** The sourcing job id from the API. */
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
  /** Leads this search put on the sheet. */
  leadIds: string[];
  /** What the job is doing, or why it stopped. */
  note?: string;
};
