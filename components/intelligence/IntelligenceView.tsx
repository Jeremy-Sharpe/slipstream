import { fmtDate } from "@/components/ui";
import type { Intelligence } from "@/lib/intelligence";
import { DeriveButton } from "./DeriveButton";
import { IcpCard } from "./IcpCard";
import { Patterns, Triggers } from "./Patterns";
import { ErrorLine } from "./parts";

/* Intelligence: the ICP worked backwards from the won deals, then the
   behaviours and triggers behind them. Everything on the page comes from the
   API; anything not derived yet says so. */
export function IntelligenceView({ intelligence }: { intelligence: Intelligence }) {
  const { icp, tiles, patterns, coachingFocus, coachingSource, triggers, provenance, errors, scoredCalls, unscoredFixtures, needsDerive } = intelligence;

  return (
    <div className="mx-auto max-w-[880px]">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Intelligence</h1>
        <p className="mt-1 text-[13.5px] text-soft">What your won deals have in common, worked backwards from the calls.</p>
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

      <ul className="mt-4 grid grid-cols-3 gap-4">
        {tiles.map((t) => (
          <li key={t.label} className="rounded-xl border border-line bg-white p-5">
            <p className="text-[13px] text-soft">{t.label}</p>
            <p className="mt-1 text-[26px] font-semibold leading-8 tracking-[-0.02em] tabular-nums text-ink">{t.value}</p>
            <p className="mt-1 text-[13px] text-soft">{t.line}</p>
          </li>
        ))}
      </ul>
      {errors.scorecards && <ErrorLine className="mt-2">Scorecards unavailable: {errors.scorecards}</ErrorLine>}

      <div className="mt-10">
        <Patterns patterns={patterns} coachingFocus={coachingFocus} coachingSource={coachingSource} error={errors.playbook} />
      </div>
      <div className="mt-10"><Triggers triggers={triggers} /></div>

      <p className="mt-10 pb-8 text-[12px] text-faint">
        {provenance.rubricVersion ? `Scored with rubric ${provenance.rubricVersion}` : "No rubric version yet"}
        {provenance.playbookModel ? ` · playbook by ${provenance.playbookModel}` : " · playbook not derived"}
        {provenance.playbookGeneratedAt ? ` · generated ${fmtDate(provenance.playbookGeneratedAt)}` : ""}
        {provenance.profileVersion != null ? ` · profile v${provenance.profileVersion}` : ""}
        {provenance.cohortRevision ? ` · cohort ${provenance.cohortRevision.slice(0, 7)}` : ""}
        {provenance.profileCreatedAt ? ` · derived ${fmtDate(provenance.profileCreatedAt)}` : ""}
      </p>
    </div>
  );
}
