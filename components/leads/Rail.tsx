"use client";

import { BarChart3, Headset, Home, MessageSquare, Settings, Target, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TOP = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/", label: "Conversations", icon: MessageSquare },
  { href: "/intelligence", label: "Analysis", icon: BarChart3 },
  { href: "/campaigns", label: "Coach", icon: Headset },
];

// Clay's compact rail: 56px wide, 36px hit targets, no labels.
export function Rail() {
  const pathname = usePathname();
  const item = (href: string, label: string, Icon: typeof Home) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
          active && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </Link>
    );
  };
  return (
    <nav className="flex h-screen w-14 shrink-0 flex-col items-center border-r border-line bg-card pt-4 pb-4">
      <div className="flex flex-col gap-1">{TOP.map((t) => item(t.href, t.label, t.icon))}</div>
      <div className="mt-auto flex flex-col gap-1">
        <button type="button" aria-label="Import" className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          <Upload className="size-5" strokeWidth={1.75} />
        </button>
        {item("/settings", "Settings", Settings)}
      </div>
    </nav>
  );
}
