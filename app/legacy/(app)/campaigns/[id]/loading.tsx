export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col" aria-busy="true">
      <div className="flex h-14 items-center gap-3 border-b border-border px-6"><span className="h-3.5 w-16 rounded bg-legacy-muted" /><span className="h-3.5 w-24 rounded bg-legacy-muted" /><span className="h-3.5 w-56 rounded bg-legacy-muted" /></div>
      <div className="flex h-16 items-center gap-3 border-b border-border px-6"><span className="h-6 w-16 rounded-full bg-legacy-muted" /><span className="h-3.5 w-48 rounded bg-legacy-muted" /></div>
      <div className="flex flex-1">
        <div className="w-[320px] border-r border-border p-5"><div className="h-28 rounded-legacy-lg bg-legacy-muted" /><div className="mt-3 h-28 rounded-legacy-lg bg-legacy-muted" /></div>
        <div className="flex-1 p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="mb-3 h-9 rounded bg-legacy-muted" />)}</div>
      </div>
    </div>
  );
}
