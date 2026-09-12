import type { CampaignStatus, PersonStatus } from "@/lib/types/campaigns";
import { cn } from "@/lib/utils";

const LABEL: Record<CampaignStatus | PersonStatus, string> = {
  active: "Active",
  paused: "Paused",
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  skipped: "Skipped",
};

// Grey badges; only "active" and "approved" carry a tangerine dot.
export function StatusBadge({ status, className }: { status: CampaignStatus | PersonStatus; className?: string }) {
  const lit = status === "active" || status === "approved";
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-3 text-[13px] font-medium text-foreground", status === "skipped" && "text-muted-foreground", className)}>
      {lit && <span className="size-1.5 rounded-full bg-primary" />}
      {LABEL[status]}
    </span>
  );
}
