"use client";

import { BarChart3, Calendar, Home, MessageSquare, PanelLeft, Play, Send, Settings, Target, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/legacy/ui/tooltip";
import { useConversations } from "@/lib/legacy/store/conversations";
import { cn } from "@/lib/legacy/utils";

type Item = { href: string; label: string; icon: LucideIcon; count?: number };

const STORAGE_KEY = "slipstream.sidebar";

// Two groups like Clay's sidebar: the top pair, then a labelled section.
const TOP: Item[] = [
  { href: "/legacy/home", label: "Home", icon: Home },
  { href: "/legacy/demo", label: "Revenue loop", icon: Play },
  { href: "/legacy", label: "Conversations", icon: MessageSquare },
];
const PIPELINE: Item[] = [
  { href: "/legacy/leads", label: "Leads", icon: Target },
  { href: "/legacy/intelligence", label: "Intelligence", icon: BarChart3 },
  { href: "/legacy/campaigns", label: "Campaigns", icon: Send },
  { href: "/legacy/calendar", label: "Calendar", icon: Calendar },
];
const BOTTOM: Item[] = [{ href: "/legacy/settings", label: "Settings", icon: Settings }];

function NavItem({ item, active, collapsed }: { item: Item; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-2.5 rounded-legacy-lg text-[16px] leading-none text-foreground transition-colors hover:bg-legacy-muted",
        collapsed ? "w-10 justify-center px-0" : "pr-3 pl-3",
        active && "bg-primary-soft text-primary hover:bg-primary-soft",
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.75} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.count != null && (
        <span className="flex h-[27px] min-w-[44px] items-center justify-center rounded-legacy-md border border-border px-2.5 text-[13.5px] tabular-nums text-foreground">{item.count}</span>
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
  const [compactViewport, setCompactViewport] = useState(false);

  // Default expanded on the server; apply the stored choice after mount.
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === "collapsed"); } catch {}
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setCompactViewport(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(STORAGE_KEY, c ? "expanded" : "collapsed"); } catch {}
      return !c;
    });
  };
  const visuallyCollapsed = collapsed || compactViewport;

  const top = TOP.map((item) => (item.href === "/legacy" ? { ...item, count } : item));
  const toggleButton = (
    <button
      type="button"
      onClick={toggle}
      aria-label={visuallyCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!visuallyCollapsed}
      className="flex size-8 items-center justify-center rounded-legacy-md text-foreground/70 hover:bg-legacy-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <PanelLeft className="size-[18px]" strokeWidth={1.75} />
    </button>
  );

  return (
    <TooltipProvider>
      <aside className={cn("sticky top-0 flex h-screen w-14 shrink-0 flex-col border-r border-border bg-card transition-none md:transition-[width] md:duration-150", visuallyCollapsed ? "md:w-14" : "md:w-[336px]")}>
        <div className={cn("flex h-16 shrink-0 items-center", visuallyCollapsed ? "justify-center" : "justify-between pr-5 pl-4")}>
          {!visuallyCollapsed && (
            <Link href="/legacy/home" className="flex items-center gap-2 text-[26px] leading-none font-bold tracking-[-0.03em] text-foreground">
              <Zap className="size-[26px] text-primary" strokeWidth={2.5} />
              slipstream
            </Link>
          )}
          {compactViewport ? (
            <Link href="/legacy/home" aria-label="Slipstream home" className="flex size-8 items-center justify-center rounded-legacy-md text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
              <Zap className="size-5" strokeWidth={2.5} />
            </Link>
          ) : visuallyCollapsed ? (
            <Tooltip>
              <TooltipTrigger render={toggleButton} />
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          ) : toggleButton}
        </div>

        <div className={cn("flex min-h-0 flex-1 flex-col", visuallyCollapsed ? "px-2 pt-2" : "px-3 pt-2")}>
          <Group items={top} pathname={pathname} collapsed={visuallyCollapsed} />
          <div className="my-3.5 h-px bg-border" />
          {!visuallyCollapsed && <p className="mb-2 pl-3 text-[14px] leading-none text-muted-foreground">Pipeline</p>}
          <Group items={PIPELINE} pathname={pathname} collapsed={visuallyCollapsed} />
        </div>

        <div className={cn("shrink-0 border-t border-border py-3", visuallyCollapsed ? "px-2" : "px-3")}>
          <Group items={BOTTOM} pathname={pathname} collapsed={visuallyCollapsed} />
        </div>
      </aside>
    </TooltipProvider>
  );
}
