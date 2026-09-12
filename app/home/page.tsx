import { EmptySurface, PageShell } from "@/components/shell/PageShell";

export default function Page() {
  return (
    <PageShell title="Home" description="What needs your attention today.">
      <EmptySurface label="Nothing here yet." />
    </PageShell>
  );
}
