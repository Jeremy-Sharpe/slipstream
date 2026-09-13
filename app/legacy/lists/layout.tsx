import { Sidebar } from "@/components/legacy/shell/Sidebar";

// Same wide sidebar as every other page. The workbook renders its own 64px
// top bar so the breadcrumb sits on the left of it, the way Clay does.
export default function ListsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
