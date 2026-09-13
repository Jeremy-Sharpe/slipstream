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

export function settleDemoProof(
  runtime: PromiseSettledResult<ApiReadiness>,
  icp: PromiseSettledResult<ApiIcpProfile | null>,
  campaigns: PromiseSettledResult<ApiCampaign[]>,
): DemoProof {
  return {
    runtime: runtime.status === "fulfilled" ? { status: "verified", value: runtime.value } : { status: "failed" },
    icp: icp.status === "fulfilled" ? icp.value ? { status: "verified", value: icp.value } : { status: "missing" } : { status: "failed" },
    campaign: campaigns.status === "fulfilled" ? findDemoCampaign(campaigns.value) : { status: "failed" },
  };
}

export function icpClaimSafety(profile: ApiIcpProfile): { cohort: boolean; citedProfile: boolean; brief: boolean } {
  const source = profile.profile.source_summary;
  const cohort = Boolean(source && source.deals > 0 && source.calls + source.emails > 0 && source.outcome_labelled > 0);
  const supported = new Set(profile.evidence.filter((item) => item.why.trim().length > 0 && item.deal_ids.length > 0 && item.deal_ids.every((id) => id.trim().length > 0)).map((item) => item.attribute));
  const citedProfile = cohort
    && profile.profile.headcount_band.trim().length > 0
    && profile.profile.industries.some((industry) => industry.trim().length > 0)
    && supported.has("industry")
    && supported.has("headcount_band");
  const brief = citedProfile
    && profile.profile.roles.some((role) => role.trim().length > 0)
    && profile.profile.triggers.some((trigger) => trigger.trim().length > 0)
    && supported.has("contact_role")
    && supported.has("trigger")
    && profile.profile.origami_brief.trim().length > 0;
  return { cohort, citedProfile, brief };
}

export function findDemoCampaign(campaigns: ApiCampaign[]): ProofState<ApiCampaign> {
  const campaign = campaigns.find((item) => item.id === DEMO_CAMPAIGN_ID);
  return campaign ? { status: "verified", value: campaign } : { status: "missing" };
}

export function campaignSafety(campaign: ApiCampaign): { verified: boolean; summary: string; detail: string } {
  const scheduledAt = Date.parse(campaign.scheduled_for);
  const scheduleMatches = Number.isFinite(scheduledAt) && new Date(scheduledAt).toISOString() === DEMO_CAMPAIGN_SCHEDULE;
  const noAttempts = campaign.items.every((item) => item.attempt_count === 0);
  const noOtherStates = campaign.counts.running === 0 && campaign.counts.sent === 0 && campaign.counts.retryable === 0 && campaign.counts.failed === 0 && campaign.counts.reconcile === 0;
  const item = campaign.items[0];
  const noDeliveryEvidence = item?.receipt == null && item?.http_status == null && item?.last_attempt_at == null && item?.outcome == null && item?.retryable === false && item?.reconciliation_required === false;
  const exactEnrollment = campaign.counts.queued === 1 && campaign.items.length === 1 && item?.state === "queued";
  const controlled = campaign.status === "paused" && scheduleMatches && noOtherStates && noAttempts && noDeliveryEvidence && exactEnrollment;
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

export function parseStoredStep(value: string | null, stepCount: number): number {
  if (value == null || value.trim() === "") return -1;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < stepCount ? parsed : -1;
}

export function nextPresenterStep(current: number, stepCount: number): number {
  return current < 0 || current >= stepCount - 1 ? 0 : current + 1;
}

export function playbackLabel(reducedMotion: boolean, playing: boolean, active: number, stepCount: number): string {
  if (reducedMotion) return active < 0 ? "Start loop" : active >= stepCount - 1 ? "Restart loop" : "Next step";
  return playing ? "Pause guided loop" : active < 0 ? "Play guided loop" : active >= stepCount - 1 ? "Restart guided loop" : "Resume guided loop";
}

export function modelLabel(provider?: string, model?: string): string {
  const cleanProvider = provider?.trim();
  const cleanModel = model?.trim();
  if (!cleanProvider || !cleanModel) return "Proof unavailable";
  const providerLabel = ({ local: "Local", openrouter: "OpenRouter", openai: "OpenAI", anthropic: "Anthropic" } as Record<string, string>)[cleanProvider] ?? cleanProvider;
  return `${providerLabel} · ${cleanModel}`;
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
