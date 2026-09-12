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
};
