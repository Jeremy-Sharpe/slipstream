import type { Metadata } from "next";
import { SettingsView } from "@/components/SettingsView";
import { getReadiness } from "@/lib/api/slipstream";

export const metadata: Metadata = { title: "Settings · Slipstream" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const readiness = await getReadiness().catch(() => null);
  return <SettingsView crmConnected={readiness ? Boolean(readiness.integrations.crm_webhook) : null} />;
}
