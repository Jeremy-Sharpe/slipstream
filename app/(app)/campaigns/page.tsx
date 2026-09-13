import { CampaignsList } from "@/components/campaigns/CampaignsList";
import { getCampaigns, getIcpFreshness, type ApiCampaign, type ApiIcpFreshness } from "@/lib/api/slipstream";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const [campaignResult, freshnessResult] = await Promise.allSettled([
    getCampaigns(),
    getIcpFreshness(),
  ]);
  const initialCampaigns: ApiCampaign[] | null = campaignResult.status === "fulfilled" ? campaignResult.value : null;
  const initialFreshness: ApiIcpFreshness | null = freshnessResult.status === "fulfilled" ? freshnessResult.value : null;
  const initialFreshnessError = freshnessResult.status === "rejected" ? "Revenue DNA API unavailable during initial render" : undefined;
  return <CampaignsList initialLiveCampaigns={initialCampaigns} initialFreshness={initialFreshness} initialFreshnessError={initialFreshnessError} />;
}
