import Link from "next/link";
import { Pill } from "@/components/ui";
import type { IcpView } from "@/lib/intelligence";
import { Chip } from "./parts";

const FRESHNESS: Record<"current" | "stale" | "legacy", { label: string; tone: "grey" | "green" }> = {
  current: { label: "Current", tone: "green" },
  stale: { label: "Stale", tone: "grey" },
  legacy: { label: "Legacy", tone: "grey" },
};

/* The derived ICP: the sentence the model wrote, one row per evidence
   attribute with the won companies behind it, and the way into the Leads
   brief. */
export function IcpCard({ icp }: { icp: IcpView }) {
  const s = icp.sourceSummary;
  const freshness = icp.freshness ? FRESHNESS[icp.freshness.status] : null;

  return (
    <section className="rounded-2xl bg-surface-2 p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Ideal customer · From {icp.wonDeals} won {icp.wonDeals === 1 ? "deal" : "deals"}</h2>
        {freshness && <Pill tone={freshness.tone}>{freshness.label}</Pill>}
      </div>
      <p className="mt-2 text-[16px] font-medium leading-6 text-ink">{icp.summary}</p>

      <dl className="mt-5 grid grid-cols-[120px_minmax(0,1fr)_minmax(0,1.15fr)] items-start gap-x-4 gap-y-3">
        {icp.rows.map((r) => (
          <div key={r.attribute} className="contents">
            <dt className="text-[13.5px] leading-6 text-soft">{r.label}</dt>
            <dd className="text-[14px] leading-6 text-ink">{r.value}</dd>
            <dd className="flex flex-wrap gap-1.5">
              {r.deals.map((d) => (
                <Chip key={d.id} href={d.href}>{d.company}</Chip>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-[13px] text-soft">
          Confidence {Math.round(icp.confidence * 100)}%
          {s ? ` · ${s.calls} calls · ${s.emails} ${s.emails === 1 ? "email" : "emails"} · ${s.outcome_labelled} of ${s.deals} deals labelled` : ""}
        </p>
        <Link
          href="/leads"
          className="inline-flex h-8 items-center whitespace-nowrap rounded-full bg-white px-3.5 text-[13px] font-medium text-ink shadow-[inset_0_0_0_1px_#e8e8e8] transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Edit brief in Leads →
        </Link>
      </div>

      {icp.freshness && <p className="mt-2 text-[12px] text-faint">{icp.freshness.reason}</p>}
    </section>
  );
}
