import { mmss } from "@/components/ui";
import { coachingFocus, patterns, triggers } from "@/lib/intelligence";
import { Bar, Chip, Ratio, SectionLabel } from "./parts";

/* What winning calls did: four behaviours, won against the rest, with the
   verbatim turns that show them. */
export function Patterns() {
  return (
    <section>
      <SectionLabel>What winning calls did</SectionLabel>
      <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
        {patterns.map((p) => (
          <li key={p.behaviour} className="grid grid-cols-[minmax(0,1fr)_132px_132px] items-start gap-x-6 py-4">
            <div className="min-w-0">
              <p className="text-[14px] font-medium leading-6 text-ink">{p.behaviour}</p>
              <p className="text-[13.5px] leading-6 text-soft">{p.takeaway}</p>
              {p.quotes.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {p.quotes.map((q) => (
                    <li key={`${q.callId}-${q.t}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] leading-6 text-text">
                      <span>“{q.text}”</span>
                      <Chip href={`/calls/${q.callId}`}>{q.company} · {mmss(q.t)}</Chip>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="pt-0.5"><Ratio label="Won" n={p.won.n} of={p.won.of} tone="ink" /></div>
            <div className="pt-0.5"><Ratio label="Other" n={p.other.n} of={p.other.of} tone="faint" /></div>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 text-[13.5px] leading-6">
        <p className="text-soft">Coaching focus</p>
        <ul className="flex flex-col gap-1">
          {coachingFocus.map((line) => (
            <li key={line} className="flex gap-2 text-text">
              <span aria-hidden className="text-faint">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* Why they bought: the triggers named on the calls, most common first. */
export function Triggers() {
  const max = Math.max(1, ...triggers.map((t) => t.count));
  return (
    <section>
      <SectionLabel>Why they bought</SectionLabel>
      <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
        {triggers.map((t) => (
          <li key={t.label} className="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-x-6 py-2.5">
            <span className="text-[14px] leading-6 text-ink">{t.label}</span>
            <span className="flex items-center gap-2.5">
              <span className="w-[76px] text-[13.5px] tabular-nums text-soft">×{t.count}</span>
              <Bar value={t.count / max} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
