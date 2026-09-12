import { CallsList } from "@/components/CallsList";
import { DropZone } from "@/components/DropZone";

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto max-w-[720px] pt-14 text-center">
        <h1 className="text-[22px] font-semibold text-ink">What happened on the call?</h1>
        <p className="mx-auto mt-2 max-w-[520px] text-[13.5px] text-soft">Drop the recording. Slipstream writes it into HubSpot, drafts the follow-up and finds the next leads.</p>
        <div className="mt-8 text-left">
          <DropZone />
        </div>
      </section>
      <section className="mt-20">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">Recent calls</h2>
        <CallsList />
      </section>
    </div>
  );
}
