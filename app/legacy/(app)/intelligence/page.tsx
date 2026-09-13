import { IntelligenceView } from "@/components/legacy/intelligence/IntelligenceView";
import { intelligence } from "@/lib/legacy/data/intelligence";

export default function IntelligencePage() {
  return <IntelligenceView data={intelligence} />;
}
