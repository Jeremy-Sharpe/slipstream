import type { MatchEvidence } from "@/lib/types";
import { Timestamp } from "./Timestamp";

// Why this lead matched: each satisfied ICP attribute with the line from the
// won call that established it. The most important thing on the page.
export function MatchEvidenceList({ evidence }: { evidence: MatchEvidence[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] font-medium text-muted-foreground">Why this matched</p>
      {evidence.length === 0 && <p className="text-sm text-muted-foreground">The live leads API has not supplied transcript-level match evidence for this row.</p>}
      <ul className="flex flex-col gap-4">
        {evidence.map((e, i) => (
          <li key={i} className="flex flex-col gap-1">
            <span className="text-[13px] text-muted-foreground">{e.attribute}</span>
            <span className="text-sm text-ink">{e.value}</span>
            <p className="mt-0.5 text-sm text-signal">
              “{e.quote}”
              <span className="ml-2 text-[13px] text-muted-foreground">{e.call_label}</span>
              <span className="ml-2"><Timestamp ms={e.timestamp_ms} /></span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
