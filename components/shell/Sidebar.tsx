"use client";

import { BarChart3, Calendar, Home, MessageSquare, Send, Settings, Target, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/", label: "Conversations", icon: MessageSquare, count: 13 },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/intelligence", label: "Intelligence", icon: BarChart3 },
  { href: "/campaigns", label: "Campaigns", icon: Send },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-background px-3 py-4">
      <Link href="/" className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold tracking-tight">
        <Zap className="size-4" strokeWidth={2.25} />
        Slipstream
      </Link>

      <nav className="mt-6 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon, count }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-muted font-medium text-foreground",
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              {count != null && <span className="rounded-sm bg-foreground/[.06] px-1.5 py-px text-[11px] tabular-nums text-foreground/70">{count}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-md border border-border p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium">Pro plan</span>
          <span className="text-muted-foreground">Upgrade</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[7%] rounded-full bg-foreground" />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">72 / 1,000 calls this month</p>
      </div>
    </aside>
  );
}
