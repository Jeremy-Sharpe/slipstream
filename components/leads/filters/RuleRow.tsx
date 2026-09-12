"use client";

import { Trash2, X } from "lucide-react";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CriteriaPopover } from "./CriteriaPopover";
import { criterion, type FilterKey } from "./model";

const Token = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("inline-flex h-7 items-center rounded-md border border-line bg-card px-2 text-[13px] text-ink", className)}>{children}</span>
);

// One active criterion, laid out like Clay's rule block: a condition line and
// a value line whose value token opens the picker.
export function RuleRow({ filterKey, values, open, onOpenChange, onChange, onRemove }: {
  filterKey: FilterKey;
  values: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: string[]) => void;
  onRemove: () => void;
}) {
  const meta = criterion(filterKey);
  const Icon = meta.icon;
  return (
    <div className="rounded-lg border border-line">
      <div className="flex h-[52px] items-center gap-2 border-b border-line px-3">
        <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="inline-flex h-7 items-center overflow-hidden rounded-md border border-line text-[13px] text-ink">
          <span className="flex h-full items-center border-r border-line px-2">≥</span>
          <span className="flex h-full items-center px-2 tabular-nums">1</span>
        </span>
        <Token>current</Token>
        <span className="text-sm text-ink">{meta.label.toLowerCase()} is:</span>
        <button type="button" onClick={onRemove} aria-label={`Remove ${meta.label} filter`} className="ml-auto flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive">
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex min-h-[52px] flex-wrap items-center gap-2 py-3 pr-3 pl-6">
        <Token>{meta.label}</Token>
        <Token>is similar to</Token>
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "inline-flex min-h-7 max-w-full flex-wrap items-center gap-1 rounded-md border border-line bg-card px-1.5 py-0.5 text-left text-[13px] hover:border-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  open && "border-primary ring-2 ring-primary/30",
                )}
              />
            }
          >
            {values.length === 0 ? (
              <span className="px-0.5 text-muted-foreground">{meta.placeholder}</span>
            ) : (
              values.map((v) => (
                <span key={v} className="inline-flex h-6 items-center gap-1 rounded bg-primary-soft px-1.5 text-ink">
                  {v}
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${v}`}
                    onClick={(e) => { e.stopPropagation(); onChange(values.filter((x) => x !== v)); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" strokeWidth={2} />
                  </span>
                </span>
              ))
            )}
          </PopoverTrigger>
          <CriteriaPopover filterKey={filterKey} values={values} onChange={onChange} onRemove={onRemove} onClose={() => onOpenChange(false)} />
        </Popover>
      </div>
    </div>
  );
}
