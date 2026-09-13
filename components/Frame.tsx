"use client";

import { usePathname } from "next/navigation";

/* One frame for every route: content starts 32px from the sidebar and 32px
   from the top, so each page's title lands on the same pixel. Reading pages
   keep a 1040px column anchored left; Leads gets the full width for its two
   panes (that page never scrolls). */
export function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/leads")) return <div className="h-screen overflow-hidden px-8 py-8">{children}</div>;
  return <div className="px-8 py-8"><div className="max-w-[1040px]">{children}</div></div>;
}
