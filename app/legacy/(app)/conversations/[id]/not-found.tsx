import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold text-legacy-ink">That conversation isn't here.</p>
      <p className="text-sm text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <Link href="/legacy" className="mt-2 rounded-legacy-md border border-legacy-line px-3 py-1.5 text-sm text-legacy-ink hover:bg-legacy-muted">Back to conversations</Link>
    </div>
  );
}
