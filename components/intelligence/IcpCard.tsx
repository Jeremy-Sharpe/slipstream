import Link from "next/link";
import { icpProfile, icpRows, provenance } from "@/lib/intelligence";
import { CompanyChip } from "./parts";

/* The hero: the derived ICP sentence, then four attributes, each with its own
   counted "why" and up to three won companies that support it. */
export function IcpCard() {
  return (
    <section className="rounded-2xl bg-surface-2 p-7">
      <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Ideal customer · From {provenance.won_deals} won deals</h2>
      <p className="mt-3 max-w-[820px] text-[20px] font-semibold leading-7 tracking-[-0.02em] text-ink">{icpProfile.profile.summary}</p>

      <dl className="mt-6 divide-y divide-[#f0f0f0]">
        {icpRows.map((r) => (
          <div key={r.attribute} className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-6 py-4 first:pt-0 last:pb-0">
            <dt className="text-[13.5px] leading-6 text-soft">{r.label}</dt>
            <dd className="min-w-0">
              <p className="text-[14px] leading-6 text-ink">{r.value}</p>
              <p className="mt-0.5 text-[13.5px] leading-5 text-soft">{r.why}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {r.calls.map((c) => (
                  <CompanyChip key={c.id} href={`/calls/${c.id}`}>
                    {c.company}
                    {c.detail && <span className="text-soft"> · {c.detail}</span>}
                  </CompanyChip>
                ))}
              </div>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-[13px] text-soft">Confidence {Math.round(provenance.confidence * 100)}%</p>
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
