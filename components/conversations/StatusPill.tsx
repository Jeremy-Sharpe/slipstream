import { Check } from "lucide-react";
import type { ConversationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL: Record<ConversationStatus, string> = {
  processing: "Processing",
  needs_review: "Needs review",
  action_ready: "Action ready",
  synced: "Synced",
};

// Monochrome on purpose: state is carried by the dot, not by colour.
export function StatusPill({ status }: { status: ConversationStatus }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[12px] font-medium text-foreground">
      {status === "synced" ? (
        <Check className="size-3.5 text-muted-foreground" strokeWidth={2} />
      ) : (
        <span
          className={cn(
            "size-2 rounded-full",
            status === "processing" && "animate-pulse bg-primary",
            status === "needs_review" && "border border-muted-foreground bg-transparent",
            status === "action_ready" && "bg-primary",
          )}
        />
      )}
      {LABEL[status]}
    </span>
  );
}
