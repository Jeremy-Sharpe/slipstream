"use client";

import { usePathname } from "next/navigation";
import { Frame } from "@/components/Frame";
import { Sidebar } from "@/components/Sidebar";

/* The product shell for every route except the front door at "/", which
   renders bare so the landing page owns the whole viewport. */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return <>{children}</>;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Frame>{children}</Frame>
      </main>
    </div>
  );
}
