import { Rail } from "@/components/leads/Rail";
import { TopBar } from "@/components/leads/TopBar";

// Clay switches to a compact rail on Find People; /leads does the same.
export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Rail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {children}
      </div>
    </div>
  );
}
