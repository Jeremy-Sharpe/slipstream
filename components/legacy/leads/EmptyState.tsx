export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-1 text-center">
      <p className="text-[15px] font-semibold text-legacy-ink">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
