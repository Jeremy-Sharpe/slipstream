"use client";

import { Building2, ChevronDown, ChevronRight, Code2, Link2, MapPin, PanelLeft, Save, Search, SlidersHorizontal, Trash2, Type, Users, X, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

// The filter column for a lead search, built on our ICP criteria. Chips become
// editable filter rows; the values filter the table client-side.
export type FilterKey = "industry" | "size" | "buyer_title" | "trigger" | "region" | "target";
export type FilterValues = Partial<Record<FilterKey, string>>;

const CRITERIA: { key: FilterKey; label: string; icon: LucideIcon; placeholder: string }[] = [
  { key: "industry", label: "Industry", icon: Building2, placeholder: "Legal, accounting, allied health, architecture" },
  { key: "size", label: "Company size", icon: Users, placeholder: "25–80 staff" },
  { key: "buyer_title", label: "Buyer title", icon: Type, placeholder: "Practice manager, operations manager, director" },
  { key: "trigger", label: "Trigger", icon: Zap, placeholder: "Cyber-insurance renewal, office move, M365 migration, IT person leaving" },
  { key: "region", label: "Region", icon: MapPin, placeholder: "Victoria, Australia" },
  { key: "target", label: "Target companies", icon: Link2, placeholder: "Paste domains or names" },
];

const STORAGE_KEY = "slipstream.leadsFilters";

const has = (hay: string, needle: string) => hay.toLowerCase().includes(needle.trim().toLowerCase());

/** Comma-separated terms match if any term is found. */
function matchesAny(hay: string, value?: string) {
  if (!value || !value.trim()) return true;
  return value.split(",").map((t) => t.trim()).filter(Boolean).some((t) => has(hay, t));
}

export function applyFilters(leads: Lead[], f: FilterValues): Lead[] {
  return leads.filter(
    (l) =>
      matchesAny(`${l.company} ${l.title}`, f.industry) &&
      matchesAny(l.title, f.buyer_title) &&
      matchesAny(l.match_evidence.map((e) => `${e.attribute} ${e.value}`).join(" "), f.trigger) &&
      matchesAny(l.location, f.region) &&
      matchesAny(l.company, f.target),
    // size is not on the row yet; it becomes a real filter once headcount lands.
  );
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children?: ReactNode }) {
  return (
    <section className="border-b border-line">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex h-[60px] w-full items-center gap-2.5 px-6 text-left text-[15px] font-semibold text-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:outline-none">
        {open ? <ChevronDown className="size-4 text-muted-foreground" strokeWidth={2} /> : <ChevronRight className="size-4 text-muted-foreground" strokeWidth={2} />}
        <span className="flex-1">{title}</span>
      </button>
      {open && children}
    </section>
  );
}

/** Read the persisted panel state after mount (default open). */
export function useFiltersPanelState(): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === "collapsed"); } catch {}
  }, []);
  const set = (next: boolean) => {
    setCollapsed(next);
    try { localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "open"); } catch {}
  };
  return [collapsed, set];
}

export function FiltersPanel({ values, onChange, brief, onHide }: { values: FilterValues; onChange: (next: FilterValues) => void; brief: string; onHide: () => void }) {
  const [view, setView] = useState<"filters" | "code">("filters");
  const [open, setOpen] = useState<Record<string, boolean>>({ criteria: true });
  const [showSuggested, setShowSuggested] = useState(true);
  const [saved, setSaved] = useState(false);

  const toggle = (k: string) => setOpen((s) => ({ ...s, [k]: !s[k] }));
  // A key present in `values` (even empty) is an active filter row, so the
  // rows survive the panel being hidden and shown again.
  const active = CRITERIA.map((c) => c.key).filter((k) => k in values);
  const add = (k: FilterKey) => { if (!(k in values)) onChange({ ...values, [k]: "" }); };
  const remove = (k: FilterKey) => { const next = { ...values }; delete next[k]; onChange(next); };
  const reset = () => onChange({});
  const saveView = () => { setSaved(true); window.setTimeout(() => setSaved(false), 2000); };
  const suggested = CRITERIA.filter((f) => !active.includes(f.key));

  const code = JSON.stringify({ brief, filters: Object.fromEntries(active.map((k) => [k, values[k] ?? ""])) }, null, 2);

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-r border-line bg-card">
      <header className="flex h-16 shrink-0 items-center border-b border-line pr-4 pl-4">
        <IconButton aria-label="Hide filters" onClick={onHide}>
          <PanelLeft className="size-4" strokeWidth={1.75} />
        </IconButton>
        <h2 className="ml-2 text-[17px] font-semibold text-ink">Filters</h2>
        {saved && <span className="ml-2 text-sm text-muted-foreground" aria-live="polite">Saved</span>}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-8 items-center rounded-md border border-line" role="group" aria-label="Panel view">
            <button type="button" aria-pressed={view === "filters"} aria-label="Filters view" onClick={() => setView("filters")} className={cn("flex h-full w-10 items-center justify-center rounded-l-[5px] text-muted-foreground hover:bg-muted hover:text-foreground", view === "filters" && "bg-muted text-ink")}><SlidersHorizontal className="size-4" strokeWidth={1.75} /></button>
            <span className="h-full w-px bg-line" />
            <button type="button" aria-pressed={view === "code"} aria-label="Code view" onClick={() => setView("code")} className={cn("flex h-full w-10 items-center justify-center rounded-r-[5px] text-muted-foreground hover:bg-muted hover:text-foreground", view === "code" && "bg-muted text-ink")}><Code2 className="size-4" strokeWidth={1.75} /></button>
          </div>
          <IconButton bordered aria-label="Clear filters" onClick={reset}><Trash2 className="size-4" strokeWidth={1.75} /></IconButton>
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" aria-label="Save filters" className="flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
              <Save className="size-4" strokeWidth={1.75} /><ChevronDown className="size-3.5" strokeWidth={2} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={saveView}>Save as view</DropdownMenuItem>
              <DropdownMenuItem onClick={reset}>Reset filters</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {view === "code" ? (
        <pre className="min-h-0 flex-1 overflow-auto p-5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-ink">{code}</pre>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section title="Criteria" open={!!open.criteria} onToggle={() => toggle("criteria")}>
            <div className="px-6 pb-5">
              <label className="flex h-11 items-center gap-2.5 rounded-lg border border-line px-3.5 text-muted-foreground focus-within:ring-2 focus-within:ring-primary">
                <Search className="size-4" strokeWidth={1.75} />
                <input placeholder="Search filters" className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-foreground" />
              </label>

              {active.length > 0 && (
                <ul className="mt-4 flex flex-col gap-2">
                  {active.map((k) => {
                    const f = CRITERIA.find((c) => c.key === k)!;
                    const Icon = f.icon;
                    return (
                      <li key={k} className="rounded-lg border border-line">
                        <div className="flex h-9 items-center gap-2 border-b border-line px-3 text-[13px] font-medium text-ink">
                          <Icon className="size-3.5 text-muted-foreground" strokeWidth={2} />{f.label}
                          <button type="button" onClick={() => remove(k)} aria-label={`Remove ${f.label}`} className="ml-auto text-muted-foreground hover:text-foreground"><X className="size-3.5" strokeWidth={2} /></button>
                        </div>
                        <input autoFocus value={values[k] ?? ""} onChange={(e) => onChange({ ...values, [k]: e.target.value })} placeholder={f.placeholder} className="h-10 w-full bg-transparent px-3 text-sm text-ink outline-none placeholder:text-muted-foreground" />
                      </li>
                    );
                  })}
                </ul>
              )}

              {suggested.length > 0 && (
                <>
                  <div className="mt-4 flex items-center justify-between text-[15px]">
                    <span className="text-muted-foreground">Suggested filters</span>
                    <button type="button" onClick={() => setShowSuggested((v) => !v)} className="text-primary hover:underline">{showSuggested ? "Hide" : "Show"}</button>
                  </div>
                  {showSuggested && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {suggested.map((f) => {
                        const Icon = f.icon;
                        return (
                          <button key={f.key} type="button" onClick={() => add(f.key)} className="flex h-8 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary-soft px-2.5 text-sm text-primary-foreground transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                            <Icon className="size-3.5 text-primary" strokeWidth={2} />{f.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </Section>

          <Section title="Target companies" open={!!open.target} onToggle={() => toggle("target")}>
            <div className="px-6 pb-5 text-sm text-muted-foreground">Add a list of companies to search inside, or leave empty to search everywhere.</div>
          </Section>
          <Section title="Exclude from CRM" open={!!open.exclude} onToggle={() => toggle("exclude")}>
            <div className="px-6 pb-5 text-sm text-muted-foreground">Companies already in HubSpot or on a won/lost deal are skipped.</div>
          </Section>
          <Section title="Result limits" open={!!open.limits} onToggle={() => toggle("limits")}>
            <div className="px-6 pb-5 text-sm text-muted-foreground">Start at 10 leads per search; Origami credits are spent per row.</div>
          </Section>
        </div>
      )}
    </aside>
  );
}
