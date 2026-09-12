"use client";

import Link from "next/link";
import { use } from "react";
import { CampaignDetail } from "@/components/campaigns/CampaignDetail";
import { useCampaign } from "@/components/campaigns/store";

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const campaign = useCampaign(id);
  if (!campaign) {
    return (
      <div className="flex h-[calc(100vh-56px)] flex-col items-center justify-center gap-2 text-center">
        <p className="text-[15px] text-foreground">That campaign doesn't exist any more.</p>
        <Link href="/campaigns" className="text-sm font-medium text-primary hover:underline">Back to campaigns</Link>
      </div>
    );
  }
  return <CampaignDetail campaign={campaign} />;
}
