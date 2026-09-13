import { RevenueLoop } from "@/components/demo/RevenueLoop";
import { getCampaigns, getLatestIcp, getReadiness } from "@/lib/api/slipstream";
import { settleDemoProof } from "@/lib/demo/revenue-loop";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const [runtime, icp, campaigns] = await Promise.allSettled([
    getReadiness(),
    getLatestIcp(),
    getCampaigns(),
  ]);
  return <RevenueLoop initialProof={settleDemoProof(runtime, icp, campaigns)} />;
}
