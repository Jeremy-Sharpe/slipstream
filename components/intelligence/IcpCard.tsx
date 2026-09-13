import Link from "next/link";
import { icpProfile, icpRows, provenance } from "@/lib/intelligence";
import { PersonChip } from "./parts";

/* The hero: the derived ICP sentence, four attributes with the won contacts
   that support each, and the way into the Leads brief. */
export function IcpCard() {
  const s = provenance.source_summary;
  return (
    <section className="rounded-2xl bg-surface-2 p-7">
      <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Ideal customer · From {provenance.won_deals} won deals</h2>
      <p className="mt-3 max-w-[820px] text-[20px] font-semibold leading-7 tracking-[-0.02em] text-ink">{icpProfile.profile.summary}</p>

      <dl className="mt-6 grid grid-cols-[136px_minmax(0,1fr)_minmax(0,1.3fr)] items-start gap-x-6 gap-y-4">
        {icpRows.map((r) => (
          <div key={r.attribute} className="contents">
            <dt className="text-[13.5px] leading-7 text-soft">{r.label}</dt>
            <dd className="text-[14px] leading-7 text-ink">{r.value}</dd>
            <dd className="flex flex-wrap gap-1.5">
              {r.calls.map((c) => (
                <PersonChip key={c.id} href={`/calls/${c.id}`} name={c.contact}>{c.company}</PersonChip>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-[13px] text-soft">
          Confidence {Math.round(provenance.confidence * 100)}% · {s.calls} calls · {s.emails} {s.emails === 1 ? "email" : "emails"}
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
