import { IntelligenceView } from "@/components/intelligence/IntelligenceView";
import { getIntelligence } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  return <IntelligenceView intelligence={await getIntelligence()} />;
}
