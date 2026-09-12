import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// 32×32, radius 6px. `bordered` for the back button; otherwise bare.
export function IconButton({ className, bordered, ...props }: ComponentProps<"button"> & { bordered?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        bordered && "border border-line",
        className,
      )}
      {...props}
    />
  );
}
