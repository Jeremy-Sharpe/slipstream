// 44px track plus the number, right-aligned in its cell.
export function ScoreBar({ value }: { value: number | null }) {
  if (value == null) return <span className="ml-auto text-[13px] text-muted-foreground">Not scored</span>;
  return (
    <span className="ml-auto flex items-center justify-end gap-2">
      <span className="h-1 w-11 overflow-hidden rounded-legacy-sm bg-legacy-line" aria-hidden>
        <span className="block h-full rounded-legacy-sm bg-foreground" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </span>
      <span className="w-7 text-right text-[15px] text-legacy-ink tabular-nums">{value}</span>
    </span>
  );
}
