import type { Intelligence, Pattern, Trigger } from "@/lib/intelligence";
import { Bar, Chip, ErrorLine, Ratio, SectionLabel } from "./parts";

/* What winning calls did: the behaviours the scorecards measured, won against
   the rest, with the quotes the scorer cited. Below them, whatever the judge
   noticed on top of the measured set, which carries quotes but no counts. */
export function Patterns({
  patterns,
  coachingFocus,
  coachingSource,
  error,
}: {
  patterns: Pattern[];
  coachingFocus: string[];
  coachingSource: Intelligence["coachingSource"];
  error: string | null;
}) {
  const measured = patterns.filter((p): p is Extract<Pattern, { kind: "behaviour" }> => p.kind === "behaviour");
  const analyst = patterns.filter((p): p is Extract<Pattern, { kind: "analyst" }> => p.kind === "analyst");

  return (
    <section>
      <SectionLabel>What winning calls did</SectionLabel>
      {measured.length === 0 ? (
        <ErrorLine className="mt-2">{error ?? "Not yet derived. Score the call history to fill this."}</ErrorLine>
      ) : (
        <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
          {measured.map((p) => (
            <li key={p.key} className="grid grid-cols-[minmax(0,1fr)_132px_132px] items-start gap-x-6 py-4">
              <div className="min-w-0">
                <p className="text-[14px] font-medium leading-6 text-ink">{p.behaviour}</p>
                <p className="text-[13.5px] leading-6 text-soft">{p.takeaway}</p>
                {p.quotes.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {p.quotes.map((q) => (
                      <li key={`${q.callId}-${q.turn}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] leading-6 text-text">
                        <span>“{q.text}”</span>
                        <Chip href={q.href}>{q.company} · turn {q.turn}</Chip>
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
      )}

      {analyst.length > 0 && (
        <div className="mt-6">
          <SectionLabel>What the analyst noticed</SectionLabel>
          <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
            {analyst.map((p) => (
              <li key={p.key} className="py-4">
                <p className="text-[14px] font-medium leading-6 text-ink">{p.behaviour}</p>
                <p className="text-[13.5px] leading-6 text-soft">{p.whyItMatters}</p>
                {p.quotes.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {p.quotes.map((q, index) => (
                      <li key={`${q.callId}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] leading-6 text-text">
                        <span>“{q.text}”</span>
                        <Chip href={q.href}>{q.company}</Chip>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 text-[13.5px] leading-6">
        <p className="text-soft">Coaching focus</p>
        {coachingFocus.length === 0 ? (
          <p className="text-faint">Not yet derived.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {coachingFocus.map((line) => (
              <li key={line} className="flex gap-2 text-text">
                <span aria-hidden className="text-faint">·</span>
                <span>{line}</span>
              </li>
            ))}
            {coachingSource === "scorecards" && (
              <li className="text-[12px] text-faint">From what the scorer asked lost and stalled calls to improve, no playbook yet.</li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

/* Why they bought: the triggers the profile named. The API carries no count
   per trigger, so they are listed without one. */
export function Triggers({ triggers }: { triggers: Trigger[] }) {
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
            <li key={t.label} className="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-x-6 py-2.5">
              <span className="text-[14px] leading-6 text-ink">{t.label}</span>
              {t.count != null && (
                <span className="flex items-center gap-2.5">
                  <span className="w-[76px] text-[13.5px] tabular-nums text-soft">×{t.count}</span>
                  <Bar value={t.count / max} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
