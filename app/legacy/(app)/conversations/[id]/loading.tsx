// Skeleton in the shape of the detail page: header rows, three cards, a panel.
export default function Loading() {
  const bar = (w: string, h = "h-3") => <div className={`${h} ${w} rounded bg-legacy-muted animate-pulse`} />;
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="Loading conversation">
      <div className="flex h-14 items-center gap-3 border-b border-legacy-line px-6">{bar("w-14")}{bar("w-24")}{bar("w-32")}</div>
      <div className="flex h-16 items-center gap-4 border-b border-legacy-line px-6">{bar("w-20", "h-6")}{bar("w-24")}{bar("w-32")}</div>
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-6 px-6 py-6">
        <div className="grid gap-4">
          <div className="h-16 rounded-legacy-lg border border-legacy-line" />
          <div className="h-36 rounded-legacy-lg border border-legacy-line" />
          <div className="h-[420px] rounded-legacy-lg border border-legacy-line" />
        </div>
        <div className="grid content-start gap-4">{bar("w-20")}{bar("w-32", "h-6")}<div className="h-16 rounded-legacy-md border border-legacy-line" /><div className="h-64 rounded-legacy-md border border-legacy-line" /></div>
      </div>
    </div>
  );
}
