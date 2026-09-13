import { Avatar } from "@/components/Avatar";
import { fmtDate } from "@/components/ui";
import type { Intelligence } from "@/lib/intelligence";
import { DeriveButton } from "./DeriveButton";
import { IcpCard } from "./IcpCard";
import { Coaching, Patterns, Triggers } from "./Patterns";
import { ErrorLine } from "./parts";

/* Intelligence: the profile, the behaviours behind the wins, why they bought,
   coaching. Everything on the page comes from the API; anything not derived
   yet says so. */
export function IntelligenceView({ intelligence }: { intelligence: Intelligence }) {
  const { icp, stats, patterns, coachingFocus, coachingSource, coachRep, triggers, provenance, errors, scoredCalls, unscoredFixtures, needsDerive } = intelligence;
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

      {needsDerive && (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5">
          <p className="text-[13.5px] text-soft">
            {!icp
              ? "No ideal customer profile yet. Load the call history and derive one."
              : scoredCalls === 0
                ? `The profile is derived. ${unscoredFixtures.length} calls are still unscored, so the patterns below are empty.`
                : `${unscoredFixtures.length} calls are still unscored and there is no playbook yet.`}
          </p>
          <DeriveButton hasIcp={Boolean(icp)} unscored={unscoredFixtures} />
        </section>
      )}

      <div className="mt-8">
        {icp ? <IcpCard icp={icp} /> : <ErrorLine>{errors.icp ?? "No ideal customer profile has been derived yet."}</ErrorLine>}
      </div>
      {errors.freshness && <ErrorLine className="mt-2">Freshness unavailable: {errors.freshness}</ErrorLine>}
      {errors.scorecards && <ErrorLine className="mt-2">Scorecards unavailable: {errors.scorecards}</ErrorLine>}

      <div className="mt-10"><Patterns patterns={patterns} error={errors.playbook} /></div>
      <div className="mt-10"><Triggers triggers={triggers} /></div>
      <div className="mt-10"><Coaching lines={coachingFocus} rep={coachRep} source={coachingSource} /></div>

      <p className="mt-10 pb-8 text-[12px] text-faint">
        {provenance.profileVersion != null ? `Profile v${provenance.profileVersion}` : "No profile yet"}
        {provenance.profileCreatedAt ? ` · derived ${fmtDate(provenance.profileCreatedAt)}` : ""}
        {provenance.rubricVersion ? ` · scored with rubric ${provenance.rubricVersion}` : ""}
        {provenance.playbookGeneratedAt ? ` · playbook ${fmtDate(provenance.playbookGeneratedAt)}` : ""}
      </p>
    </div>
  );
}
