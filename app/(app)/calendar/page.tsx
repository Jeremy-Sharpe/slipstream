import { EmptySurface, PageShell } from "@/components/shell/PageShell";

export default function Page() {
  return (
    <PageShell title="Calendar" description="Upcoming calls and the context to walk in with.">
      <EmptySurface label="Nothing scheduled." />
    </PageShell>
  );
}
