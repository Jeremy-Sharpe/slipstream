import { EmptySurface, PageShell } from "@/components/shell/PageShell";

export default function Page() {
  return (
    <PageShell title="Intelligence" description="What your best customers have in common, worked backwards from won deals.">
      <EmptySurface label="Nothing analysed yet." />
    </PageShell>
  );
}
