import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLE: Record<LeadStatus, string> = {
  new: "bg-muted text-ink-2",
  drafted: "bg-muted text-ink",
  approved: "bg-foreground text-background",
};

const LABEL: Record<LeadStatus, string> = { new: "New", drafted: "Drafted", approved: "Approved" };

export function Badge({ status }: { status: LeadStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-xs font-medium", STYLE[status])}>
      {LABEL[status]}
    </span>
  );
}
