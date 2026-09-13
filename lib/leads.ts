import { leadDetail } from "./api/leads";
import type { ApiIcpProfile, ApiLead } from "./api/slipstream";
import type { Evidence, Lead, LeadStatus } from "./types";

/* API rows to the shape the sheet and the slide-over read. Mapping only: every
   value here comes from `/leads` or from the derived ICP profile. */

const STATUS: Record<ApiLead["status"], LeadStatus> = {
  new: "new",
  rejected: "new",
  reviewed: "drafted",
  approved: "approved",
  contacted: "approved",
};

const ATTRIBUTES: Record<string, string> = {
  industry: "Industry",
  headcount_band: "Company size",
  contact_role: "Buyer",
  trigger: "Trigger",
};

export function toLead(api: ApiLead, searchId: string, profile: ApiIcpProfile | null): Lead {
  const detail = leadDetail(api);
  return {
    id: api.id,
    company: api.company_name,
    synthetic: api.metadata?.synthetic === true,
    contact: api.person_name ?? "Unknown contact",
    title: api.title ?? "",
    location: api.location ?? "",
    industry: detail.industry ?? "",
    headcount: detail.headcount,
    similarity: Math.round((api.similarity_score ?? 0) * 100),
    status: STATUS[api.status],
    trigger: detail.rationale ?? profile?.profile.triggers[0] ?? "",
    linkedinUrl: api.linkedin_url,
    email: detail.email,
    searchId,
    evidence: evidenceFor(api, profile),
    draft: null,
  };
}

/** The ICP attributes this lead matched on, with the won deals each came from. */
export function evidenceFor(api: ApiLead, profile: ApiIcpProfile | null): Evidence[] {
  if (!profile) return [];
  const detail = leadDetail(api);
  const companies = new Map((profile.source_deals ?? []).map((deal) => [deal.deal_id, deal.company_name]));
  const value = (attribute: string) => {
    switch (attribute) {
      case "industry": return detail.industry ?? profile.profile.industries.join(", ");
      case "headcount_band": return detail.headcount ? `${detail.headcount} staff` : `${profile.profile.headcount_band} staff`;
      case "contact_role": return api.title ?? profile.profile.roles.join(", ");
      case "trigger": return detail.rationale ?? profile.profile.triggers[0] ?? "";
      default: return "";
    }
  };
  return profile.evidence.map((item) => ({
    attribute: ATTRIBUTES[item.attribute] ?? item.attribute,
    value: value(item.attribute),
    why: item.why,
    deals: item.deal_ids.map((id) => companies.get(id)).filter((name): name is string => !!name),
  }));
}
