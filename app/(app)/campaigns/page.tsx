import { CampaignsList } from "@/components/campaigns/CampaignsList";
import { getCampaigns, type ApiCampaign } from "@/lib/api/slipstream";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  let initialCampaigns: ApiCampaign[] | null;
  try {
    initialCampaigns = await getCampaigns();
  } catch {
    initialCampaigns = null;
  }
  return <CampaignsList initialLiveCampaigns={initialCampaigns} />;
}
