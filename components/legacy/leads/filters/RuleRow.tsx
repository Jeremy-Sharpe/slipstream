"use client";

import { Trash2, X } from "lucide-react";
import { Popover, PopoverTrigger } from "@/components/legacy/ui/popover";
import { cn } from "@/lib/legacy/utils";
import { CriteriaPopover } from "./CriteriaPopover";
import { criterion, type FilterKey } from "./model";

const Token = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("inline-flex h-[30px] items-center rounded-legacy-md border border-legacy-line bg-card px-2.5 text-[15px] text-legacy-ink", className)}>{children}</span>
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
    <div className="rounded-legacy-lg border border-legacy-line">
      <div className="flex h-[54px] items-center gap-2.5 border-b border-legacy-line px-3.5">
        <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="inline-flex h-[30px] items-center overflow-hidden rounded-legacy-md border border-legacy-line text-[15px] text-legacy-ink">
          <span className="flex h-full items-center border-r border-legacy-line px-2.5">≥</span>
          <span className="flex h-full items-center px-2.5 tabular-nums">1</span>
        </span>
        <Token>current</Token>
        <span className="text-base text-legacy-ink">{meta.label.toLowerCase()} is:</span>
        <button type="button" onClick={onRemove} aria-label={`Remove ${meta.label} filter`} className="ml-auto flex size-8 items-center justify-center rounded-legacy-md text-muted-foreground hover:bg-legacy-muted hover:text-destructive">
          <Trash2 className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex min-h-[56px] flex-wrap items-center gap-2 py-3 pr-3.5 pl-7">
        <Token>{meta.label}</Token>
        <Token>is similar to</Token>
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "inline-flex min-h-[30px] max-w-full flex-wrap items-center gap-1 rounded-legacy-md border border-legacy-line bg-card px-2 py-0.5 text-left text-[15px] hover:border-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  open && "border-primary ring-2 ring-primary/30",
                )}
              />
            }
          >
            {values.length === 0 ? (
              <span className="px-0.5 text-muted-foreground">{meta.placeholder}</span>
            ) : (
              values.map((v) => (
                <span key={v} className="inline-flex h-[22px] items-center gap-1 rounded bg-primary-soft px-1.5 text-legacy-ink">
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
