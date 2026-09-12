"use client";

import { BarChart3, Calendar, Home, MessageSquare, PanelLeft, Send, Settings, Target, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useConversations } from "@/lib/store/conversations";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; count?: number };

const STORAGE_KEY = "slipstream.sidebar";

const MAIN: Item[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/", label: "Conversations", icon: MessageSquare },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/intelligence", label: "Intelligence", icon: BarChart3 },
  { href: "/campaigns", label: "Campaigns", icon: Send },
  { href: "/calendar", label: "Calendar", icon: Calendar },
];

const BOTTOM: Item[] = [{ href: "/settings", label: "Settings", icon: Settings }];

function NavItem({ item, active, collapsed }: { item: Item; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-md text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
        collapsed ? "w-9 justify-center px-0" : "px-2.5",
        active && "bg-muted font-medium text-foreground",
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && item.count != null && (
        <span className="rounded-full border border-border px-1.5 py-px text-[11px] tabular-nums text-muted-foreground">{item.count}</span>
      )}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const count = useConversations().length;
  const [collapsed, setCollapsed] = useState(false);

  // Default expanded on the server; apply the stored choice after mount.
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === "collapsed"); } catch {}
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(STORAGE_KEY, c ? "expanded" : "collapsed"); } catch {}
      return !c;
    });
  };

  const main = MAIN.map((item) => (item.href === "/" ? { ...item, count } : item));
  const toggleButton = (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <PanelLeft className="size-4" strokeWidth={1.75} />
    </button>
  );

  return (
    <TooltipProvider>
      <aside className={cn("sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-150", collapsed ? "w-14" : "w-60")}>
        <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center" : "justify-between pr-2.5 pl-4")}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <Zap className="size-4" strokeWidth={2.25} />
              Slipstream
            </Link>
          )}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger render={toggleButton} />
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          ) : toggleButton}
        </div>

        <nav className={cn("flex flex-col gap-0.5 p-2.5", collapsed && "items-center")}>
          {main.map((item) => <NavItem key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} />)}
        </nav>

        <nav className={cn("mt-auto flex flex-col gap-0.5 border-t border-border p-3", collapsed && "items-center p-2.5")}>
          {BOTTOM.map((item) => <NavItem key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} />)}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
