// Skeleton in the shape of the page: header, quick links, tiles, first card.
export default function Loading() {
  return (
    <div className="px-9 pt-7" aria-busy="true" aria-label="Loading intelligence">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="size-10 rounded-lg bg-muted" />
          <span className="h-7 w-40 rounded bg-muted" />
        </div>
        <div className="flex gap-3">
          <span className="h-10 w-[280px] rounded-lg bg-muted" />
          <span className="h-10 w-36 rounded-lg bg-muted" />
        </div>
      </div>
      <span className="mt-12 block h-4 w-24 rounded bg-muted" />
      <div className="mt-4 grid grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <span key={i} className="h-[72px] rounded-xl bg-muted" />)}
      </div>
      <div className="mt-10 grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <span key={i} className="h-[118px] rounded-xl bg-muted" />)}
      </div>
      <span className="mt-6 block h-72 rounded-xl bg-muted" />
    </div>
  );
}
