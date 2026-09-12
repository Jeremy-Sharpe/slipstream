import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold text-ink">That conversation isn't here.</p>
      <p className="text-sm text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <Link href="/" className="mt-2 rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-muted">Back to conversations</Link>
    </div>
  );
}
