import { EmptySurface, PageShell } from "@/components/shell/PageShell";

export default function Page() {
  return (
    <PageShell title="Settings" description="Workspace, CRM connection and team.">
      <EmptySurface label="No settings yet." />
    </PageShell>
  );
}
