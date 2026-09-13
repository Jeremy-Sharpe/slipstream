import { apiUrl } from "./client";
import { ApiError, type ApiLead } from "./slipstream";

/* The two ICP endpoints the Leads page needs that the shared client does not
   wrap, plus a reader for the lead fields it does not type. */

async function post(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(payload?.detail ?? `Slipstream API returned ${response.status}`, response.status);
  }
  return response.json();
}

export async function loadIcpHistory(): Promise<void> {
  await post("/icp/history/load");
}

export async function deriveIcp(): Promise<void> {
  await post("/icp/derive", { include_demo: false });
}

export type LeadDetail = {
  industry: string | null;
  headcount: number | null;
  email: string | null;
  domain: string | null;
  rationale: string | null;
};

const str = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);

/** `/leads` carries these; the shared client's type stops at the fields it validates. */
export function leadDetail(lead: ApiLead): LeadDetail {
  const row = lead as unknown as Record<string, unknown>;
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const headcount = row.employee_count;
  return {
    industry: str(row.industry),
    headcount: typeof headcount === "number" && Number.isFinite(headcount) ? headcount : null,
    email: str(row.email),
    domain: str(row.company_domain),
    rationale: str(metadata.rationale),
  };
}
