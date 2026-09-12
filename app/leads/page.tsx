import { EmptySurface, PageShell } from "@/components/shell/PageShell";

export default function Page() {
  return (
    <PageShell title="Leads" description="Companies like the ones you closed, sourced and scored against your wins.">
      <EmptySurface label="No leads yet." />
    </PageShell>
  );
}
