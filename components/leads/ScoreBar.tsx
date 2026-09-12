// 44px track plus the number, right-aligned in its cell.
export function ScoreBar({ value }: { value: number }) {
  return (
    <span className="ml-auto flex items-center justify-end gap-2">
      <span className="h-1 w-11 overflow-hidden rounded-sm bg-line" aria-hidden>
        <span className="block h-full rounded-sm bg-foreground" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </span>
      <span className="w-7 text-right text-[15px] text-ink tabular-nums">{value}</span>
    </span>
  );
}
