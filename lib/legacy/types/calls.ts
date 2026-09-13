// Shapes for one call's full record: transcript, extraction, scorecard, draft,
// timeline. Generated from fixtures/calls today; mirrors the calls, notes,
// tasks and drafts tables once the API lands.

export type Speaker = "rep" | "prospect";

export type Turn = {
  index: number;
  speaker: Speaker;
  name: string;
  text: string;
  /** Seconds from the start of the call. */
  at: number;
};

/** A CRM value with how sure the model was and which turn it came from. */
export type Extracted<T> = {
  value: T;
  confidence: number;
  span: number | null;
};

export type Handling = "handled" | "partial" | "ignored" | "none_raised";

export type Objection = { text: string; handling: Handling; span: number | null };

export type Extraction = {
  contact: { name: Extracted<string>; role: Extracted<string>; email: Extracted<string>; phone: Extracted<string> };
  company: { name: Extracted<string>; industry: Extracted<string>; headcount: Extracted<number>; location: Extracted<string> };
  deal: { stage: Extracted<string>; valueAud: Extracted<number>; outcome: Extracted<string> };
  promises: Extracted<string>[];
  objections: Objection[];
  nextStep: Extracted<string> | null;
  nextStepDue: string | null;
};

export type Scorecard = {
  discoveryQuestions: { value: number; span: number | null };
  nextStepSecured: { value: boolean; span: number | null };
  objectionHandling: { value: Handling; span: number | null };
  talkRatio: number;
  notes: string;
};

export type RiskFlag = { turnIndex: number; text: string; kind: string };

export type FollowUpDraft = { subject: string; body: string };

export type TimelineEntry = { title: string; meta: string; at: string; icon: "call" | "sparkles" | "gauge" | "mail" | "check" };

export type CallRecord = {
  id: string;
  rep: string;
  prospect: string;
  company: string;
  domain: string;
  at: string;
  durationSeconds: number;
  outcome: "open" | "won" | "stalled" | "lost" | "no_show";
  trigger: string | null;
  /** Two-line intelligence summary shown above the transcript. */
  summary: string;
  turns: Turn[];
  extraction: Extraction;
  scorecard: Scorecard;
  icpSignals: { industry: string; headcountBand: string; role: string; trigger: string | null };
  riskFlags: RiskFlag[];
  draft: FollowUpDraft;
  timeline: TimelineEntry[];
};
