import { Filter } from "lucide-react";
import { IconButton } from "./IconButton";

export function ResultBar({ count, total, provenance, updatedAt, filtersHidden, onShowFilters }: {
  count: number;
  total: number;
  provenance: string;
  updatedAt: Date | null;
  filtersHidden: boolean;
  onShowFilters: () => void;
}) {
  return (
    <div className="flex h-[62px] shrink-0 items-center border-b border-legacy-line pl-[22px] text-[17px] text-legacy-ink">
      {filtersHidden && (
        <>
          <IconButton aria-label="Show filters" onClick={onShowFilters}>
            <Filter className="size-[18px]" strokeWidth={1.75} />
          </IconButton>
          <span className="mx-3.5 h-6 w-px bg-legacy-line" aria-hidden />
        </>
      )}
      <span className="font-semibold">Preview</span>
      <span className="mx-2 text-muted-foreground">·</span>
      <span className="tabular-nums text-legacy-ink">{count} of {total.toLocaleString("en-AU")} (~{total.toLocaleString("en-AU")} found)</span>
      <span className="mx-2 text-muted-foreground">·</span>
      <span className="text-muted-foreground">{provenance}</span>
      {updatedAt && (
        <>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">Updated just now</span>
        </>
      )}
    </div>
  );
}
