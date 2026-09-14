import { Avatar } from "@/components/Avatar";
import type { Intelligence } from "@/lib/intelligence";
import { DeriveButton } from "./DeriveButton";
import { IcpCard } from "./IcpCard";
import { Coaching, Patterns, Triggers } from "./Patterns";
import { ErrorLine } from "./parts";

/* Intelligence: the profile, the behaviours behind the wins, why they bought,
   coaching. Everything on the page comes from the API; anything not derived
   yet says so. */
export function IntelligenceView({ intelligence }: { intelligence: Intelligence }) {
  const { icp, stats, patterns, coachingFocus, coachRep, triggers, errors, scoredCalls, unscoredFixtures, needsDerive } = intelligence;
  const o = stats.outcomes;

  return (
    <div>
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Intelligence</h1>
        <p className="mt-2 text-[14px] text-soft">What your won deals have in common, worked backwards from the calls.</p>
        {stats.calls > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[13.5px] text-soft">
            <span className="tabular-nums">
              {stats.calls} calls{stats.emails != null ? ` · ${stats.emails} ${stats.emails === 1 ? "email" : "emails"}` : ""} · {o.won} won · {o.stalled} stalled · {o.lost} lost · {o.no_show} no-show
            </span>
            {stats.reps.map((r) => (
              <span key={r.rep} className="inline-flex items-center gap-1.5">
                <span aria-hidden>·</span>
                <Avatar name={r.rep} size={18} />
                <span className="tabular-nums">{r.rep.split(" ")[0]} {r.calls}</span>
              </span>
            ))}
          </p>
        )}
      </div>

      {needsDerive && (!icp || unscoredFixtures.length > 0) && (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5">
          <p className="text-[13.5px] text-soft">
            {!icp
              ? "No ideal customer profile yet. Load the call history and derive one."
              : scoredCalls === 0
                ? `The profile is derived. ${unscoredFixtures.length === 1 ? "1 call is" : `${unscoredFixtures.length} calls are`} still unscored.`
                : `${unscoredFixtures.length === 1 ? "1 call is" : `${unscoredFixtures.length} calls are`} still unscored.`}
          </p>
          <DeriveButton hasIcp={Boolean(icp)} unscored={unscoredFixtures} />
        </section>
      )}

      <div className="mt-8">
        {icp ? <IcpCard icp={icp} /> : <ErrorLine>{errors.icp ?? "No ideal customer profile has been derived yet."}</ErrorLine>}
      </div>
      {errors.freshness && <ErrorLine className="mt-2">Freshness unavailable: {errors.freshness}</ErrorLine>}
      {errors.scorecards && <ErrorLine className="mt-2">Scorecards unavailable: {errors.scorecards}</ErrorLine>}

      <div className="flex flex-col gap-10 pt-10 empty:hidden">
        <Patterns patterns={patterns} error={errors.playbook} />
        <Triggers triggers={triggers} />
        <Coaching lines={coachingFocus} rep={coachRep} />
      </div>

      <div className="pb-8" />
    </div>
  );
}
