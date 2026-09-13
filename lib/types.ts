export type Outcome = "won" | "stalled" | "lost" | "no_show";

export type Turn = { i: number; speaker: "rep" | "prospect"; name: string; text: string; t: number };

export type Field<T = string | number | string[] | null> = { value: T; confidence: number; span: number | null; evidence_ms?: number | null };

export type CallRecord = {
  id: string;
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
  turns: Turn[];
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
  evidence: Evidence[];
  draft: { subject: string; body: string };
};
