import { fmtDate } from "@/components/ui";
import { provenance, tiles } from "@/lib/intelligence";
import { IcpCard } from "./IcpCard";
import { Patterns, Triggers } from "./Patterns";

/* Intelligence: the ICP worked backwards from the won deals, then the
   behaviours and triggers behind them. Reads top to bottom; nothing to do
   here besides follow a link. */
export function IntelligenceView() {
  return (
    <div className="max-w-[880px]">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Intelligence</h1>
        <p className="mt-2 text-[13.5px] text-soft">What your won deals have in common, worked backwards from the calls.</p>
      </div>

      <div className="mt-8"><IcpCard /></div>

      <ul className="mt-4 grid grid-cols-3 gap-4">
        {tiles.map((t) => (
          <li key={t.label} className="rounded-xl border border-line bg-white p-5">
            <p className="text-[13px] text-soft">{t.label}</p>
            <p className="mt-1 text-[26px] font-semibold leading-8 tracking-[-0.02em] tabular-nums text-ink">{t.value}</p>
            <p className="mt-1 text-[13px] text-soft">{t.line}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10"><Patterns /></div>
      <div className="mt-10"><Triggers /></div>

      <p className="mt-10 pb-8 text-[12px] text-faint">
        Scored with the rubric {provenance.rubric_version} · profile v{provenance.profile_version} · updated {fmtDate(provenance.generated_at)}
      </p>
    </div>
  );
}
