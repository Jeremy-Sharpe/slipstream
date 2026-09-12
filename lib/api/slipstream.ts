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
  storage: string;
  integrations: Record<string, boolean>;
};

export type ApiIcpProfile = {
  id: string;
  version: number;
  evidence: Array<{ attribute: string; deal_ids: string[]; why: string }>;
  profile: {
    summary: string;
    industries: string[];
    headcount_band: string;
    roles: string[];
    triggers: string[];
    confidence: number;
    origami_brief: string;
  };
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
  return { revision: value.revision, storage: value.storage, integrations };
}

function parseIcpProfile(value: unknown): ApiIcpProfile {
  if (!isRecord(value) || typeof value.id !== "string" || !Number.isInteger(value.version) || !Array.isArray(value.evidence) || !isRecord(value.profile)) {
    throw new ApiError("Slipstream API returned malformed ICP data", 502);
  }
  const profile = value.profile;
  const confidence = profile.confidence;
  const validProfile =
    typeof profile.summary === "string" &&
    isStringArray(profile.industries) &&
    typeof profile.headcount_band === "string" &&
    isStringArray(profile.roles) &&
    isStringArray(profile.triggers) &&
    typeof confidence === "number" &&
    Number.isFinite(confidence) &&
    confidence >= 0 && confidence <= 1 &&
    typeof profile.origami_brief === "string";
  const validEvidence = value.evidence.every((item) =>
    isRecord(item) &&
    typeof item.attribute === "string" &&
    isStringArray(item.deal_ids) &&
    typeof item.why === "string",
  );
  if (!validProfile || !validEvidence) {
    throw new ApiError("Slipstream API returned malformed ICP data", 502);
  }
  return value as ApiIcpProfile;
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

export async function getReadiness(): Promise<ApiReadiness> {
  const response = await fetch(`${API_BASE_URL}/ready`);
  if (!response.ok) throw new ApiError(`Slipstream API returned ${response.status}`, response.status);
  const payload: unknown = await response.json().catch(() => null);
  return parseReadiness(payload);
}

export async function getLatestIcp(): Promise<ApiIcpProfile | null> {
  try {
    return parseIcpProfile(await request<unknown>("/icp/latest"));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getLeads(icpProfileId?: string, signal?: AbortSignal): Promise<ApiLead[]> {
  const query = icpProfileId ? `?icp_profile_id=${encodeURIComponent(icpProfileId)}` : "";
  const payload = await request<unknown>(`/leads${query}`, { signal });
  if (!Array.isArray(payload)) throw new ApiError("Slipstream API returned malformed leads data", 502);
  return payload.map(parseLead);
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
  return request<ApiDraft>(`/drafts/${draftId}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved_by: "Hackathon demo" }),
  });
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
