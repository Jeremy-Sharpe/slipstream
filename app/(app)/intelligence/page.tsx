import { IntelligenceView } from "@/components/intelligence/IntelligenceView";
import { intelligence } from "@/lib/data/intelligence";

export default function IntelligencePage() {
  return <IntelligenceView data={intelligence} />;
}
