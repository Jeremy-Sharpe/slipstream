"use client";

import { usePathname } from "next/navigation";

/* One frame for every route: content starts 48px from the sidebar and 40px
   from the top, so each page's title lands on the same pixel. Reading pages
   keep a 1120px column anchored left; Leads gets the full width for its two
   panes (that page never scrolls); Home (/home) keeps its own centred layout. */
export function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/home") return <div className="px-8 py-8">{children}</div>;
  if (pathname.startsWith("/leads")) return <div className="h-screen overflow-hidden pt-10 pr-12 pb-8 pl-12">{children}</div>;
  return <div className="pt-10 pr-12 pb-8 pl-12"><div className="max-w-[1120px]">{children}</div></div>;
}
