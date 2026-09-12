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
    <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-foreground/80">
      {status === "synced" ? (
        <Check className="size-3 text-muted-foreground" strokeWidth={2.5} />
      ) : (
        <span
          className={cn(
            "size-1.5 rounded-full",
            status === "processing" && "animate-pulse bg-foreground/40",
            status === "needs_review" && "border border-foreground bg-transparent",
            status === "action_ready" && "bg-foreground",
          )}
        />
      )}
      {LABEL[status]}
    </span>
  );
}
