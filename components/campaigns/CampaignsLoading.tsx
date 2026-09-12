const TABLE_COLUMNS = ["w-56", "w-16", "w-8", "w-8", "w-8", "w-8", "w-14", "w-20"];

export function CampaignsLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading campaigns"
      className="flex animate-pulse flex-col pt-[34px]"
    >
      <div className="flex items-center justify-between px-11">
        <div className="flex items-center gap-4">
          <span className="size-[46px] rounded-lg bg-muted" />
          <span className="h-7 w-36 rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="h-10 w-[273px] rounded-md bg-muted" />
          <span className="h-10 w-36 rounded-md bg-muted" />
        </div>
      </div>

      <div className="mx-11 mt-7 h-[154px] rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="size-9 rounded-lg bg-muted" />
          <div className="space-y-2">
            <span className="block h-4 w-36 rounded bg-muted" />
            <span className="block h-3 w-64 rounded bg-muted" />
          </div>
        </div>
        <span className="mt-7 block h-10 rounded-lg bg-muted" />
      </div>

      <div className="mt-8 flex items-end justify-between px-11 pb-[14px]">
        <div className="space-y-2">
          <span className="block h-4 w-36 rounded bg-muted" />
          <span className="block h-3 w-72 rounded bg-muted" />
        </div>
        <span className="h-10 w-[274px] rounded-lg bg-muted" />
      </div>

      <div className="border-t border-border">
        <div className="grid h-12 grid-cols-8 items-center gap-8 border-b border-border px-11">
          {TABLE_COLUMNS.map((width, index) => (
            <span key={index} className={`h-3 rounded bg-muted ${width}`} />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, row) => (
          <div
            key={row}
            className="grid h-[61px] grid-cols-8 items-center gap-8 border-b border-border px-11"
          >
            {TABLE_COLUMNS.map((width, column) => (
              <span key={column} className={`h-3 rounded bg-muted ${width}`} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
