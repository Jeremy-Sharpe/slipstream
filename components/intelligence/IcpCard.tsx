import Link from "next/link";
import { Pill } from "@/components/ui";
import type { IcpView } from "@/lib/intelligence";
import { CompanyChip } from "./parts";

const FRESHNESS: Record<"current" | "stale" | "legacy", { label: string; tone: "grey" | "green" }> = {
  current: { label: "Current", tone: "green" },
  stale: { label: "Stale", tone: "grey" },
  legacy: { label: "Legacy", tone: "grey" },
};

/* The hero: one row per evidence attribute, values as pills, and the won
   companies behind them once at the bottom. The model's prose summary and its
   per-row "why" repeat the values, so they are not shown. Buying triggers live
   in "Why they bought" below, so that row is left out too. */
export function IcpCard({ icp }: { icp: IcpView }) {
  const freshness = icp.freshness ? FRESHNESS[icp.freshness.status] : null;
  const rows = icp.rows.filter((r) => r.attribute !== "trigger");

  const evidence = new Map<string, { id: string; company: string; href: string }>();
  for (const r of icp.rows) for (const d of r.deals) evidence.set(d.id, d);
  const deals = [...evidence.values()].slice(0, 5);

  return (
    <section className="rounded-2xl bg-surface-2 p-7">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Ideal customer · From {icp.wonDeals} won {icp.wonDeals === 1 ? "deal" : "deals"}</h2>
        {freshness && <Pill tone={freshness.tone}>{freshness.label}</Pill>}
      </div>

      <dl className="mt-5 divide-y divide-[#ececec]">
        {rows.map((r) => (
          <div key={r.attribute} className="grid grid-cols-[140px_minmax(0,1fr)] items-start gap-x-6 py-4 first:pt-0 last:pb-0">
            <dt className="text-[13.5px] leading-7 text-soft">{r.label}</dt>
            <dd className="flex min-w-0 flex-wrap gap-1.5">
              {r.values.map((v) => (
                <span key={v} className="inline-flex h-7 items-center whitespace-nowrap rounded-full bg-white px-3 text-[13px] leading-none text-ink shadow-[inset_0_0_0_1px_#e8e8e8]">
                  {v}
                </span>
              ))}
            </dd>
          </div>
        ))}
        {deals.length > 0 && (
          <div className="grid grid-cols-[140px_minmax(0,1fr)] items-start gap-x-6 py-4 last:pb-0">
            <dt className="text-[13.5px] leading-7 text-soft">Won deals</dt>
            <dd className="flex min-w-0 flex-wrap gap-1.5">
              {deals.map((d) => (
                <CompanyChip key={d.id} href={d.href}>{d.company}</CompanyChip>
              ))}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-[13px] text-soft">
          Confidence {Math.round(icp.confidence * 100)}%
          {icp.freshness && <span className="text-faint"> · {icp.freshness.reason}</span>}
        </p>
        <Link
          href="/leads"
          className="inline-flex h-8 items-center whitespace-nowrap rounded-full bg-white px-3.5 text-[13px] font-medium text-ink shadow-[inset_0_0_0_1px_#e8e8e8] transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Edit brief in Leads →
        </Link>
      </div>
    </section>
  );
}
