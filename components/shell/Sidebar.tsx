"use client";

import { BarChart3, Calendar, Home, MessageSquare, PanelLeft, Play, Send, Settings, Target, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useConversations } from "@/lib/store/conversations";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; count?: number };

const STORAGE_KEY = "slipstream.sidebar";

// Two groups like Clay's sidebar: the top pair, then a labelled section.
const TOP: Item[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/demo", label: "Revenue loop", icon: Play },
  { href: "/", label: "Conversations", icon: MessageSquare },
];
const PIPELINE: Item[] = [
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
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-2.5 rounded-lg text-[16px] leading-none text-foreground transition-colors hover:bg-muted",
        collapsed ? "w-10 justify-center px-0" : "pr-3 pl-3",
        active && "bg-primary-soft text-primary hover:bg-primary-soft",
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.75} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.count != null && (
        <span className="flex h-[27px] min-w-[44px] items-center justify-center rounded-md border border-border px-2.5 text-[13.5px] tabular-nums text-foreground">{item.count}</span>
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

function Group({ items, pathname, collapsed, className }: { items: Item[]; pathname: string; collapsed: boolean; className?: string }) {
  return (
    <nav className={cn("flex flex-col gap-0.5", collapsed && "items-center", className)}>
      {items.map((item) => <NavItem key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} />)}
    </nav>
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

  const top = TOP.map((item) => (item.href === "/" ? { ...item, count } : item));
  const toggleButton = (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      className="flex size-8 items-center justify-center rounded-md text-foreground/70 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <PanelLeft className="size-[18px]" strokeWidth={1.75} />
    </button>
  );

  return (
    <TooltipProvider>
      <aside className={cn("sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-150", collapsed ? "w-14" : "w-[336px]")}>
        <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "justify-between pr-5 pl-4")}>
          {!collapsed && (
            <Link href="/home" className="flex items-center gap-2 text-[26px] leading-none font-bold tracking-[-0.03em] text-foreground">
              <Zap className="size-[26px] text-primary" strokeWidth={2.5} />
              slipstream
            </Link>
          )}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger render={toggleButton} />
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          ) : toggleButton}
        </div>

        <div className={cn("flex min-h-0 flex-1 flex-col", collapsed ? "px-2 pt-2" : "px-3 pt-2")}>
          <Group items={top} pathname={pathname} collapsed={collapsed} />
          <div className="my-3.5 h-px bg-border" />
          {!collapsed && <p className="mb-2 pl-3 text-[14px] leading-none text-muted-foreground">Pipeline</p>}
          <Group items={PIPELINE} pathname={pathname} collapsed={collapsed} />
        </div>

        <div className={cn("shrink-0 border-t border-border py-3", collapsed ? "px-2" : "px-3")}>
          <Group items={BOTTOM} pathname={pathname} collapsed={collapsed} />
        </div>
      </aside>
    </TooltipProvider>
  );
}
