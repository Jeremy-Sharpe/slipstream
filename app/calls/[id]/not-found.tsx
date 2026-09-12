import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-24 text-center text-[14px] text-faint">
      That call isn&apos;t here. <Link href="/" className="text-ink underline-offset-2 hover:underline">Back home</Link>
    </div>
  );
}
