import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold text-ink">That list doesn't exist.</p>
      <p className="text-sm text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <Link href="/lists/leads-icp-v3" className="mt-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/85">Open Leads — ICP v3</Link>
    </div>
  );
}
