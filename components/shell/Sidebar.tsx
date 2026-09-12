"use client";

import { BarChart3, Calendar, Home, MessageSquare, PanelLeft, Send, Settings, Target, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; count?: number };

const MAIN: Item[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/", label: "Conversations", icon: MessageSquare, count: 13 },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/intelligence", label: "Intelligence", icon: BarChart3 },
  { href: "/campaigns", label: "Campaigns", icon: Send },
  { href: "/calendar", label: "Calendar", icon: Calendar },
];

const BOTTOM: Item[] = [{ href: "/settings", label: "Settings", icon: Settings }];

function NavItem({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-muted font-medium text-foreground",
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
      <span className="flex-1">{item.label}</span>
      {item.count != null && (
        <span className="rounded-full border border-border px-1.5 py-px text-[11px] tabular-nums text-muted-foreground">{item.count}</span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center justify-between border-b border-border pr-2.5 pl-4">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Zap className="size-4" strokeWidth={2.25} />
          Slipstream
        </Link>
        <button className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Collapse sidebar">
          <PanelLeft className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 p-2.5">
        {MAIN.map((item) => <NavItem key={item.href} item={item} active={pathname === item.href} />)}
      </nav>

      <nav className="mt-auto flex flex-col gap-0.5 border-t border-border p-3">
        {BOTTOM.map((item) => <NavItem key={item.href} item={item} active={pathname === item.href} />)}
      </nav>
    </aside>
  );
}
