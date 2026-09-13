/* Mirrors IntelligenceView: title, subtitle, stats line, the profile card,
   then the pattern rows, left-aligned in the Frame like the page itself. */
export default function Loading() {
  return (
    <div aria-busy>
      <div className="h-9 w-40 rounded-md bg-surface" />
      <div className="mt-2 h-5 w-[520px] rounded bg-surface-2" />
      <div className="mt-2 h-4 w-96 rounded bg-surface-2" />
      <div className="mt-8 h-[400px] rounded-2xl bg-surface-2" />
      <div className="mt-10 h-3 w-40 rounded bg-surface-2" />
      <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,1fr)_280px] items-start gap-x-10 py-5" style={{ opacity: 1 - i * 0.15 }}>
            <span className="block">
              <span className="block h-4 w-56 rounded bg-surface" />
              <span className="mt-3 block h-4 w-[520px] rounded bg-surface-2" />
              <span className="mt-2.5 block h-3 w-64 rounded bg-surface-2" />
            </span>
            <span className="block">
              <span className="block h-3.5 w-full rounded bg-surface-2" />
              <span className="mt-4 block h-3.5 w-full rounded bg-surface-2" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
