import { ArrowLeft, Bell, ChevronsUpDown, Database, Globe, HelpCircle, Settings, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { IconButton } from "./IconButton";

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-line bg-card px-3">
      <Link href="/" aria-label="Back to conversations" className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
        <ArrowLeft className="size-4" strokeWidth={1.75} />
      </Link>
      <button type="button" className="ml-3 flex items-center gap-2 rounded-md px-1 py-1 text-[15px] font-semibold text-ink hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
        <Target className="size-4" strokeWidth={1.75} />
        Leads
        <ChevronsUpDown className="ml-0 size-3.5 text-muted-foreground" strokeWidth={2} />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button type="button" className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-[9px] text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none">
          <Sparkles className="size-3.5" strokeWidth={2} />
          Run search
        </button>
        <IconButton aria-label="Settings"><Settings className="size-4" strokeWidth={1.75} /></IconButton>
        <IconButton aria-label="Pipeline"><Database className="size-4" strokeWidth={1.75} /></IconButton>
        <IconButton aria-label="Help"><HelpCircle className="size-4" strokeWidth={1.75} /></IconButton>
        <button type="button" className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-ink transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          <Globe className="size-4 text-muted-foreground" strokeWidth={1.75} />
          Brief
        </button>
        <IconButton aria-label="Notifications"><Bell className="size-4" strokeWidth={1.75} /></IconButton>
        <span className="flex size-7 items-center justify-center rounded-full bg-avatar text-[11px] font-medium text-ink">MD</span>
      </div>
    </header>
  );
}
