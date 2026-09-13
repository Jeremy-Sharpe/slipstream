import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { mmss } from "@/components/ui";
import { coachRep, coaching, patterns, triggers } from "@/lib/intelligence";
import { Bar, SectionLabel } from "./parts";

/* The centrepiece: four behaviours, won against the others on one track, one
   verbatim turn under each. */
export function Patterns() {
  return (
    <section>
      <SectionLabel>What winning calls did</SectionLabel>
      <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
        {patterns.map((p) => {
          const q = p.quotes[0];
          return (
            <li key={p.behaviour} className="grid grid-cols-[minmax(0,1fr)_280px] items-start gap-x-10 py-5">
              <div className="min-w-0">
                <p className="text-[15px] font-medium leading-6 text-ink">{p.behaviour}</p>
                {q && (
                  <div className="mt-3 border-l-2 border-line pl-4">
                    <p className="text-[16px] leading-6 text-ink">“{q.text}”</p>
                    <Link href={`/calls/${q.callId}`} className="mt-1.5 inline-flex items-center gap-2 text-[13px] text-soft transition-colors duration-150 hover:text-ink">
                      <Avatar name={q.speaker} size={20} />
                      <span>{q.speaker} · {q.company} · <span className="tabular-nums">{mmss(q.t)}</span></span>
                    </Link>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_120px] items-end gap-x-4 gap-y-2 pt-0.5">
                <span className="text-[14px] leading-5 text-ink">Won</span>
                <span className="text-right text-[14px] leading-5 tabular-nums text-ink">{p.won.n} of {p.won.of}</span>
                <span className="col-span-2 flex justify-end"><Bar value={p.won.of ? p.won.n / p.won.of : 0} width={120} /></span>
                <span className="text-[14px] leading-5 text-soft">Others</span>
                <span className="text-right text-[14px] leading-5 tabular-nums text-soft">{p.other.n} of {p.other.of}</span>
                <span className="col-span-2 flex justify-end"><Bar value={p.other.of ? p.other.n / p.other.of : 0} tone="faint" width={120} /></span>
              </div>
            </li>
          );
        })}
      </ul>
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
          <li key={t.label} className="grid grid-cols-[minmax(0,1fr)_280px] items-center gap-x-10 py-2.5">
            <span className="text-[14px] leading-6 text-ink">{t.label}</span>
            <span className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-x-4">
              <span className="text-right text-[13px] tabular-nums text-soft">×{t.count}</span>
              <Bar value={t.count / max} width={120} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* Coaching: the rep whose numbers say so, two plain lines. */
export function Coaching() {
  const first = coachRep.split(" ")[0];
  return (
    <section>
      <SectionLabel>Coach {first} on</SectionLabel>
      <div className="mt-3 flex items-start gap-3">
        <Avatar name={coachRep} size={24} className="mt-px" />
        <ul className="flex flex-col gap-1.5">
          {coaching.map((c) => (
            <li key={c.line} className="text-[14px] leading-6 text-ink">{c.line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
