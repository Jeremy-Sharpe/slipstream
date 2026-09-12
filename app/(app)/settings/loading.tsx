export default function Loading() {
  return (
    <div className="flex flex-col px-9 pt-8" aria-busy="true" aria-label="Loading settings">
      <div className="flex items-center gap-4">
        <div className="size-10 animate-pulse rounded-lg bg-muted" />
        <div className="h-6 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-8 flex gap-8 border-t border-border pt-6">
        <div className="flex w-[200px] flex-col gap-1">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-md bg-muted" style={{ opacity: 1 - i * 0.12 }} />)}</div>
        <div className="h-72 max-w-3xl flex-1 animate-pulse rounded-lg bg-muted/60" />
      </div>
    </div>
  );
}
