import type { ApiCampaign, ApiIcpProfile, ApiReadiness } from "@/lib/api/slipstream";

export const DEMO_CAMPAIGN_ID = "83b2a7b2-1ace-4dc5-b90a-d0dba9d2ed4c";
export const DEMO_CAMPAIGN_SCHEDULE = "2099-01-01T00:00:00.000Z";

export type ProofState<T> =
  | { status: "loading" }
  | { status: "verified"; value: T }
  | { status: "missing" }
  | { status: "failed" };

export type DemoProof = {
  runtime: ProofState<ApiReadiness>;
  icp: ProofState<ApiIcpProfile>;
  campaign: ProofState<ApiCampaign>;
};

export const EMPTY_DEMO_PROOF: DemoProof = {
  runtime: { status: "loading" },
  icp: { status: "loading" },
  campaign: { status: "loading" },
};

export function findDemoCampaign(campaigns: ApiCampaign[]): ProofState<ApiCampaign> {
  const campaign = campaigns.find((item) => item.id === DEMO_CAMPAIGN_ID);
  return campaign ? { status: "verified", value: campaign } : { status: "missing" };
}

export function campaignSafety(campaign: ApiCampaign): { verified: boolean; summary: string; detail: string } {
  const scheduledAt = Date.parse(campaign.scheduled_for);
  const scheduleMatches = Number.isFinite(scheduledAt) && new Date(scheduledAt).toISOString() === DEMO_CAMPAIGN_SCHEDULE;
  const noAttempts = campaign.items.every((item) => item.attempt_count === 0);
  const exactEnrollment = campaign.counts.queued === 1 && campaign.items.length === 1 && campaign.items[0]?.state === "queued";
  const controlled = campaign.status === "paused" && scheduleMatches && campaign.counts.sent === 0 && noAttempts && exactEnrollment;
  if (controlled) {
    return {
      verified: true,
      summary: `${campaign.counts.queued} queued · 0 sent`,
      detail: "The exact hackathon campaign is paused until 2099, with zero delivery attempts.",
    };
  }
  return {
    verified: false,
    summary: `${campaign.status} · ${campaign.counts.sent} sent`,
    detail: "The live campaign no longer matches the zero-send presentation guardrail. Inspect execution before presenting.",
  };
}

export function modelLabel(provider?: string, model?: string): string {
  if (!provider || !model) return "Proof unavailable";
  const providerLabel = ({ local: "Local", openrouter: "OpenRouter", openai: "OpenAI", anthropic: "Anthropic" } as Record<string, string>)[provider] ?? provider;
  return `${providerLabel} · ${model}`;
}

export function proofFooter(proof: DemoProof): string {
  const runtime = proof.runtime.status === "verified" ? "runtime verified" : proof.runtime.status === "loading" ? "runtime checking" : "runtime unavailable";
  const icp = proof.icp.status === "verified"
    ? `${proof.icp.value.profile.source_summary?.deals ?? "unreported"} CRM deals`
    : proof.icp.status === "loading" ? "ICP checking" : "ICP unavailable";
  const campaign = proof.campaign.status === "verified"
    ? campaignSafety(proof.campaign.value).verified ? "campaign guardrail verified" : "campaign guardrail changed"
    : proof.campaign.status === "loading" ? "campaign checking" : "campaign unavailable";
  return `${runtime} · ${icp} · ${campaign}`;
}
