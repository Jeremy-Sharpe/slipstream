import { Sidebar } from "@/components/shell/Sidebar";

// Same wide sidebar as every other page. The Leads top bar is rendered by the
// page so it can own search and brief state.
export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
