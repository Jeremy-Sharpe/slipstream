import type { Metadata } from "next";
import { CoachReview } from "@/components/coach/CoachReview";
import { PageShell } from "@/components/shell/PageShell";

export const metadata: Metadata = { title: "Coached call · Slipstream" };

export default async function CoachedCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageShell title="Coached call" description="What was said, what the coach suggested, and what happened to each suggestion.">
      <CoachReview id={id} />
    </PageShell>
  );
}
