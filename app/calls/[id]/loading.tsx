export default function Loading() {
  return (
    <div aria-busy>
      <div className="h-4 w-12 rounded bg-surface-2" />
      <div className="mt-4 flex items-center gap-3"><span className="size-9 rounded-full bg-surface" /><div><div className="h-5 w-64 rounded bg-surface" /><div className="mt-1.5 h-3.5 w-48 rounded bg-surface-2" /></div></div>
      <div className="mt-8 grid grid-cols-[55fr_45fr] gap-10">
        <div className="flex flex-col gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-surface-2" style={{ opacity: 1 - i * 0.1 }} />)}</div>
        <div className="flex flex-col gap-4">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-5 w-3/4 rounded bg-surface-2" />)}</div>
      </div>
    </div>
  );
}
