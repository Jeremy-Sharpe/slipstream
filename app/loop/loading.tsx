export default function Loading() {
  return (
    <div aria-busy className="mx-auto max-w-[880px]">
      <div className="flex items-end justify-between">
        <div>
          <div className="h-7 w-40 rounded-md bg-surface" />
          <div className="mt-2 h-4 w-[520px] rounded bg-surface-2" />
        </div>
        <div className="h-9 w-32 rounded-full bg-surface" />
      </div>
      <div className="mt-8 h-24 rounded-2xl bg-surface-2" />
      <ol className="mt-10 flex flex-col gap-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4" style={{ opacity: 1 - i * 0.1 }}>
            <span className="size-7 rounded-full bg-surface" />
            <span className="h-4 w-28 rounded bg-surface" />
            <span className="h-3.5 w-48 rounded bg-surface-2" />
          </li>
        ))}
      </ol>
    </div>
  );
}
