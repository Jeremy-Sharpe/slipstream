export function ResultBar({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex h-16 shrink-0 items-center border-b border-line px-5 text-[17px] text-ink">
      <span className="font-semibold">Preview</span>
      <span className="mx-2 text-muted-foreground">·</span>
      <span className="tabular-nums">{count} of {total.toLocaleString("en-AU")} (~{total.toLocaleString("en-AU")} found)</span>
    </div>
  );
}
