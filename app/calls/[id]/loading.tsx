/* Mirrors RunView's layout (back link, avatar header, transcript grid with a
   440px rail) so the page settles in place when the run arrives. */
export default function Loading() {
  return (
    <div aria-busy>
      <div className="h-4 w-24 rounded bg-surface-2" />
      <div className="mt-3 flex items-center gap-3">
        <span className="size-9 rounded-full bg-surface" />
        <div>
          <div className="h-6 w-72 rounded bg-surface" />
          <div className="mt-1 h-5 w-52 rounded bg-surface-2" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_440px] gap-10">
        <div>
          <div className="mb-4 h-4 w-24 rounded bg-surface-2" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-surface-2" style={{ opacity: 1 - i * 0.1 }} />)}
          </div>
        </div>
        <div className="pr-3">
          <div className="mb-4 h-4 w-32 rounded bg-surface-2" />
          <div className="flex flex-col gap-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4" style={{ opacity: 1 - i * 0.1 }}>
                <span className="size-7 shrink-0 rounded-full bg-surface" />
                <span className="h-3.5 w-44 rounded bg-surface-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
