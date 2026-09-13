import type { LeadStatus } from "@/lib/legacy/types";
import { cn } from "@/lib/legacy/utils";

const STYLE: Record<LeadStatus, string> = {
  new: "bg-legacy-muted text-ink-2",
  drafted: "bg-primary-soft text-legacy-ink",
  approved: "bg-foreground text-legacy-background",
  rejected: "bg-destructive/10 text-destructive",
};

const LABEL: Record<LeadStatus, string> = { new: "New", drafted: "Drafted", approved: "Approved", rejected: "Rejected" };

export function Badge({ status }: { status: LeadStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-[3px] text-[13px] font-medium", STYLE[status])}>
      {LABEL[status]}
    </span>
  );
}
