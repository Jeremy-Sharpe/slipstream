// Response shapes of the live Slipstream API on main (lib/api/slipstream.ts). Mock data in lib/ mirrors these so wiring is 1:1.
export type ApiCall = {
  id: string;
  source_external_id: string;
  occurred_at: string;
  duration_seconds: number | null;
  processing_status: "pending" | "processing" | "ready" | "failed";
  rep: string | null;
  segments: Array<{
    sequence: number;
    speaker: string;
    body: string;
    start_ms: number;
    end_ms: number | null;
  }>;
};

type ApiExtraction = {
  contact: {
    name: ApiField<string>;
    email: ApiField<string>;
    phone: ApiField<string>;
    title: ApiField<string>;
  };
  company: {
    name: ApiField<string>;
    domain: ApiField<string>;
    industry: ApiField<string>;
    employee_count: ApiField<number>;
    location: ApiField<string>;
  };
  deal: {
    stage: ApiField<string>;
    outcome: ApiField<string>;
    amount: ApiField<number>;
  };
  promises: ApiField<string>[];
  objections: Array<{
    text: string;
    handling: Exclude<Handling, "none_raised">;
    confidence: number;
    evidence: Evidence[];
  }>;
  next_step: null | {
    description: string;
    due_date: string | null;
    confidence: number;
    evidence: Evidence[];
  };
  summary: string;
};

export type ApiDraft = {
  id: string;
  conversation_id: string;
  recipient_name: string | null;
  recipient_email: string | null;
  subject: string;
  body: string;
  status: "draft" | "approved" | "sent";
  model: string;
};

export type EmailParty = { name: string | null; email: string };
export type EmailRecipient = EmailParty & { kind: "to" | "cc" | "bcc" };
export type EmailIngestInput = {
  provider: string;
  mailbox_external_id: string;
  mailbox: EmailParty;
  source_external_id: string;
  thread_external_id: string;
  direction: "inbound" | "outbound";
  sender: EmailParty;
  recipients: EmailRecipient[];
  subject: string;
  body: string;
  occurred_at: string;
  in_reply_to?: string | null;
};

export type ApiEmailRecord = EmailIngestInput & {
  id: string;
  contact_email: string | null;
  deal_external_id: string;
};

export type LivePipeline = {
  call: ApiCall;
  extraction: ApiExtraction;
  draft: ApiDraft;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type ApiReadiness = {
  revision: string;
  environment?: string;
  storage: string;
  integrations: Record<string, boolean>;
  reasoning_provider?: string;
  reasoning_model?: string;
  embedding_provider?: string;
  embedding_model?: string;
};

export type ApiIcpProfile = {
  id: string;
  version: number;
  evidence: Array<{ attribute: string; deal_ids: string[]; why: string }>;
  source_deals?: Array<{ deal_id: string; company_name: string; call_ids: string[] }>;
  profile: {
    summary: string;
    industries: string[];
    headcount_band: string;
    roles: string[];
    triggers: string[];
    confidence: number;
    origami_brief: string;
    source_summary?: { deals: number; calls: number; emails: number; outcome_labelled: number } | null;
    cohort_revision?: string | null;
  };
};

export type ApiIcpEvidenceInventory = {
  deals: number;
  calls: number;
  emails: number;
  outcome_labelled: number;
  won_deals: number;
  contrast_deals: number;
  active_deals: number;
  ready_to_derive: boolean;
};

export type ApiIcpFreshness = {
  profile_id: string;
  profile_version: number;
  status: "current" | "stale" | "legacy";
  derived_cohort_revision: string | null;
  current_cohort_revision: string;
  source_summary: { deals: number; calls: number; emails: number; outcome_labelled: number };
  deals_added: number;
  outcome_labels_added: number;
  leads_on_profile: number;
  leads_needing_rescore: number;
  reason: string;
};

export type ApiLead = {
  id: string;
  icp_profile_id: string | null;
  origami_row_id: string;
  company_name: string;
  person_name: string | null;
  title: string | null;
  location: string | null;
  linkedin_url: string | null;
  origami_relevance_score: number | null;
  similarity_score: number | null;
  status: "new" | "reviewed" | "approved" | "contacted" | "rejected";
  metadata?: { source?: string; synthetic?: boolean };
};

export type ApiOutreachDraft = {
  id: string;
  lead_id: string;
  subject: string;
  body: string;
  status: "draft" | "approved" | "sent";
};

export type ApiLeadSource = {
  origami_job_id: string;
  icp_profile_id: string;
  status: string;
};

export type ApiLeadSourceStatus = {
  status: string;
  phase: string | null;
};

export type ApiDemoBootstrap = {
  status: string;
  icp: ApiIcpProfile;
  reused_icp: boolean;
  lead_source: ApiLeadSource | null;
  lead_provider: string;
  spend_guardrail: string;
};

export type ApiCampaignItemState = "queued" | "running" | "sent" | "retryable" | "failed" | "reconcile";

export type ApiCampaignItem = {
  position: number;
  draft_id: string;
  state: ApiCampaignItemState;
  outcome: string | null;
  http_status: number | null;
  detail: string | null;
  retryable: boolean;
  reconciliation_required: boolean;
  receipt: Record<string, unknown> | null;
  attempt_count: number;
  next_attempt_at: string | null;
  last_attempt_at: string | null;
};

export type ApiCampaign = {
  id: string;
  name: string;
  status: "scheduled" | "running" | "paused" | "completed" | "attention";
  scheduled_for: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  counts: Record<ApiCampaignItemState, number>;
  items: ApiCampaignItem[];
};

export type ApiScorecard = {
  call_id: string;
  request_id: string | null;
  source_external_id: string | null;
  source_revision: string | null;
  scorecard_revision: string | null;
  source_turns: Array<{ speaker: "rep" | "prospect"; name: string; text: string }> | null;
  rep: string;
  outcome: "won" | "stalled" | "lost" | "no_show" | null;
  discovery_questions: number;
  discovery_evidence: Array<{ turn_index: number; quote: string }>;
  next_step_secured: boolean;
  next_step_evidence: { turn_index: number; quote: string } | null;
  objection_handling: Handling;
  objection_evidence: Array<{ turn_index: number; quote: string }>;
  rep_talk_ratio: number;
  talk_ratio_band: "healthy" | "heavy" | "monologue";
  went_well: string[];
  to_improve: string[];
  summary: string;
  model: string;
  rubric_version: string;
  scored_at: string;
};

export type ApiPlaybook = {
  cohort_revision: string;
  sources: Array<{
    call_id: string;
    source_external_id: string;
    source_revision: string;
    scorecard_revision: string;
    rubric_version: string;
    outcome: "won" | "stalled" | "lost" | "no_show" | null;
  }>;
  stats: Array<{
    outcome_group: "won" | "not_won";
    calls: number;
    mean_discovery: number;
    next_step_rate: number;
    objection_handled_rate: number;
    mean_talk_ratio: number;
  }>;
  reps: Array<{
    rep: string;
    calls: number;
    won: number;
    mean_discovery: number;
    next_step_rate: number;
    mean_talk_ratio: number;
  }>;
  patterns: Array<{ behaviour: string; why_it_matters: string; call_ids: string[]; quotes: string[] }>;
  coaching_focus: string[];
  model: string;
  generated_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
