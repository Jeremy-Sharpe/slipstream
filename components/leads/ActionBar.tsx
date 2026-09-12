import { ChevronDown } from "lucide-react";

export function ActionBar({ pending, onApproveAll }: { pending: number; onApproveAll: () => void }) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-end border-t border-line bg-card pr-6">
      <button
        type="button"
        onClick={onApproveAll}
        disabled={pending === 0}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-3 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
      >
        Approve all drafts
        <ChevronDown className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
