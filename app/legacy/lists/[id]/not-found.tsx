import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold text-legacy-ink">That list doesn't exist.</p>
      <p className="text-sm text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <Link href="/legacy/lists/leads-icp-v3" className="mt-2 rounded-legacy-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/85">Open Leads — ICP v3</Link>
    </div>
  );
}
