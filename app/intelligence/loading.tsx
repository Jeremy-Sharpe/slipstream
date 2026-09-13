export default function Loading() {
  return (
    <div aria-busy className="mx-auto max-w-[880px]">
      <div className="h-7 w-32 rounded-md bg-surface" />
      <div className="mt-2 h-4 w-96 rounded bg-surface-2" />
      <div className="mt-8 h-64 rounded-2xl bg-surface-2" />
      <div className="mt-4 grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[102px] rounded-xl bg-surface-2" />
        ))}
      </div>
      <div className="mt-10 h-3 w-40 rounded bg-surface-2" />
      <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,1fr)_132px_132px] items-start gap-x-6 py-4" style={{ opacity: 1 - i * 0.15 }}>
            <span className="block">
              <span className="block h-3.5 w-56 rounded bg-surface" />
              <span className="mt-2.5 block h-3 w-80 rounded bg-surface-2" />
            </span>
            <span className="mt-1 block h-3 w-24 rounded bg-surface-2" />
            <span className="mt-1 block h-3 w-24 rounded bg-surface-2" />
          </li>
        ))}
      </ul>
    </div>
  );
}
