"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PopoverContent } from "@/components/ui/popover";
import { filterSuggestions } from "@/lib/data/filterSuggestions";
import { cn } from "@/lib/utils";
import { criterion, type FilterKey } from "./model";

// The value picker under a rule row: search, suggested values, pick many.
export function CriteriaPopover({ filterKey, values, onChange, onRemove, onClose }: {
  filterKey: FilterKey;
  values: string[];
  onChange: (next: string[]) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const meta = criterion(filterKey);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const options = useMemo(() => {
    const base: readonly string[] = filterSuggestions[filterKey] ?? [];
    const q = query.trim().toLowerCase();
    const list = q ? base.filter((o) => o.toLowerCase().includes(q)) : base;
    // A typed value that isn't in the list can still be added.
    return q && !base.some((o) => o.toLowerCase() === q) ? [query.trim(), ...list] : list;
  }, [filterKey, query]);

  const toggle = (v: string) => {
    const exists = values.some((x) => x.toLowerCase() === v.toLowerCase());
    onChange(exists ? values.filter((x) => x.toLowerCase() !== v.toLowerCase()) : [...values, v]);
    setQuery("");
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(values.join(", ")); } catch {}
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <PopoverContent align="start" sideOffset={6} className="w-[505px] gap-0 rounded-lg p-0">
      <header className="flex h-[46px] items-center gap-1 border-b border-line pr-2.5 pl-4">
        <span className="flex-1 text-base font-semibold text-ink">{meta.label}</span>
        <button type="button" onClick={copy} aria-label="Copy values" className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          {copied ? <Check className="size-4" strokeWidth={2} /> : <Copy className="size-4" strokeWidth={1.75} />}
        </button>
        <button type="button" onClick={() => { onRemove(); onClose(); }} aria-label="Remove filter" className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          <Trash2 className="size-4" strokeWidth={1.75} />
        </button>
      </header>
      <div className="p-4 pb-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && options[0]) { e.preventDefault(); toggle(options[0]); }
            if (e.key === "Escape") onClose();
          }}
          placeholder={meta.placeholder}
          className="h-11 w-full rounded-lg border border-line px-4 text-base text-ink outline-none transition-[box-shadow,border-color] duration-150 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <ul className="max-h-[330px] overflow-y-auto pb-2 [scrollbar-width:thin]" role="listbox" aria-label={`${meta.label} values`}>
        {options.length === 0 && <li className="px-8 py-3 text-base text-muted-foreground">No matches.</li>}
        {options.map((o) => {
          const on = values.some((x) => x.toLowerCase() === o.toLowerCase());
          return (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => toggle(o)}
                className={cn("flex h-11 w-full cursor-pointer items-center gap-2 pr-4 pl-8 text-left text-base text-ink transition-colors duration-150 hover:bg-page focus-visible:bg-page focus-visible:outline-none", on && "bg-muted")}
              >
                <span className="flex-1 truncate">{o}</span>
                {on && <Check className="size-4 text-ink" strokeWidth={2} />}
              </button>
            </li>
          );
        })}
      </ul>
    </PopoverContent>
  );
}
