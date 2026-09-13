/* Mirrors LeadsView: title, subtitle, then the brief column and the sheet
   at the same x and y, so the page settles without a jump. */
export default function Loading() {
  return (
    <div aria-busy className="flex h-[calc(100vh-72px)] flex-col">
      <div className="shrink-0">
        <div className="h-9 w-24 rounded-md bg-surface" />
        <div className="mt-2 h-5 w-[420px] rounded bg-surface-2" />
      </div>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[380px_1px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col pr-8">
          <div className="flex h-12 shrink-0 items-center border-b border-line"><span className="h-3.5 w-10 rounded bg-surface" /></div>
          <div className="mt-3 h-64 rounded-2xl bg-surface-2" />
        </div>
        <div aria-hidden className="bg-line" />
        <div className="flex min-h-0 min-w-0 flex-col pl-8">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line">
            <span className="h-3.5 w-28 rounded bg-surface" />
            <span className="flex gap-2"><span className="h-9 w-24 rounded-full bg-surface-2" /><span className="h-9 w-40 rounded-full bg-surface" /></span>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            <div className="h-10 border-b border-line bg-[#fafafa]" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex h-[52px] items-center gap-6 border-b border-line px-4" style={{ opacity: 1 - i * 0.1 }}>
                <span className="h-3 w-4 rounded bg-surface-2" />
                <span className="h-3.5 w-48 rounded bg-surface" />
                <span className="h-3.5 w-32 rounded bg-surface-2" />
                <span className="h-3.5 w-20 rounded bg-surface-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
