import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-24 text-center text-[14px] text-faint">
      That conversation isn&apos;t here. <Link href="/conversations" className="text-ink underline-offset-2 hover:underline">Back to Conversations</Link>
    </div>
  );
}
