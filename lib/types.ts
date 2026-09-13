// UI-side types. Mirror of the API's Pydantic schemas (api/app/schemas/) and
// the Supabase tables once those land; until then this is the contract the
// screens read. camelCase here; lib/data maps from snake_case later.

export type ConversationKind = "call" | "email";
export type Outcome = "won" | "stalled" | "lost" | "no_show" | "open";

/** Where a conversation sits in the pipeline Slipstream runs on it. */
export type ConversationStatus = "processing" | "needs_review" | "action_ready" | "synced";

export type Conversation = {
  id: string;
  kind: ConversationKind;
  contact: string;
  title: string;
  company: string;
  industry: string;
  headcount: number;
  location: string;
  rep: string;
  /** ISO datetime */
  at: string;
  durationSeconds?: number;
  outcome: Outcome;
  valueAud?: number;
  trigger?: string;
  /** One line from the conversation, shown in the feed. */
  preview: string;
  status: ConversationStatus;
  /** For a call added from a recorded fixture: the fixture it was copied from. */
  sourceId?: string;
};

// Leads surface. snake_case because these mirror the Supabase `leads` row and
// its embedded evidence/draft JSON; components take these shapes whole.

export type LeadStatus = "new" | "drafted" | "approved" | "rejected";

export type MatchEvidence = {
  attribute: string; // "Buying trigger"
  value: string; // "Statement of advice drafting backlog"
  quote: string; // verbatim from the source call
  call_label: string; // "Fairfield Wealth Partners — discovery"
  timestamp_ms: number;
};

export type Draft = { id: string; subject: string; body: string; status: "draft" | "approved"; source?: "evaluation" | "live" };

export type Lead = {
  id: string;
  origami_row_id: string;
  company: string;
  person: string;
  title: string;
  location: string;
  linkedin_url: string | null;
  relevance_score: number | null; // 0-100, Origami; null when unavailable
  similarity: number | null; // 0-100, cosine vs won-deal centroid; null when unavailable
  status: LeadStatus;
  match_evidence: MatchEvidence[];
  draft: Draft | null;
  source?: "evaluation" | "live";
};
