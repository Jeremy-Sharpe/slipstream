import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";

// The standard shell: wide sidebar plus top bar. /leads renders its own
// top bar so the page can own search state.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
