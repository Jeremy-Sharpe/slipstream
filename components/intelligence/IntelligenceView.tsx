import { Avatar } from "@/components/Avatar";
import { fmtDate } from "@/components/ui";
import { history, outcomes, provenance, reps } from "@/lib/intelligence";
import { IcpCard } from "./IcpCard";
import { Coaching, Patterns, Triggers } from "./Patterns";

/* Intelligence: the profile, the four behaviours, why they bought, coaching. */
export function IntelligenceView() {
  const s = provenance.source_summary;
  return (
    <div>
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Intelligence</h1>
        <p className="mt-2 text-[14px] text-soft">What your won deals have in common, worked backwards from the calls.</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[13.5px] text-soft">
          <span className="tabular-nums">{history.length} calls · {s.emails} {s.emails === 1 ? "email" : "emails"} · {outcomes.won} won · {outcomes.stalled} stalled · {outcomes.lost} lost · {outcomes.no_show} no-show</span>
          {reps.map((r) => (
            <span key={r.rep} className="inline-flex items-center gap-1.5">
              <span aria-hidden>·</span>
              <Avatar name={r.rep} size={18} />
              <span className="tabular-nums">{r.rep.split(" ")[0]} {r.calls}</span>
            </span>
          ))}
        </p>
      </div>

      <div className="mt-8"><IcpCard /></div>
      <div className="mt-10"><Patterns /></div>
      <div className="mt-10"><Triggers /></div>
      <div className="mt-10"><Coaching /></div>

      <p className="mt-10 pb-8 text-[12px] text-faint">
        Scored with the rubric {provenance.rubric_version} · profile v{provenance.profile_version} · updated {fmtDate(provenance.generated_at)}
      </p>
    </div>
  );
}
