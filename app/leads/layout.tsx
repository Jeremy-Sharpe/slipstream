import { TopBar } from "@/components/leads/TopBar";
import { Sidebar } from "@/components/shell/Sidebar";

// Same wide sidebar as every other page; only the top bar is Leads-specific.
export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {children}
      </div>
    </div>
  );
}
