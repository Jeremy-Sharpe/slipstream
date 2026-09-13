import type { CallRecord, Extracted, Extraction, Handling } from "@/lib/types/calls";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://slipstream-api.3-104-149-193.sslip.io"
).replace(/\/$/, "");

type Evidence = { sequence: number | null; quote: string };
type ApiField<T> = { value: T | null; confidence: number; evidence: Evidence[] };

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

function parseReadiness(value: unknown): ApiReadiness {
  if (!isRecord(value) || typeof value.revision !== "string" || typeof value.storage !== "string" || !isRecord(value.integrations)) {
    throw new ApiError("Slipstream API returned malformed readiness data", 502);
  }
  const integrations = Object.fromEntries(
    Object.entries(value.integrations).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
  if (Object.keys(integrations).length !== Object.keys(value.integrations).length) {
    throw new ApiError("Slipstream API returned malformed integration flags", 502);
  }
  const optionalStrings = ["environment", "reasoning_provider", "reasoning_model", "embedding_provider", "embedding_model"] as const;
  if (optionalStrings.some((key) => value[key] !== undefined && typeof value[key] !== "string")) {
    throw new ApiError("Slipstream API returned malformed model provenance", 502);
  }
  return {
    revision: value.revision,
    storage: value.storage,
    integrations,
    ...Object.fromEntries(optionalStrings.flatMap((key) => typeof value[key] === "string" && value[key].trim() ? [[key, value[key].trim()]] : [])),
  } as ApiReadiness;
}

function parseIcpProfile(value: unknown): ApiIcpProfile {
  if (!isRecord(value) || typeof value.id !== "string" || !Number.isInteger(value.version) || !Array.isArray(value.evidence) || !isRecord(value.profile)) {
    throw new ApiError("Slipstream API returned malformed ICP data", 502);
  }
  const profile = value.profile;
  const confidence = profile.confidence;
  const sourceSummary = profile.source_summary;
  const validSourceSummary = sourceSummary == null || (
    isRecord(sourceSummary) &&
    [sourceSummary.deals, sourceSummary.calls, sourceSummary.emails, sourceSummary.outcome_labelled]
      .every((count) => Number.isInteger(count) && Number(count) >= 0)
  );
  const validProfile =
    typeof profile.summary === "string" &&
    isStringArray(profile.industries) &&
    typeof profile.headcount_band === "string" &&
    isStringArray(profile.roles) &&
    isStringArray(profile.triggers) &&
    typeof confidence === "number" &&
    Number.isFinite(confidence) &&
    confidence >= 0 && confidence <= 1 &&
    typeof profile.origami_brief === "string" &&
    validSourceSummary;
  const validEvidence = value.evidence.every((item) =>
    isRecord(item) &&
    typeof item.attribute === "string" &&
    isStringArray(item.deal_ids) &&
    typeof item.why === "string",
  );
  const codePoints = (text: string) => Array.from(text).length;
  const validSourceDeals = value.source_deals === undefined || (
    Array.isArray(value.source_deals) && value.source_deals.length <= 100 && value.source_deals.every((item) =>
      isRecord(item) &&
      typeof item.deal_id === "string" && codePoints(item.deal_id) > 0 && codePoints(item.deal_id) <= 128 &&
      typeof item.company_name === "string" && codePoints(item.company_name) > 0 && codePoints(item.company_name) <= 120 &&
      isStringArray(item.call_ids) && item.call_ids.length <= 20 &&
      item.call_ids.every((id) => codePoints(id) > 0 && codePoints(id) <= 200),
    )
  );
  if (!validProfile || !validEvidence || !validSourceDeals) {
    throw new ApiError("Slipstream API returned malformed ICP data", 502);
  }
  return value as ApiIcpProfile;
}

function parseIcpEvidenceInventory(value: unknown): ApiIcpEvidenceInventory {
  if (!isRecord(value)) throw new ApiError("Slipstream API returned malformed evidence inventory", 502);
  const counts = ["deals", "calls", "emails", "outcome_labelled", "won_deals", "contrast_deals", "active_deals"];
  if (!counts.every((key) => Number.isSafeInteger(value[key]) && Number(value[key]) >= 0) || typeof value.ready_to_derive !== "boolean") {
    throw new ApiError("Slipstream API returned malformed evidence inventory", 502);
  }
  const inventory = value as ApiIcpEvidenceInventory;
  if (
    inventory.won_deals + inventory.contrast_deals + inventory.active_deals !== inventory.deals
    || inventory.outcome_labelled !== inventory.won_deals + inventory.contrast_deals
    || inventory.ready_to_derive !== (inventory.won_deals >= 2)
  ) throw new ApiError("Slipstream API returned inconsistent evidence inventory", 502);
  return inventory;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function parseLead(value: unknown): ApiLead {
  const statuses = new Set(["new", "reviewed", "approved", "contacted", "rejected"]);
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !nullableString(value.icp_profile_id) ||
    typeof value.origami_row_id !== "string" ||
    typeof value.company_name !== "string" ||
    !nullableString(value.person_name) ||
    !nullableString(value.title) ||
    !nullableString(value.location) ||
    !nullableString(value.linkedin_url) ||
    !nullableNumber(value.origami_relevance_score) ||
    !nullableNumber(value.similarity_score) ||
    typeof value.status !== "string" ||
    !statuses.has(value.status)
  ) {
    throw new ApiError("Slipstream API returned malformed lead data", 502);
  }
  return value as ApiLead;
}

function parseOutreachDraft(value: unknown): ApiOutreachDraft {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.lead_id !== "string" ||
    typeof value.subject !== "string" ||
    typeof value.body !== "string" ||
    !["draft", "approved", "sent"].includes(String(value.status))
  ) {
    throw new ApiError("Slipstream API returned malformed outreach draft", 502);
  }
  return value as ApiOutreachDraft;
}

function parseCampaign(value: unknown): ApiCampaign {
  const campaignStatuses = new Set(["scheduled", "running", "paused", "completed", "attention"]);
  const itemStates: ApiCampaignItemState[] = ["queued", "running", "sent", "retryable", "failed", "reconcile"];
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.status !== "string" ||
    !campaignStatuses.has(value.status) ||
    typeof value.created_by !== "string" ||
    ![value.scheduled_for, value.created_at, value.updated_at].every((date) => typeof date === "string" && Number.isFinite(Date.parse(date))) ||
    !isRecord(value.counts) ||
    !Array.isArray(value.items) ||
    value.items.length < 1 || value.items.length > 25
  ) {
    throw new ApiError("Slipstream API returned malformed campaign data", 502);
  }
  const counts = value.counts as Record<string, unknown>;
  const items = value.items as unknown[];
  const itemsValid = items.every((item) =>
    isRecord(item) &&
    Number.isSafeInteger(item.position) && Number(item.position) >= 0 &&
    typeof item.draft_id === "string" &&
    typeof item.state === "string" && itemStates.includes(item.state as ApiCampaignItemState) &&
    nullableString(item.outcome) && nullableNumber(item.http_status) && nullableString(item.detail) &&
    typeof item.retryable === "boolean" && typeof item.reconciliation_required === "boolean" &&
    (item.receipt === null || isRecord(item.receipt)) &&
    Number.isSafeInteger(item.attempt_count) && Number(item.attempt_count) >= 0 &&
    [item.next_attempt_at, item.last_attempt_at].every((date) => date === null || typeof date === "string" && Number.isFinite(Date.parse(date)))
  );
  const countsValid = itemStates.every((state) =>
    Number.isSafeInteger(counts[state]) &&
    Number(counts[state]) === items.filter((item) => isRecord(item) && item.state === state).length
  );
  const positions = items.map((item) => isRecord(item) ? item.position : null);
  const draftIds = items.map((item) => isRecord(item) ? item.draft_id : null);
  if (!itemsValid || !countsValid || new Set(positions).size !== positions.length || new Set(draftIds).size !== draftIds.length) {
    throw new ApiError("Slipstream API returned inconsistent campaign data", 502);
  }
  return value as ApiCampaign;
}

function parseDraft(value: unknown): ApiDraft {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.conversation_id !== "string" ||
    !nullableString(value.recipient_name) ||
    !nullableString(value.recipient_email) ||
    typeof value.subject !== "string" ||
    typeof value.body !== "string" ||
    !["draft", "approved", "sent"].includes(String(value.status)) ||
    typeof value.model !== "string"
  ) {
    throw new ApiError("Slipstream API returned malformed draft data", 502);
  }
  return value as ApiDraft;
}

function parseEmailRecord(value: unknown): ApiEmailRecord {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.provider !== "string" ||
    typeof value.mailbox_external_id !== "string" ||
    !isRecord(value.mailbox) ||
    typeof value.source_external_id !== "string" ||
    typeof value.thread_external_id !== "string" ||
    !["inbound", "outbound"].includes(String(value.direction)) ||
    !isRecord(value.sender) ||
    !Array.isArray(value.recipients) ||
    typeof value.subject !== "string" ||
    typeof value.body !== "string" ||
    typeof value.occurred_at !== "string" ||
    !Number.isFinite(Date.parse(value.occurred_at)) ||
    !nullableString(value.contact_email) ||
    typeof value.deal_external_id !== "string"
  ) {
    throw new ApiError("Slipstream API returned malformed email data", 502);
  }
  const validParty = (party: Record<string, unknown>) => typeof party.email === "string" && nullableString(party.name);
  if (!validParty(value.mailbox) || !validParty(value.sender)) {
    throw new ApiError("Slipstream API returned malformed email participants", 502);
  }
  const validRecipients = value.recipients.every((recipient) =>
    isRecord(recipient) && validParty(recipient) && ["to", "cc", "bcc"].includes(String(recipient.kind)),
  );
  if (!validRecipients) throw new ApiError("Slipstream API returned malformed email recipients", 502);
  return value as ApiEmailRecord;
}

function validEvidence(value: unknown): boolean {
  return isRecord(value) && Number.isSafeInteger(value.turn_index) && Number(value.turn_index) >= 1 && typeof value.quote === "string" && value.quote.trim().length >= 3;
}

function parseScorecard(value: unknown): ApiScorecard {
  const outcomes = new Set(["won", "stalled", "lost", "no_show"]);
  const handling = new Set(["handled", "partial", "ignored", "none_raised"]);
  const bands = new Set(["healthy", "heavy", "monologue"]);
  if (
    !isRecord(value) ||
    typeof value.call_id !== "string" ||
    !nullableString(value.request_id) ||
    !nullableString(value.source_external_id) ||
    !nullableString(value.source_revision) ||
    !nullableString(value.scorecard_revision) ||
    !(value.source_turns === null || Array.isArray(value.source_turns) && value.source_turns.every((item) => isRecord(item) && ["rep", "prospect"].includes(String(item.speaker)) && typeof item.name === "string" && typeof item.text === "string")) ||
    typeof value.rep !== "string" ||
    !(value.outcome === null || (typeof value.outcome === "string" && outcomes.has(value.outcome))) ||
    !Number.isSafeInteger(value.discovery_questions) || Number(value.discovery_questions) < 0 ||
    !Array.isArray(value.discovery_evidence) || !value.discovery_evidence.every(validEvidence) ||
    typeof value.next_step_secured !== "boolean" ||
    !(value.next_step_evidence === null || validEvidence(value.next_step_evidence)) ||
    typeof value.objection_handling !== "string" || !handling.has(value.objection_handling) ||
    !Array.isArray(value.objection_evidence) || !value.objection_evidence.every(validEvidence) ||
    typeof value.rep_talk_ratio !== "number" || !Number.isFinite(value.rep_talk_ratio) || value.rep_talk_ratio < 0 || value.rep_talk_ratio > 1 ||
    typeof value.talk_ratio_band !== "string" || !bands.has(value.talk_ratio_band) ||
    !isStringArray(value.went_well) || !isStringArray(value.to_improve) ||
    typeof value.summary !== "string" || typeof value.model !== "string" ||
    typeof value.rubric_version !== "string" || typeof value.scored_at !== "string" ||
    !Number.isFinite(Date.parse(value.scored_at))
  ) {
    throw new ApiError("Slipstream API returned malformed scorecard data", 502);
  }
  return value as ApiScorecard;
}

function validRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function parsePlaybook(value: unknown): ApiPlaybook {
  if (!isRecord(value) || typeof value.cohort_revision !== "string" || !/^[a-f0-9]{64}$/.test(value.cohort_revision) || !Array.isArray(value.sources) || !Array.isArray(value.stats) || !Array.isArray(value.reps) || !Array.isArray(value.patterns) || !isStringArray(value.coaching_focus) || typeof value.model !== "string" || typeof value.generated_at !== "string" || !Number.isFinite(Date.parse(value.generated_at))) {
    throw new ApiError("Slipstream API returned malformed playbook data", 502);
  }
  const nonnegativeInteger = (item: unknown) => Number.isSafeInteger(item) && Number(item) >= 0;
  const nonnegativeNumber = (item: unknown) => typeof item === "number" && Number.isFinite(item) && item >= 0;
  const validSources = value.sources.length >= 2 && value.sources.every((item) => isRecord(item) && typeof item.call_id === "string" && typeof item.source_external_id === "string" && typeof item.source_revision === "string" && typeof item.scorecard_revision === "string" && typeof item.rubric_version === "string" && ["won", "stalled", "lost"].includes(String(item.outcome)));
  const validStats = value.stats.every((item) => isRecord(item) && ["won", "not_won"].includes(String(item.outcome_group)) && nonnegativeInteger(item.calls) && validRate(item.next_step_rate) && validRate(item.objection_handled_rate) && validRate(item.mean_talk_ratio) && nonnegativeNumber(item.mean_discovery));
  const validReps = value.reps.every((item) => isRecord(item) && typeof item.rep === "string" && nonnegativeInteger(item.calls) && nonnegativeInteger(item.won) && Number(item.won) <= Number(item.calls) && nonnegativeNumber(item.mean_discovery) && validRate(item.next_step_rate) && validRate(item.mean_talk_ratio));
  const validPatterns = value.patterns.every((item) => isRecord(item) && typeof item.behaviour === "string" && typeof item.why_it_matters === "string" && isStringArray(item.call_ids) && isStringArray(item.quotes) && item.call_ids.length >= 1 && item.call_ids.length <= 5 && item.call_ids.length === item.quotes.length);
  const groups = value.stats.map((item) => isRecord(item) ? item.outcome_group : null);
  const hasExactGroups = groups.length === 2 && groups.filter((item) => item === "won").length === 1 && groups.filter((item) => item === "not_won").length === 1;
  const sourceIds = value.sources.map((item) => isRecord(item) ? item.call_id : null);
  const sourceRevisions = value.sources.map((item) => isRecord(item) ? item.source_revision : null);
  const scorecardRevisions = value.sources.map((item) => isRecord(item) ? item.scorecard_revision : null);
  const sourceOutcomes = value.sources.map((item) => isRecord(item) ? item.outcome : null);
  const wonCalls = value.stats.find((item) => isRecord(item) && item.outcome_group === "won");
  const notWonCalls = value.stats.find((item) => isRecord(item) && item.outcome_group === "not_won");
  const sourceCountsMatch = isRecord(wonCalls) && isRecord(notWonCalls) && wonCalls.calls === sourceOutcomes.filter((item) => item === "won").length && notWonCalls.calls === sourceOutcomes.filter((item) => item === "lost" || item === "stalled").length;
  const sourceRubrics = value.sources.map((item) => isRecord(item) ? item.rubric_version : null);
  const citedIds = value.patterns.flatMap((item) => isRecord(item) && Array.isArray(item.call_ids) ? item.call_ids : []);
  const hasContrast = sourceOutcomes.some((item) => item === "won") && sourceOutcomes.some((item) => item === "lost" || item === "stalled");
  const citationsBelongToCohort = citedIds.every((id) => sourceIds.includes(id));
  if (!validSources || !validStats || !validReps || !validPatterns || !hasExactGroups || !hasContrast || new Set(sourceIds).size !== sourceIds.length || new Set(sourceRevisions).size !== sourceRevisions.length || new Set(scorecardRevisions).size !== scorecardRevisions.length || new Set(sourceRubrics).size !== 1 || !sourceCountsMatch || !citationsBelongToCohort) throw new ApiError("Slipstream API returned malformed playbook data", 502);
  return value as ApiPlaybook;
}

export async function getReadiness(signal?: AbortSignal): Promise<ApiReadiness> {
  const response = await fetch(`${API_BASE_URL}/ready`, { signal });
  if (!response.ok) throw new ApiError(`Slipstream API returned ${response.status}`, response.status);
  const payload: unknown = await response.json().catch(() => null);
  return parseReadiness(payload);
}

export async function getLatestIcp(signal?: AbortSignal): Promise<ApiIcpProfile | null> {
  try {
    return parseIcpProfile(await request<unknown>("/icp/latest", { signal }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getIcpEvidenceInventory(signal?: AbortSignal): Promise<ApiIcpEvidenceInventory> {
  return parseIcpEvidenceInventory(await request<unknown>("/icp/evidence", { signal }));
}

export async function getLeads(icpProfileId?: string, signal?: AbortSignal): Promise<ApiLead[]> {
  const query = icpProfileId ? `?icp_profile_id=${encodeURIComponent(icpProfileId)}` : "";
  const payload = await request<unknown>(`/leads${query}`, { signal });
  if (!Array.isArray(payload)) throw new ApiError("Slipstream API returned malformed leads data", 502);
  return payload.map(parseLead);
}

export async function getCampaigns(signal?: AbortSignal): Promise<ApiCampaign[]> {
  const payload = await request<unknown>("/campaigns?limit=50", { signal });
  if (!Array.isArray(payload)) throw new ApiError("Slipstream API returned malformed campaigns", 502);
  return payload.map(parseCampaign);
}

export async function sourceLeads(count = 10, signal?: AbortSignal): Promise<ApiLeadSource> {
  const payload = await request<unknown>("/leads/source", {
    method: "POST",
    body: JSON.stringify({ count, quality: "fast" }),
    signal,
  });
  if (
    !isRecord(payload) ||
    typeof payload.origami_job_id !== "string" ||
    typeof payload.icp_profile_id !== "string" ||
    typeof payload.status !== "string"
  ) throw new ApiError("Slipstream API returned malformed lead-search data", 502);
  return payload as ApiLeadSource;
}

export async function getLeadSourceStatus(jobId: string, signal?: AbortSignal): Promise<ApiLeadSourceStatus> {
  const payload = await request<unknown>(`/leads/source/${encodeURIComponent(jobId)}`, { signal });
  if (!isRecord(payload) || typeof payload.status !== "string" || !nullableString(payload.phase)) {
    throw new ApiError("Slipstream API returned malformed lead-search status", 502);
  }
  return payload as ApiLeadSourceStatus;
}

export async function draftLeadOutreach(leadId: string, signal?: AbortSignal): Promise<ApiOutreachDraft> {
  return parseOutreachDraft(await request<unknown>(`/leads/${encodeURIComponent(leadId)}/outreach`, {
    method: "POST",
    body: JSON.stringify({ rep_name: "Sam" }),
    signal,
  }));
}

export async function approveLeadOutreach(leadId: string, draftId: string, signal?: AbortSignal): Promise<ApiOutreachDraft> {
  return parseOutreachDraft(await request<unknown>(`/leads/${encodeURIComponent(leadId)}/outreach/approve`, {
    method: "POST",
    body: JSON.stringify({ actor: "Hackathon demo", draft_id: draftId }),
    signal,
  }));
}

export async function ingestEmail(message: EmailIngestInput, signal?: AbortSignal): Promise<ApiEmailRecord> {
  return parseEmailRecord(await request<unknown>("/emails", {
    method: "POST",
    body: JSON.stringify(message),
    signal,
  }));
}

export async function getEmailThread(
  provider: string,
  mailboxExternalId: string,
  threadExternalId: string,
  signal?: AbortSignal,
): Promise<ApiEmailRecord[]> {
  const path = `/emails/${encodeURIComponent(provider)}/mailboxes/${encodeURIComponent(mailboxExternalId)}/threads/${encodeURIComponent(threadExternalId)}`;
  const payload = await request<unknown>(path, { signal });
  if (!Array.isArray(payload)) throw new ApiError("Slipstream API returned malformed email thread data", 502);
  return payload.map(parseEmailRecord);
}

export async function draftEmailReply(
  provider: string,
  mailboxExternalId: string,
  threadExternalId: string,
  signal?: AbortSignal,
): Promise<ApiDraft> {
  const path = `/emails/${encodeURIComponent(provider)}/mailboxes/${encodeURIComponent(mailboxExternalId)}/threads/${encodeURIComponent(threadExternalId)}/draft-reply`;
  return parseDraft(await request<unknown>(path, { method: "POST", signal }));
}

export async function getScorecard(callId: string, signal?: AbortSignal): Promise<ApiScorecard | null> {
  try {
    const scorecard = parseScorecard(await request<unknown>(`/scorecards/${encodeURIComponent(callId)}`, { signal }));
    if (!scorecard.source_external_id || !scorecard.source_revision) return null;
    if (scorecard.source_external_id !== callId && scorecard.call_id !== callId) {
      throw new ApiError("Slipstream API returned a scorecard for a different call", 409);
    }
    return scorecard;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function scoreCall(call: ApiCall, outcome: CallRecord["outcome"], signal?: AbortSignal): Promise<ApiScorecard> {
  const rep = call.rep ?? "Unknown rep";
  const repKey = rep.trim().toLocaleLowerCase();
  const speakers = call.segments.map((segment) => segment.speaker.trim().toLocaleLowerCase());
  if (!repKey || speakers.some((speaker) => !speaker) || new Set(speakers).size !== 2 || !speakers.includes(repKey)) {
    throw new ApiError("Call speakers could not be mapped safely for scoring", 422);
  }
  const requestId = crypto.randomUUID();
  const scorecard = parseScorecard(await request<unknown>("/scorecards", {
    method: "POST",
    body: JSON.stringify({
      call_id: call.source_external_id,
      request_id: requestId,
      rep,
      outcome: outcome === "open" ? null : outcome,
      turns: call.segments.map((segment) => ({
        speaker: segment.speaker.trim().toLocaleLowerCase() === repKey ? "rep" : "prospect",
        name: segment.speaker,
        text: segment.body,
      })),
    }),
    signal,
  }));
  const expectedOutcome = outcome === "open" ? null : outcome;
  const expectedTurns = call.segments.map((segment) => ({
    speaker: segment.speaker.trim().toLocaleLowerCase() === repKey ? "rep" : "prospect",
    name: segment.speaker,
    text: segment.body,
  }));
  const sourceMatches = scorecard.source_turns != null && scorecard.source_turns.length === expectedTurns.length && scorecard.source_turns.every((turn, index) => turn.speaker === expectedTurns[index].speaker && turn.name === expectedTurns[index].name && turn.text === expectedTurns[index].text);
  if (
    ![call.id, call.source_external_id].includes(scorecard.call_id) ||
    scorecard.source_external_id !== call.source_external_id ||
    scorecard.request_id !== requestId ||
    typeof scorecard.source_revision !== "string" ||
    typeof scorecard.scorecard_revision !== "string" ||
    scorecard.rep.trim().toLocaleLowerCase() !== repKey ||
    scorecard.outcome !== expectedOutcome ||
    !sourceMatches
  ) {
    throw new ApiError("Slipstream API returned a scorecard for a different call revision", 409);
  }
  const evidence = [...scorecard.discovery_evidence, ...scorecard.objection_evidence, ...(scorecard.next_step_evidence ? [scorecard.next_step_evidence] : [])];
  const evidenceGrounded = evidence.every((item) => {
    const segment = call.segments[item.turn_index - 1];
    return segment != null && segment.body.includes(item.quote);
  });
  const discoveryConsistent = scorecard.discovery_questions === new Set(scorecard.discovery_evidence.map((item) => item.turn_index)).size && scorecard.discovery_evidence.every((item) => speakers[item.turn_index - 1] === repKey);
  const nextStepConsistent = scorecard.next_step_secured === (scorecard.next_step_evidence != null);
  const objectionConsistent = scorecard.objection_handling === "none_raised" ? scorecard.objection_evidence.length === 0 : scorecard.objection_evidence.length > 0;
  if (!evidenceGrounded || !discoveryConsistent || !nextStepConsistent || !objectionConsistent) {
    throw new ApiError("Slipstream API returned an ungrounded scorecard", 502);
  }
  return scorecard;
}

export async function derivePlaybook(scorecards: ApiScorecard[], signal?: AbortSignal): Promise<ApiPlaybook> {
  const callIds = scorecards.map((item) => item.call_id);
  const uniqueCallIds = [...new Set(callIds)];
  if (uniqueCallIds.length !== callIds.length || uniqueCallIds.length < 2 || scorecards.some((item) => !item.source_revision || !item.scorecard_revision || !item.source_external_id || !item.outcome)) {
    throw new ApiError("A playbook needs at least two distinct scorecards", 422);
  }
  const playbook = parsePlaybook(await request<unknown>("/playbook", {
    method: "POST",
    body: JSON.stringify({
      call_ids: uniqueCallIds,
      expected_sources: scorecards.map((item) => ({
        call_id: item.call_id,
        source_revision: item.source_revision,
        scorecard_revision: item.scorecard_revision,
        rubric_version: item.rubric_version,
        outcome: item.outcome,
      })),
    }),
    signal,
  }));
  const statsCalls = playbook.stats.reduce((sum, item) => sum + item.calls, 0);
  const citedIds = new Set(playbook.patterns.flatMap((item) => item.call_ids));
  const sourceIds = playbook.sources.map((item) => item.call_id);
  const sourceRubrics = new Set(playbook.sources.map((item) => item.rubric_version));
  const expectedSources = new Map(scorecards.map((item) => [item.call_id, item]));
  const sourceMismatch = playbook.sources.some((item) => {
    const expected = expectedSources.get(item.call_id);
    return !expected || item.source_external_id !== expected.source_external_id || item.source_revision !== expected.source_revision || item.scorecard_revision !== expected.scorecard_revision || item.rubric_version !== expected.rubric_version || item.outcome !== expected.outcome;
  });
  const wonSources = playbook.sources.filter((item) => item.outcome === "won").length;
  const notWonSources = playbook.sources.filter((item) => item.outcome === "lost" || item.outcome === "stalled").length;
  const wonStats = playbook.stats.find((item) => item.outcome_group === "won")?.calls;
  const notWonStats = playbook.stats.find((item) => item.outcome_group === "not_won")?.calls;
  if (statsCalls !== uniqueCallIds.length || sourceIds.length !== uniqueCallIds.length || sourceIds.some((id) => !uniqueCallIds.includes(id)) || new Set(sourceIds).size !== sourceIds.length || sourceRubrics.size !== 1 || sourceMismatch || wonStats !== wonSources || notWonStats !== notWonSources || !wonSources || !notWonSources || [...citedIds].some((id) => !uniqueCallIds.includes(id))) {
    throw new ApiError("Slipstream API returned a playbook for a different scorecard cohort", 409);
  }
  return playbook;
}

export async function getLatestPlaybook(signal?: AbortSignal): Promise<ApiPlaybook | null> {
  try {
    return parsePlaybook(await request<unknown>("/playbook/latest", { signal }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(payload?.detail ?? `Slipstream API returned ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

export async function runFixturePipeline(fixtureId: string): Promise<LivePipeline> {
  const call = await request<ApiCall>(`/calls/fixtures/${encodeURIComponent(fixtureId)}/ingest`, {
    method: "POST",
  });
  const extraction = await request<ApiExtraction>(`/calls/${call.id}/extract`, { method: "POST" });
  const draft = await request<ApiDraft>(`/drafts/from-call/${call.id}`, { method: "POST" });
  return { call, extraction, draft };
}

export function approveDraft(draftId: string): Promise<ApiDraft> {
  return request<unknown>(`/drafts/${encodeURIComponent(draftId)}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved_by: "Hackathon demo" }),
  }).then(parseDraft);
}

function evidenceSpan(field: { evidence: Evidence[] }): number | null {
  return field.evidence.find((item) => item.sequence != null)?.sequence ?? null;
}

function extracted<T>(field: ApiField<T>, emptyValue: T): Extracted<T> {
  return {
    value: field.value ?? emptyValue,
    confidence: field.confidence,
    span: evidenceSpan(field),
  };
}

export function mergeLivePipeline(fallback: CallRecord, live: LivePipeline): CallRecord {
  const { call, extraction: value, draft } = live;
  const prospect = value.contact.name.value ?? "Unknown contact";
  const rep = call.rep ?? "Unknown rep";
  const turns = call.segments.map((segment) => ({
    index: segment.sequence,
    speaker: segment.speaker === rep ? ("rep" as const) : ("prospect" as const),
    name: segment.speaker,
    text: segment.body,
    at: segment.start_ms / 1000,
  }));
  const liveOutcome = value.deal.outcome.value;
  const outcome =
    liveOutcome === "won" || liveOutcome === "lost" || liveOutcome === "stalled"
      ? liveOutcome
      : "open";
  const extraction: Extraction = {
    contact: {
      name: extracted(value.contact.name, prospect),
      role: extracted(value.contact.title, "Not found"),
      email: extracted(value.contact.email, "Not found"),
      phone: extracted(value.contact.phone, "Not found"),
    },
    company: {
      name: extracted(value.company.name, "Unknown company"),
      industry: extracted(value.company.industry, "Not found"),
      headcount: extracted(value.company.employee_count, 0),
      location: extracted(value.company.location, "Not found"),
    },
    deal: {
      stage: extracted(value.deal.stage, "Not found"),
      valueAud: extracted(value.deal.amount, 0),
      outcome: extracted(value.deal.outcome, "open"),
    },
    promises: value.promises
      .filter((item): item is ApiField<string> & { value: string } => item.value != null)
      .map((item) => extracted(item, item.value)),
    objections: value.objections.map((item) => ({
      text: item.text,
      handling: item.handling,
      span: evidenceSpan(item),
    })),
    nextStep: value.next_step
      ? {
          value: value.next_step.description,
          confidence: value.next_step.confidence,
          span: evidenceSpan(value.next_step),
        }
      : null,
    nextStepDue: value.next_step?.due_date ?? null,
  };

  return {
    ...fallback,
    id: call.source_external_id,
    rep,
    prospect,
    company: value.company.name.value ?? "Unknown company",
    domain: value.company.domain.value ?? "",
    at: call.occurred_at,
    durationSeconds: call.duration_seconds ?? 0,
    outcome,
    summary: value.summary,
    turns,
    extraction,
    draft: { subject: draft.subject, body: draft.body },
  };
}

export function mergeLiveScorecard(call: CallRecord, scorecard: ApiScorecard): CallRecord {
  const span = (evidence: { turn_index: number } | null | undefined) =>
    evidence ? call.turns[evidence.turn_index - 1]?.index ?? null : null;
  return {
    ...call,
    scorecard: {
      discoveryQuestions: {
        value: scorecard.discovery_questions,
        span: span(scorecard.discovery_evidence[0]),
      },
      nextStepSecured: {
        value: scorecard.next_step_secured,
        span: span(scorecard.next_step_evidence),
      },
      objectionHandling: {
        value: scorecard.objection_handling,
        span: span(scorecard.objection_evidence[0]),
      },
      talkRatio: scorecard.rep_talk_ratio,
      notes: scorecard.summary,
    },
  };
}
