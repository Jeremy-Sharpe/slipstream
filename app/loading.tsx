export default function Loading() {
  return (
    <div aria-busy>
      <div className="mx-auto max-w-[720px] pt-14"><div className="mx-auto h-7 w-64 rounded-md bg-surface" /><div className="mx-auto mt-2 h-4 w-96 rounded bg-surface-2" /><div className="mt-8 h-56 rounded-2xl bg-surface-2" /></div>
      <div className="mt-20 h-4 w-24 rounded bg-surface" />
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
