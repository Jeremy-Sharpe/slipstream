export function formatTimestamp(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Timestamp({ ms }: { ms: number }) {
  return <span className="font-mono text-[13px] text-muted-foreground tabular-nums">{formatTimestamp(ms)}</span>;
}
