import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { mmss } from "@/components/ui";
import { coaching, patterns, triggers } from "@/lib/intelligence";
import { Bar, Compare, SectionLabel } from "./parts";

/* What winning calls did: four behaviours, won against the rest on the same
   track, with the verbatim turns that show them as pull-quotes. */
export function Patterns() {
  return (
    <section>
      <SectionLabel>What winning calls did</SectionLabel>
      <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
        {patterns.map((p) => (
          <li key={p.behaviour} className="grid grid-cols-[minmax(0,1fr)_216px] items-start gap-x-10 py-5">
            <div className="min-w-0">
              <p className="text-[14px] font-medium leading-6 text-ink">{p.behaviour}</p>
              <p className="text-[13.5px] leading-6 text-soft">{p.takeaway}</p>
              {p.quotes.length > 0 && (
                <ul className="mt-3 flex flex-col gap-3">
                  {p.quotes.map((q) => (
                    <li key={`${q.callId}-${q.t}`} className="border-l-2 border-line pl-4">
                      <p className="text-[16px] leading-6 text-ink">“{q.text}”</p>
                      <Link href={`/calls/${q.callId}`} className="mt-1.5 inline-flex items-center gap-2 text-[13px] text-soft transition-colors duration-150 hover:text-ink">
                        <Avatar name={q.speaker} size={20} />
                        <span>{q.speaker} · {q.company} · <span className="tabular-nums">{mmss(q.t)}</span></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="pt-1"><Compare won={p.won} other={p.other} /></div>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <SectionLabel>Coaching focus</SectionLabel>
        <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
          {coaching.map((c) => (
            <li key={c.line} className="flex items-start gap-3 py-3.5">
              <Avatar name={c.rep} size={24} className="mt-px" />
              <div className="min-w-0">
                <p className="text-[13px] text-soft">{c.rep}</p>
                <p className="text-[14px] leading-6 text-ink">{c.line}</p>
              </div>
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
          <li key={t.label} className="grid grid-cols-[minmax(0,1fr)_216px] items-center gap-x-10 py-2.5">
            <span className="text-[14px] leading-6 text-ink">{t.label}</span>
            <span className="grid grid-cols-[44px_120px_40px] items-center gap-x-3">
              <span />
              <Bar value={t.count / max} width={120} />
              <span className="text-right text-[13px] tabular-nums text-soft">×{t.count}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
