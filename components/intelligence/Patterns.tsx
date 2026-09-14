import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { Pattern, Trigger } from "@/lib/intelligence";
import { Bar, ErrorLine, SectionLabel } from "./parts";

/* What winning calls did: the behaviours the scorecards measured, won against
   the rest, with the quote the scorer cited. The analyst's free-text notes
   are left out on purpose; the measured rows carry the story. */
export function Patterns({ patterns, error }: { patterns: Pattern[]; error: string | null }) {
  const measured = patterns.filter((p): p is Extract<Pattern, { kind: "behaviour" }> => p.kind === "behaviour");
  if (measured.length === 0 && !error) return null;

  return (
    <section>
      <SectionLabel>What winning calls did</SectionLabel>
      {error ? (
        <ErrorLine className="mt-2">{error}</ErrorLine>
      ) : (
        <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
          {measured.map((p) => {
            const q = p.quotes[0];
            return (
              <li key={p.key} className="grid grid-cols-[minmax(0,1fr)_280px] items-start gap-x-10 py-5">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium leading-6 text-ink">{p.behaviour}</p>
                  {q && (
                    <div className="mt-3 border-l-2 border-line pl-4">
                      <p className="text-[16px] leading-6 text-ink">“{q.text}”</p>
                      <Link href={q.href} className="mt-1.5 inline-flex items-center gap-2 text-[13px] text-soft transition-colors duration-150 hover:text-ink">
                        <Avatar name={q.speaker} size={20} />
                        <span>{q.speaker} · {q.company} · <span className="tabular-nums">Turn {q.turn}</span></span>
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
      )}

    </section>
  );
}

/* Why they bought: the triggers the profile named. The API carries no count
   per trigger, so a bar only shows when one exists. */
export function Triggers({ triggers }: { triggers: Trigger[] }) {
  if (triggers.length === 0) return null;
  const counted = triggers.filter((t): t is Trigger & { count: number } => t.count != null);
  const max = Math.max(1, ...counted.map((t) => t.count));

  return (
    <section>
      <SectionLabel>Why they bought</SectionLabel>
      {triggers.length === 0 ? (
        <ErrorLine className="mt-2">Not yet derived.</ErrorLine>
      ) : (
        <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
          {triggers.map((t) => (
            <li key={t.label} className="grid grid-cols-[minmax(0,1fr)_280px] items-center gap-x-10 py-2.5">
              <span className="text-[14px] leading-6 text-ink">{t.label}</span>
              {t.count != null && (
                <span className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-x-4">
                  <span className="text-right text-[13px] tabular-nums text-soft">×{t.count}</span>
                  <Bar value={t.count / max} width={120} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The model writes paragraphs; one sentence per line is enough on this page. */
const firstSentence = (text: string): string => {
  const m = /^(.*?[.!?])(?:\s|$)/.exec(text.trim());
  return m ? m[1] : text.trim();
};

/* Coaching: the rep whose numbers say so, one line each. */
export function Coaching({ lines, rep }: { lines: string[]; rep: string | null }) {
  if (lines.length === 0) return null;
  return (
    <section>
      <SectionLabel>{rep ? `Coach ${rep.split(" ")[0]} on` : "Coaching focus"}</SectionLabel>
      {lines.length === 0 ? (
        <ErrorLine className="mt-2">Not yet derived.</ErrorLine>
      ) : (
        <div className="mt-3 flex items-start gap-3">
          {rep && <Avatar name={rep} size={24} className="mt-px" />}
          <ul className="flex max-w-[760px] flex-col gap-1.5">
            {lines.map((line) => (
              <li key={line} className="text-[14px] leading-6 text-ink">{firstSentence(line)}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
