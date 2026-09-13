"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, House, LineChart, MessageSquare, Repeat } from "lucide-react";
import { Avatar } from "./Avatar";
import { cn } from "./ui";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/leads", label: "Leads", icon: LineChart },
  { href: "/intelligence", label: "Intelligence", icon: BarChart3 },
  { href: "/loop", label: "Revenue loop", icon: Repeat },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-line bg-white px-4 py-6">
      <Link href="/" className="flex items-center gap-2 px-3 text-[16px] font-semibold tracking-[-0.04em] text-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/slipstream-mark.svg" alt="" width={22} height={22} className="rounded-md" />
        <span>Slipstream</span>
      </Link>
      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-full px-3 text-[13.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                active ? "bg-surface text-ink" : "text-soft hover:bg-surface hover:text-ink",
              )}
            >
              <n.icon className="size-[17px]" strokeWidth={1.75} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex items-center gap-2.5 px-3">
        <Avatar name="Maxim Durand" size={28} />
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold leading-tight text-ink">Maxim Durand</p>
          <p className="truncate text-[11px] text-faint">Eleno</p>
        </div>
      </div>
    </aside>
  );
}
