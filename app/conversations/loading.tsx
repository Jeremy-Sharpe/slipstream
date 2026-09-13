export default function Loading() {
  return (
    <div aria-busy>
      <div className="h-7 w-40 rounded-md bg-surface" />
      <div className="mt-2 h-4 w-72 rounded bg-surface-2" />
      <ul className="mt-8 divide-y divide-line-soft border-y border-line-soft">
        {Array.from({ length: 9 }).map((_, i) => (
          <li key={i} className="flex h-14 items-center gap-4 px-2" style={{ opacity: 1 - i * 0.08 }}>
            <span className="size-7 rounded-full bg-surface" />
            <span className="h-3.5 w-32 rounded bg-surface" />
            <span className="h-3.5 w-56 rounded bg-surface-2" />
          </li>
        ))}
      </ul>
    </div>
  );
}
