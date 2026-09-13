import Link from "next/link";
import { Pill } from "@/components/ui";
import type { IcpView } from "@/lib/intelligence";
import { CompanyChip } from "./parts";

const FRESHNESS: Record<"current" | "stale" | "legacy", { label: string; tone: "grey" | "green" }> = {
  current: { label: "Current", tone: "green" },
  stale: { label: "Stale", tone: "grey" },
  legacy: { label: "Legacy", tone: "grey" },
};

/* The hero: the derived ICP sentence, then one row per evidence attribute,
   each with the counted "why" the model gave and up to three won companies
   that support it. */
export function IcpCard({ icp }: { icp: IcpView }) {
  const freshness = icp.freshness ? FRESHNESS[icp.freshness.status] : null;

  return (
    <section className="rounded-2xl bg-surface-2 p-7">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Ideal customer · From {icp.wonDeals} won {icp.wonDeals === 1 ? "deal" : "deals"}</h2>
        {freshness && <Pill tone={freshness.tone}>{freshness.label}</Pill>}
      </div>
      <p className="mt-3 max-w-[820px] text-[20px] font-semibold leading-7 tracking-[-0.02em] text-ink">{icp.summary}</p>

      <dl className="mt-6 divide-y divide-[#f0f0f0]">
        {icp.rows.map((r) => (
          <div key={r.attribute} className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-6 py-4 first:pt-0 last:pb-0">
            <dt className="text-[13.5px] leading-6 text-soft">{r.label}</dt>
            <dd className="min-w-0">
              <p className="text-[14px] leading-6 text-ink">{r.value}</p>
              {r.why && r.why !== r.value && <p className="mt-0.5 text-[13.5px] leading-5 text-soft">{r.why}</p>}
              {r.deals.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {r.deals.map((d) => (
                    <CompanyChip key={d.id} href={d.href}>{d.company}</CompanyChip>
                  ))}
                </div>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-[13px] text-soft">Confidence {Math.round(icp.confidence * 100)}%</p>
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
