export default function Loading() {
  return (
    <div className="flex flex-col px-9 pt-8" aria-busy="true" aria-label="Loading calendar">
      <div className="flex items-center gap-4">
        <div className="size-10 animate-pulse rounded-lg bg-muted" />
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-8 grid grid-cols-[320px_1fr] gap-0 border-t border-border">
        <div className="flex flex-col gap-3 border-r border-border py-5 pr-5">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 animate-pulse rounded bg-muted" style={{ opacity: 1 - i * 0.12 }} />)}
        </div>
        <div className="grid grid-cols-7 gap-px pl-px pt-12">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-[440px] animate-pulse rounded bg-muted/60" />)}
        </div>
      </div>
    </div>
  );
}
