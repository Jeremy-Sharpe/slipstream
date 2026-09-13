import { cloneElement, isValidElement, type ComponentProps, type ReactElement } from "react";
import { cn } from "@/lib/legacy/utils";

const BASE = "flex size-8 shrink-0 items-center justify-center rounded-legacy-md text-muted-foreground transition-colors hover:bg-legacy-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none";

// 32×32, radius 6px. `bordered` for the back button; otherwise bare.
// `render` swaps the element (a Link, a menu trigger) while keeping the styling,
// the same contract Base UI triggers use.
export function IconButton({ className, bordered, render, children, ...props }: ComponentProps<"button"> & { bordered?: boolean; render?: ReactElement }) {
  const cls = cn(BASE, bordered && "border border-legacy-line", className);
  if (render && isValidElement(render)) {
    const el = render as ReactElement<Record<string, unknown>>;
    return cloneElement(el, { ...props, ...el.props, className: cn(cls, el.props.className as string | undefined) }, children);
  }
  return <button type="button" className={cls} {...props}>{children}</button>;
}
