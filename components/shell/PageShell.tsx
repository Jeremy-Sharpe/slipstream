import type { ReactNode } from "react";

// Shared frame for every surface: title, one-line description, optional
// actions on the right, then the page content.
export function PageShell({ title, description, actions, children }: { title: string; description: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-8 py-7">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

/** Placeholder for a surface that has a route but no content yet. */
export function EmptySurface({ label }: { label: string }) {
  return (
    <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {label}
    </div>
  );
}
