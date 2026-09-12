"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export const primaryBtn = "flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50";
export const outlineBtn = "flex h-9 items-center gap-1.5 rounded-lg border border-border px-3.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50";
export const fieldLabel = "text-xs font-medium text-muted-foreground";

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none", checked ? "border-primary bg-primary" : "border-border bg-muted")}
    >
      <span className={cn("absolute top-0.5 size-3.5 rounded-full bg-card shadow-xs transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

export function StatusDot({ on }: { on: boolean }) {
  return <span className={cn("inline-block size-2 rounded-full", on ? "bg-primary" : "border border-muted-foreground bg-transparent")} />;
}
