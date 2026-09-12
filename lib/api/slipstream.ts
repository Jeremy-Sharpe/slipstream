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

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
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
  return request<ApiDraft>(`/drafts/${draftId}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved_by: "Hackathon demo" }),
  });
}

function evidenceSpan(field: { evidence: Evidence[] }): number | null {
  return field.evidence.find((item) => item.sequence != null)?.sequence ?? null;
}

function extracted<T>(field: ApiField<T>, fallback: T): Extracted<T> {
  return {
    value: field.value ?? fallback,
    confidence: field.confidence,
    span: evidenceSpan(field),
  };
}

export function mergeLivePipeline(fallback: CallRecord, live: LivePipeline): CallRecord {
  const { call, extraction: value, draft } = live;
  const prospect = value.contact.name.value ?? fallback.prospect;
  const rep = call.rep ?? fallback.rep;
  const turns = call.segments.map((segment) => ({
    index: segment.sequence,
    speaker: segment.speaker === rep ? ("rep" as const) : ("prospect" as const),
    name: segment.speaker,
    text: segment.body,
    at: segment.start_ms / 1000,
  }));
  const extraction: Extraction = {
    contact: {
      name: extracted(value.contact.name, prospect),
      role: extracted(value.contact.title, fallback.extraction.contact.role.value),
      email: extracted(value.contact.email, fallback.extraction.contact.email.value),
      phone: extracted(value.contact.phone, fallback.extraction.contact.phone.value),
    },
    company: {
      name: extracted(value.company.name, fallback.company),
      industry: extracted(value.company.industry, fallback.extraction.company.industry.value),
      headcount: extracted(value.company.employee_count, fallback.extraction.company.headcount.value),
      location: extracted(value.company.location, fallback.extraction.company.location.value),
    },
    deal: {
      stage: extracted(value.deal.stage, fallback.extraction.deal.stage.value),
      valueAud: extracted(value.deal.amount, fallback.extraction.deal.valueAud.value),
      outcome: extracted(value.deal.outcome, fallback.extraction.deal.outcome.value),
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
    company: value.company.name.value ?? fallback.company,
    domain: value.company.domain.value ?? fallback.domain,
    at: call.occurred_at,
    durationSeconds: call.duration_seconds ?? fallback.durationSeconds,
    summary: value.summary,
    turns: turns.length ? turns : fallback.turns,
    extraction,
    draft: { subject: draft.subject, body: draft.body },
  };
}
