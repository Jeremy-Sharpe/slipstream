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

// One badge style: grey fill. Active carries the only accent (a dot);
// approved is the dark badge, like Clay's.
export function StatusBadge({ status, className }: { status: CampaignStatus | PersonStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2.5 text-[13px] font-medium text-foreground",
        status === "approved" && "bg-foreground text-background",
        status === "skipped" && "text-muted-foreground",
        className,
      )}
    >
      {status === "active" && <span className="size-1.5 rounded-full bg-primary" />}
      {LABEL[status]}
    </span>
  );
}
