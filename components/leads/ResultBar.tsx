import { Filter } from "lucide-react";
import { IconButton } from "./IconButton";

export function ResultBar({ count, total, dealCount, updatedAt, filtersHidden, onShowFilters }: {
  count: number;
  total: number;
  dealCount: number;
  updatedAt: Date | null;
  filtersHidden: boolean;
  onShowFilters: () => void;
}) {
  return (
    <div className="flex h-16 shrink-0 items-center border-b border-line px-5 text-[17px] text-ink">
      {filtersHidden && (
        <>
          <IconButton aria-label="Show filters" onClick={onShowFilters}>
            <Filter className="size-4" strokeWidth={1.75} />
          </IconButton>
          <span className="mx-3 h-5 w-px bg-line" aria-hidden />
        </>
      )}
      <span className="font-semibold">Preview</span>
      <span className="mx-2 text-muted-foreground">·</span>
      <span className="tabular-nums">{count} of {total.toLocaleString("en-AU")} (~{total.toLocaleString("en-AU")} found)</span>
      <span className="mx-2 text-muted-foreground">·</span>
      <span className="text-muted-foreground">from the ICP derived across {dealCount} won deals</span>
      {updatedAt && (
        <>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">Updated just now</span>
        </>
      )}
    </div>
  );
}
