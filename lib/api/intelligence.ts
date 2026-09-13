import { apiUrl } from "@/lib/api/client";
import { ApiError, type ApiCall, type ApiIcpFreshness, type ApiIcpProfile } from "@/lib/api/slipstream";

// Endpoints the Intelligence and Revenue loop screens need that the shared
// client does not wrap yet. Same request + parse shape as lib/api/slipstream.ts.

export type ApiFixtureSummary = {
  call_id: string;
  company: string;
  prospect: string;
  rep: string;
  outcome: "won" | "stalled" | "lost" | "no_show";
  scheduled_at: string;
  demo: boolean;
  has_audio: boolean;
};

export type ApiFixtureCall = ApiCall & { subject: string; fixture: boolean };

export type ApiIcpHistoryCounts = {
  companies: number;
  contacts: number;
  deals: number;
  outcomes: Record<string, number>;
};

export type ApiExtractionField = { value: unknown; confidence: number };

export type ApiCallExtraction = {
  contact: Record<string, ApiExtractionField>;
  company: Record<string, ApiExtractionField>;
  deal: Record<string, ApiExtractionField>;
  promises: ApiExtractionField[];
  objections: unknown[];
  next_step: { description: string; due_date: string | null; owner: string | null; confidence: number } | null;
  summary: string;
  model: string;
  prompt_version: string;
  grounding: { repaired: number; dropped: number };
};

export type ApiDemoSampleLead = {
  company_name: string;
  person_name: string | null;
  title: string | null;
  industry: string | null;
  relevance_score: number | null;
  similarity_score: number | null;
  rationale: string | null;
};

export type ApiDemoEvidence = {
  status: string;
  claim: string;
  icp: ApiIcpProfile | null;
  lead_provider: string;
  lead_count: number;
  all_fictional: boolean;
  delivery_enabled: boolean;
  models: string[];
  sample_leads: ApiDemoSampleLead[];
  revenue_dna: ApiIcpFreshness | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isField(value: unknown): value is ApiExtractionField {
  return isRecord(value) && typeof value.confidence === "number" && "value" in value;
}

// `deal` carries a plain `currency` alongside its fields, so take the
// field-shaped entries and require at least one.
function fieldGroup(value: unknown, label: string): Record<string, ApiExtractionField> {
  const fields = isRecord(value) ? Object.entries(value).filter((entry): entry is [string, ApiExtractionField] => isField(entry[1])) : [];
  if (!fields.length) throw new ApiError(`Slipstream API returned malformed ${label} fields`, 502);
  return Object.fromEntries(fields);
}

function parseFixtureSummary(value: unknown): ApiFixtureSummary {
  const outcomes = new Set(["won", "stalled", "lost", "no_show"]);
  if (
    !isRecord(value) ||
    typeof value.call_id !== "string" ||
    typeof value.company !== "string" ||
    typeof value.prospect !== "string" ||
    typeof value.rep !== "string" ||
    typeof value.outcome !== "string" ||
    !outcomes.has(value.outcome) ||
    typeof value.scheduled_at !== "string" ||
    !Number.isFinite(Date.parse(value.scheduled_at)) ||
    typeof value.demo !== "boolean" ||
    typeof value.has_audio !== "boolean"
  ) {
    throw new ApiError("Slipstream API returned malformed fixture data", 502);
  }
  return value as ApiFixtureSummary;
}

function parseCall(value: unknown): ApiFixtureCall {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.source_external_id !== "string" ||
    typeof value.subject !== "string" ||
    typeof value.occurred_at !== "string" ||
    !Array.isArray(value.segments) ||
    !value.segments.every((segment) =>
      isRecord(segment) &&
      Number.isSafeInteger(segment.sequence) &&
      typeof segment.speaker === "string" &&
      typeof segment.body === "string" &&
      Number.isFinite(segment.start_ms),
    )
  ) {
    throw new ApiError("Slipstream API returned malformed call data", 502);
  }
  return value as unknown as ApiFixtureCall;
}

function parseExtraction(value: unknown): ApiCallExtraction {
  if (!isRecord(value) || typeof value.summary !== "string" || !isRecord(value.grounding)) {
    throw new ApiError("Slipstream API returned malformed extraction data", 502);
  }
  const { repaired, dropped } = value.grounding;
  if (!Number.isSafeInteger(repaired) || !Number.isSafeInteger(dropped)) {
    throw new ApiError("Slipstream API returned malformed grounding counts", 502);
  }
  const nextStep = value.next_step;
  if (nextStep !== null && !(isRecord(nextStep) && typeof nextStep.description === "string" && typeof nextStep.confidence === "number")) {
    throw new ApiError("Slipstream API returned a malformed next step", 502);
  }
  return {
    contact: fieldGroup(value.contact, "contact"),
    company: fieldGroup(value.company, "company"),
    deal: fieldGroup(value.deal, "deal"),
    promises: Array.isArray(value.promises) && value.promises.every(isField) ? (value.promises as ApiExtractionField[]) : [],
    objections: Array.isArray(value.objections) ? value.objections : [],
    next_step: nextStep as ApiCallExtraction["next_step"],
    summary: value.summary,
    model: typeof value.model === "string" ? value.model : "",
    prompt_version: typeof value.prompt_version === "string" ? value.prompt_version : "",
    grounding: { repaired: Number(repaired), dropped: Number(dropped) },
  };
}

function parseDemoEvidence(value: unknown): ApiDemoEvidence {
  if (
    !isRecord(value) ||
    typeof value.status !== "string" ||
    typeof value.claim !== "string" ||
    typeof value.lead_provider !== "string" ||
    !Number.isSafeInteger(value.lead_count) ||
    typeof value.all_fictional !== "boolean" ||
    typeof value.delivery_enabled !== "boolean" ||
    !Array.isArray(value.sample_leads)
  ) {
    throw new ApiError("Slipstream API returned malformed demo evidence", 502);
  }
  const sampleLeads = value.sample_leads.map((lead) => {
    if (!isRecord(lead) || typeof lead.company_name !== "string") {
      throw new ApiError("Slipstream API returned malformed sample leads", 502);
    }
    return lead as unknown as ApiDemoSampleLead;
  });
  return {
    status: value.status,
    claim: value.claim,
    icp: isRecord(value.icp) ? (value.icp as unknown as ApiIcpProfile) : null,
    lead_provider: value.lead_provider,
    lead_count: Number(value.lead_count),
    all_fictional: value.all_fictional,
    delivery_enabled: value.delivery_enabled,
    models: Array.isArray(value.models) ? value.models.filter((model): model is string => typeof model === "string") : [],
    sample_leads: sampleLeads,
    revenue_dna: isRecord(value.revenue_dna) ? (value.revenue_dna as unknown as ApiIcpFreshness) : null,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(payload?.detail ?? `Slipstream API returned ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

export async function getFixtures(signal?: AbortSignal): Promise<ApiFixtureSummary[]> {
  const payload = await request<unknown>("/calls/fixtures", { signal });
  if (!Array.isArray(payload)) throw new ApiError("Slipstream API returned malformed fixture data", 502);
  return payload.map(parseFixtureSummary);
}

export async function ingestFixture(callId: string, signal?: AbortSignal): Promise<ApiFixtureCall> {
  return parseCall(await request<unknown>(`/calls/fixtures/${encodeURIComponent(callId)}/ingest`, { method: "POST", signal }));
}

export async function getCall(conversationId: string, signal?: AbortSignal): Promise<ApiFixtureCall | null> {
  try {
    return parseCall(await request<unknown>(`/calls/${encodeURIComponent(conversationId)}`, { signal }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getCallExtraction(conversationId: string, signal?: AbortSignal): Promise<ApiCallExtraction | null> {
  try {
    return parseExtraction(await request<unknown>(`/calls/${encodeURIComponent(conversationId)}/extraction`, { signal }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function loadIcpHistory(signal?: AbortSignal): Promise<ApiIcpHistoryCounts> {
  const payload = await request<unknown>("/icp/history/load", { method: "POST", signal });
  if (!isRecord(payload) || !Number.isSafeInteger(payload.deals)) {
    throw new ApiError("Slipstream API returned malformed history counts", 502);
  }
  return payload as unknown as ApiIcpHistoryCounts;
}

export async function deriveIcp(includeDemo = false, signal?: AbortSignal): Promise<ApiIcpProfile> {
  const payload = await request<unknown>("/icp/derive", {
    method: "POST",
    body: JSON.stringify({ include_demo: includeDemo }),
    signal,
  });
  if (!isRecord(payload) || typeof payload.id !== "string" || !isRecord(payload.profile)) {
    throw new ApiError("Slipstream API returned malformed ICP data", 502);
  }
  return payload as unknown as ApiIcpProfile;
}

export async function getDemoEvidence(signal?: AbortSignal): Promise<ApiDemoEvidence> {
  return parseDemoEvidence(await request<unknown>("/demo/evidence", { signal }));
}

const URL_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

/** The API derives a fixture's conversation id as uuid5(URL namespace, "slipstream:" + call_id). */
export async function fixtureConversationId(callId: string): Promise<string> {
  const namespace = Uint8Array.from((URL_NAMESPACE.replace(/-/g, "").match(/../g) ?? []).map((byte) => parseInt(byte, 16)));
  const name = new TextEncoder().encode(`slipstream:${callId}`);
  const input = new Uint8Array(namespace.length + name.length);
  input.set(namespace);
  input.set(name, namespace.length);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-1", input)).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
