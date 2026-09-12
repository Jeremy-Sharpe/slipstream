import { SlidersHorizontal } from "lucide-react";

export function ResultBar({ count, dealCount }: { count: number; dealCount: number }) {
  return (
    <div className="flex h-12 shrink-0 items-center pl-4">
      <SlidersHorizontal className="size-4 text-muted-foreground" strokeWidth={1.75} />
      <span className="mx-3 h-5 w-px bg-line" aria-hidden />
      <p className="text-[15px] font-semibold text-ink">
        {count} leads <span className="text-muted-foreground">·</span> from the ICP derived across {dealCount} won deals
      </p>
    </div>
  );
}
