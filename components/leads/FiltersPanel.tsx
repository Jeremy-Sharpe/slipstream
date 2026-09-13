"use client";

import { ChevronDown, ChevronRight, Code2, PanelLeft, Plus, Save, Search, SlidersHorizontal, Trash2, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";
import { RuleRow } from "./filters/RuleRow";
import { activeCriteria, CRITERIA, defaultFilterState, joinValues, splitValues, type FilterKey, type FilterState, type TargetMode } from "./filters/model";

export { applyFilters, defaultFilterState, type FilterKey, type FilterState, type FilterValues } from "./filters/model";

const STORAGE_KEY = "slipstream.leadsFilters";

function Section({ title, open, onToggle, trailing, children }: { title: string; open: boolean; onToggle: () => void; trailing?: ReactNode; children?: ReactNode }) {
  return (
    <section className="border-b border-line">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex h-[58px] w-full items-center gap-3.5 pr-[22px] pl-8 text-left text-base font-semibold text-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:outline-none">
        {open ? <ChevronDown className="size-4 text-muted-foreground" strokeWidth={2} /> : <ChevronRight className="size-4 text-muted-foreground" strokeWidth={2} />}
        <span className="flex-1">{title}</span>
        {trailing}
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

/** A "+ Add" control that expands into an input; Enter commits a chip. */
function AddChips({ items, onAdd, onRemove, placeholder, label }: { items: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; placeholder: string; label: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const commit = () => {
    draft.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).forEach(onAdd);
    setDraft("");
    setEditing(false);
  };
  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((v) => (
            <span key={v} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-muted px-2.5 text-sm text-ink">
              {v}
              <button type="button" onClick={() => onRemove(v)} aria-label={`Remove ${v}`} className="text-muted-foreground hover:text-foreground"><X className="size-3" strokeWidth={2} /></button>
            </span>
          ))}
        </div>
      )}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setDraft(""); setEditing(false); } }}
          placeholder={placeholder}
          aria-label={label}
          className="h-9 w-full rounded-md border border-primary px-3.5 text-base text-ink outline-none ring-2 ring-primary/30 placeholder:text-muted-foreground"
        />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-line text-base text-ink hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          <Plus className="size-4" strokeWidth={2} /> Add
        </button>
      )}
    </div>
  );
}

function NumberField({ label, help, value, min, onChange }: { label: string; help?: string; value: number; min: number; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-base font-semibold text-ink">{label}</span>
      {help && <span className="text-base text-muted-foreground">{help}</span>}
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
        className="h-10 w-full rounded-lg border border-line px-3.5 text-base text-ink tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}

const TARGET_MODES: { key: TargetMode; label: string }[] = [
  { key: "in_hubspot", label: "In HubSpot already" },
  { key: "not_in_hubspot", label: "Not in HubSpot" },
  { key: "any", label: "Any" },
];

export function FiltersPanel({ state, onChange, brief, onHide }: { state: FilterState; onChange: (next: FilterState) => void; brief: string; onHide: () => void }) {
  const [view, setView] = useState<"filters" | "code">("filters");
  const [open, setOpen] = useState<Record<string, boolean>>({ criteria: true, target: true, exclude: true, limits: true });
  const [showSuggested, setShowSuggested] = useState(true);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<FilterKey | null>(null);

  const patch = (p: Partial<FilterState>) => onChange({ ...state, ...p });
  const toggle = (k: string) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  const active = activeCriteria(state.criteria);
  const add = (k: FilterKey) => {
    if (!(k in state.criteria)) patch({ criteria: { ...state.criteria, [k]: "" } });
    setOpenKey(k);
  };
  const setValues = (k: FilterKey, values: string[]) => patch({ criteria: { ...state.criteria, [k]: joinValues(values) } });
  const remove = (k: FilterKey) => {
    const next = { ...state.criteria }; delete next[k];
    patch({ criteria: next });
    if (openKey === k) setOpenKey(null);
  };
  const reset = () => { onChange({ ...defaultFilterState, total: state.total, perCompany: state.perCompany }); setOpenKey(null); };
  const saveView = () => { setSaved(true); window.setTimeout(() => setSaved(false), 2000); };

  const q = query.trim().toLowerCase();
  const suggested = CRITERIA.filter((f) => !active.includes(f.key) && (!q || f.label.toLowerCase().includes(q)));
  const filterCount = active.length;

  const code = JSON.stringify(
    {
      brief,
      filters: Object.fromEntries(active.map((k) => [k, splitValues(state.criteria[k])])),
      target_companies: { mode: state.targetMode, list: state.targets },
      exclude_from_crm: state.excluded,
      limits: { total: state.total, leads_per_company: state.perCompany },
    },
    null,
    2,
  );

  return (
    <aside className="flex w-[605px] shrink-0 flex-col border-r border-line bg-card">
      <header className="flex h-[62px] shrink-0 items-center border-b border-line pr-[22px] pl-6">
        <IconButton aria-label="Hide filters" onClick={onHide}>
          <PanelLeft className="size-[18px]" strokeWidth={1.75} />
        </IconButton>
        <h2 className="ml-3 text-[17px] font-semibold text-ink">Filters</h2>
        {saved && <span className="ml-2 text-sm text-muted-foreground" aria-live="polite">Saved</span>}
        <div className="ml-auto flex items-center gap-2.5">
          <div className="flex h-9 items-center rounded-md border border-line" role="group" aria-label="Panel view">
            <button type="button" aria-pressed={view === "filters"} aria-label="Filters view" onClick={() => setView("filters")} className={cn("flex h-full w-[50px] items-center justify-center rounded-l-[5px] text-muted-foreground hover:bg-muted hover:text-foreground", view === "filters" && "bg-muted text-ink")}><SlidersHorizontal className="size-[18px]" strokeWidth={1.75} /></button>
            <span className="h-full w-px bg-line" />
            <button type="button" aria-pressed={view === "code"} aria-label="Code view" onClick={() => setView("code")} className={cn("flex h-full w-[50px] items-center justify-center rounded-r-[5px] text-muted-foreground hover:bg-muted hover:text-foreground", view === "code" && "bg-muted text-ink")}><Code2 className="size-[18px]" strokeWidth={1.75} /></button>
          </div>
          <IconButton bordered aria-label="Clear filters" onClick={reset} className="size-9 w-[38px]"><Trash2 className="size-[18px]" strokeWidth={1.75} /></IconButton>
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" aria-label="Save filters" className="flex h-9 items-center gap-2 rounded-md border border-line px-3 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
              <Save className="size-[18px]" strokeWidth={1.75} /><ChevronDown className="size-4" strokeWidth={2} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={saveView}>Save as view</DropdownMenuItem>
              <DropdownMenuItem onClick={reset}>Reset filters</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {view === "code" ? (
        <pre className="min-h-0 flex-1 overflow-auto p-[22px] font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-ink">{code}</pre>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section
            title="Criteria"
            open={!!open.criteria}
            onToggle={() => toggle("criteria")}
            trailing={filterCount > 0 && <span className="text-[15px] font-normal text-ink">{filterCount} {filterCount === 1 ? "filter" : "filters"}</span>}
          >
            <div className="px-[22px] pb-[22px]">
              <label className="flex h-11 items-center gap-2.5 rounded-lg border border-line px-4 text-muted-foreground focus-within:ring-2 focus-within:ring-primary">
                <Search className="size-4" strokeWidth={1.75} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search filters" className="w-full bg-transparent text-base text-ink outline-none placeholder:text-muted-foreground" />
                {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="hover:text-foreground"><X className="size-3.5" strokeWidth={2} /></button>}
              </label>

              {(suggested.length > 0 || q) && (
                <>
                  <div className="mt-5 flex items-center justify-between text-base">
                    <span className="text-muted-foreground">Suggested filters</span>
                    <button type="button" onClick={() => setShowSuggested((v) => !v)} className="text-primary hover:underline">{showSuggested ? "Hide" : "Show"}</button>
                  </div>
                  {showSuggested && (
                    <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1.5">
                      {suggested.length === 0 && <span className="text-sm text-muted-foreground">No filter matches “{query}”.</span>}
                      {suggested.map((f) => {
                        const Icon = f.icon;
                        return (
                          <button key={f.key} type="button" onClick={() => add(f.key)} className="flex h-8 items-center gap-2 rounded-lg border border-primary/35 bg-primary-soft px-3 text-[15px] text-primary-foreground transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                            <Icon className="size-4 text-primary" strokeWidth={2} />{f.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {active.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2.5 flex items-center gap-2 text-base text-ink">
                    <Users className="size-4 text-muted-foreground" strokeWidth={1.75} />
                    Leads match:
                  </div>
                  <ul className="flex flex-col gap-2">
                    {active.map((k) => (
                      <li key={k}>
                        <RuleRow
                          filterKey={k}
                          values={splitValues(state.criteria[k])}
                          open={openKey === k}
                          onOpenChange={(o) => setOpenKey(o ? k : openKey === k ? null : openKey)}
                          onChange={(vals) => setValues(k, vals)}
                          onRemove={() => remove(k)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>

          <Section title="Target companies" open={!!open.target} onToggle={() => toggle("target")}>
            <div className="flex flex-col gap-3.5 px-[22px] pb-[18px]">
              <div role="radiogroup" aria-label="Target companies" className="flex flex-col gap-4 pt-0.5">
                {TARGET_MODES.map((m) => {
                  const on = state.targetMode === m.key;
                  return (
                    <button key={m.key} type="button" role="radio" aria-checked={on} onClick={() => patch({ targetMode: m.key })} className="flex items-center gap-3 text-left text-base text-ink focus-visible:outline-none">
                      <span className={cn("flex size-5 items-center justify-center rounded-full border", on ? "border-primary bg-primary" : "border-muted-foreground/50 bg-card")}>
                        {on && <span className="size-2 rounded-full bg-card" />}
                      </span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <AddChips items={state.targets} onAdd={(v) => patch({ targets: state.targets.includes(v) ? state.targets : [...state.targets, v] })} onRemove={(v) => patch({ targets: state.targets.filter((x) => x !== v) })} placeholder="Paste domains or names, comma separated" label="Add target companies" />
            </div>
          </Section>

          <Section title="Exclude from CRM" open={!!open.exclude} onToggle={() => toggle("exclude")}>
            <div className="flex flex-col gap-3 px-[22px] pb-[18px]">
              <p className="text-base text-muted-foreground">Companies already in HubSpot or on a won/lost deal are skipped.</p>
              <AddChips items={state.excluded} onAdd={(v) => patch({ excluded: state.excluded.includes(v) ? state.excluded : [...state.excluded, v] })} onRemove={(v) => patch({ excluded: state.excluded.filter((x) => x !== v) })} placeholder="Company name or domain" label="Add excluded companies" />
            </div>
          </Section>

          <Section title="Result limits" open={!!open.limits} onToggle={() => toggle("limits")}>
            <div className="flex flex-col gap-5 px-[22px] pb-[22px]">
              <NumberField label="Total" help="The safe OpenRouter demo generates exactly 10 fictional leads per run." value={state.total} min={1} onChange={(n) => patch({ total: n })} />
              <NumberField label="Leads per company" value={state.perCompany} min={1} onChange={(n) => patch({ perCompany: n })} />
            </div>
          </Section>
        </div>
      )}
    </aside>
  );
}
