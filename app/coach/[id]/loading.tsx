export default function Loading() {
  return (
    <div aria-busy>
      <div className="h-7 w-40 rounded-md bg-surface" />
      <div className="mt-2 h-4 w-72 rounded bg-surface-2" />
      <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-surface-2" />)}
      </div>
      <div className="mt-8 flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-4 rounded bg-surface" style={{ width: `${80 - i * 8}%` }} />)}
      </div>
    </div>
  );
}
