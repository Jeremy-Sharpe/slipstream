/* Mirrors LoopView: title with the button on the right, the seven-circle
   strip, then the beats, left-aligned in the Frame like the page itself. */
export default function Loading() {
  return (
    <div aria-busy>
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="h-9 w-40 rounded-md bg-surface" />
          <div className="mt-2 h-5 w-72 rounded bg-surface-2" />
        </div>
        <div className="h-9 w-32 rounded-full bg-surface" />
      </div>
      <ol className="mt-10 flex items-center">
        {Array.from({ length: 7 }).map((_, i) => (
          <li key={i} className="flex items-center">
            <span className="size-6 rounded-full bg-surface" />
            {i < 6 && <span className="h-px w-10 bg-line" />}
          </li>
        ))}
      </ol>
      <ol className="mt-6 flex flex-col">
        {Array.from({ length: 7 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 pb-6" style={{ opacity: 1 - i * 0.1 }}>
            <span className="size-7 shrink-0 rounded-full bg-surface" />
            <span className="h-4 w-28 rounded bg-surface" />
            <span className="h-3.5 w-80 rounded bg-surface-2" />
          </li>
        ))}
      </ol>
    </div>
  );
}
