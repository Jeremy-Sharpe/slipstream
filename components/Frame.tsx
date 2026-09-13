"use client";

import { usePathname } from "next/navigation";

/* Page frame: the reading column everywhere, full width on Leads (two panes
   that size themselves to the viewport; the page itself never scrolls). */
export function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/leads")) return <div className="h-screen overflow-hidden px-8 py-8">{children}</div>;
  return <div className="mx-auto max-w-[1040px] px-8 py-8">{children}</div>;
}
