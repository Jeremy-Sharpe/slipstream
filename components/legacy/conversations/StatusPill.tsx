import { Check } from "lucide-react";
import type { ConversationStatus } from "@/lib/legacy/types";
import { cn } from "@/lib/legacy/utils";

const LABEL: Record<ConversationStatus, string> = {
  processing: "Processing",
  needs_review: "Needs review",
  action_ready: "Action ready",
  synced: "Synced",
};

// Monochrome on purpose: state is carried by the dot, not by colour.
export function StatusPill({ status }: { status: ConversationStatus }) {
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-legacy-md border border-border bg-card px-2.5 text-[13px] text-foreground/80">
      {status === "synced" ? (
        <Check className="size-3.5 text-muted-foreground" strokeWidth={2.5} />
      ) : (
        <span
          className={cn(
            "size-2 rounded-full",
            status === "processing" && "animate-pulse bg-primary",
            status === "needs_review" && "border-[1.5px] border-foreground/60 bg-transparent",
            status === "action_ready" && "bg-primary",
          )}
        />
      )}
      {LABEL[status]}
    </span>
  );
}
