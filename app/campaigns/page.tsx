import { EmptySurface, PageShell } from "@/components/shell/PageShell";

export default function Page() {
  return (
    <PageShell title="Campaigns" description="Outreach sequences drafted from your calls, approved before anything is sent.">
      <EmptySurface label="No campaigns yet." />
    </PageShell>
  );
}
