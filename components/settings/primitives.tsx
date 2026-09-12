"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(17,24,39,0.06)]", className)}>
      <header className="flex min-h-16 items-center gap-3 border-b border-border px-6 py-4">
        <h2 className="text-[17px] font-semibold text-foreground">{title}</h2>
        {description && <p className="text-[15px] text-muted-foreground">{description}</p>}
      </header>
      <div className="px-6 py-5 text-[16px]">{children}</div>
    </section>
  );
}

export const primaryBtn = "flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3.5 text-[15px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/85 active:bg-primary/75 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-default disabled:opacity-50";
export const outlineBtn = "flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3.5 text-[15px] font-medium text-foreground transition-colors duration-150 hover:bg-muted active:bg-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50";
export const fieldLabel = "text-[14px] font-medium text-muted-foreground";

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none", checked ? "border-foreground bg-foreground" : "border-border bg-muted")}
    >
      <span className={cn("absolute top-0.5 size-3.5 rounded-full bg-card shadow-xs transition-transform duration-150", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

export function StatusDot({ on }: { on: boolean }) {
  return <span className={cn("inline-block size-2 rounded-full", on ? "bg-foreground" : "border border-muted-foreground bg-transparent")} />;
}
