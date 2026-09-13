import { Frame } from "@/components/Frame";
import { Sidebar } from "@/components/Sidebar";

/* The product frame: sidebar plus the reading column, around /, /conversations,
   /calls/[id], /leads, /intelligence and /loop. See docs/DESIGN.md. */
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <Frame>{children}</Frame>
        </main>
      </div>
      <div id="portal" />
    </>
  );
}
