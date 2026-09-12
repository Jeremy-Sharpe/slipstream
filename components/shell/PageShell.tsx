import type { ReactNode } from "react";

// Shared frame for every surface: title, one-line description, then content.
// Padding matches the Conversations page so all screens line up.
export function PageShell({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col">
      <header className="px-10 pt-8">
        <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">{description}</p>
      </header>
      {children}
    </div>
  );
}

/** Placeholder for a surface that has a route but no content yet. */
export function EmptySurface({ label }: { label: string }) {
  return (
    <div className="mx-10 mt-8 flex h-[420px] items-center justify-center rounded-lg border border-dashed border-border text-[15px] text-muted-foreground">
      {label}
    </div>
  );
}
