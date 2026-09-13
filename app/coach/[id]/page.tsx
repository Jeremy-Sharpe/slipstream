import type { Metadata } from "next";
import { CoachReview } from "@/components/coach/CoachReview";

export const metadata: Metadata = { title: "Coached call · Slipstream" };

export default async function CoachedCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Coached call</h1>
      <p className="mt-2 text-[14px] text-soft">What was said, what the coach suggested, and what happened to each suggestion.</p>
      <div className="mt-8">
        <CoachReview id={id} />
      </div>
    </div>
  );
}
