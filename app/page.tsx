import { DropZone } from "@/components/DropZone";

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <section className="w-full max-w-[720px] pb-16 text-center">
        <h1 className="text-[22px] font-semibold text-ink">What happened on the call?</h1>
        <p className="mx-auto mt-2 max-w-[520px] text-[13.5px] text-soft">Drop the recording. Slipstream writes it into HubSpot, drafts the follow-up and finds the next leads.</p>
        <div className="mt-7">
          <DropZone />
        </div>
      </section>
    </div>
  );
}
