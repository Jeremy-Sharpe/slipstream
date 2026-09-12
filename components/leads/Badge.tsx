import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLE: Record<LeadStatus, string> = {
  new: "bg-muted text-ink-2",
  drafted: "bg-primary-soft text-ink",
  approved: "bg-foreground text-background",
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
