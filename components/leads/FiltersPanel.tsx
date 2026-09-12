"use client";

import { Building2, ChevronDown, ChevronRight, Code2, Globe, Link2, MapPin, PanelLeft, Save, Search, ShieldCheck, SlidersHorizontal, Trash2, Type, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { IconButton } from "./IconButton";
import { cn } from "@/lib/utils";

// The Find People filter column: a Criteria section with suggested filters,
// then collapsible groups. Chips become editable filter rows when clicked.
const SUGGESTED: { key: string; label: string; icon: ReactNode; placeholder: string }[] = [
  { key: "job_title", label: "Job title", icon: <Type className="size-3.5" strokeWidth={2} />, placeholder: "Practice manager, operations manager…" },
  { key: "seniority", label: "Seniority", icon: <ShieldCheck className="size-3.5" strokeWidth={2} />, placeholder: "Manager, director, owner" },
  { key: "country", label: "Country", icon: <MapPin className="size-3.5" strokeWidth={2} />, placeholder: "Australia" },
  { key: "industry", label: "Company industry", icon: <Building2 className="size-3.5" strokeWidth={2} />, placeholder: "Legal, accounting, allied health" },
  { key: "target", label: "Target companies", icon: <Link2 className="size-3.5" strokeWidth={2} />, placeholder: "Paste domains or names" },
];

function Section({ title, open, onToggle, trailing, children }: { title: string; open: boolean; onToggle: () => void; trailing?: ReactNode; children?: ReactNode }) {
  return (
    <section className="border-b border-line">
      <button type="button" onClick={onToggle} className="flex h-[60px] w-full items-center gap-2.5 px-6 text-left text-[15px] font-semibold text-ink focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
        {open ? <ChevronDown className="size-4 text-muted-foreground" strokeWidth={2} /> : <ChevronRight className="size-4 text-muted-foreground" strokeWidth={2} />}
        <span className="flex-1">{title}</span>
        {trailing}
      </button>
      {open && children}
    </section>
  );
}

export function FiltersPanel() {
  const [open, setOpen] = useState<Record<string, boolean>>({ criteria: true });
  const [active, setActive] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSuggested, setShowSuggested] = useState(true);
  const toggle = (k: string) => setOpen((s) => ({ ...s, [k]: !s[k] }));
  const add = (k: string) => setActive((a) => (a.includes(k) ? a : [...a, k]));
  const remove = (k: string) => { setActive((a) => a.filter((x) => x !== k)); setValues((v) => { const n = { ...v }; delete n[k]; return n; }); };
  const suggested = SUGGESTED.filter((f) => !active.includes(f.key));

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-r border-line bg-card">
      <header className="flex h-16 shrink-0 items-center border-b border-line pr-4 pl-6">
        <PanelLeft className="size-4 text-muted-foreground" strokeWidth={1.75} />
        <h2 className="ml-4 text-[17px] font-semibold text-ink">Filters</h2>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-8 items-center rounded-md border border-line">
            <span className="flex h-full w-10 items-center justify-center rounded-l-[5px] bg-muted text-ink"><SlidersHorizontal className="size-4" strokeWidth={1.75} /></span>
            <span className="h-full w-px bg-line" />
            <button type="button" aria-label="Edit as code" className="flex h-full w-10 items-center justify-center rounded-r-[5px] text-muted-foreground hover:bg-muted hover:text-foreground"><Code2 className="size-4" strokeWidth={1.75} /></button>
          </div>
          <IconButton bordered aria-label="Clear filters" onClick={() => { setActive([]); setValues({}); }}><Trash2 className="size-4" strokeWidth={1.75} /></IconButton>
          <button type="button" className="flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Save filters"><Save className="size-4" strokeWidth={1.75} /><ChevronDown className="size-3.5" strokeWidth={2} /></button>
        </div>
      </header>

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
                  const f = SUGGESTED.find((s) => s.key === k)!;
                  return (
                    <li key={k} className="rounded-lg border border-line">
                      <div className="flex h-9 items-center gap-2 border-b border-line px-3 text-[13px] font-medium text-ink">
                        <span className="text-muted-foreground">{f.icon}</span>{f.label}
                        <button type="button" onClick={() => remove(k)} aria-label={`Remove ${f.label}`} className="ml-auto text-muted-foreground hover:text-foreground"><X className="size-3.5" strokeWidth={2} /></button>
                      </div>
                      <input autoFocus value={values[k] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} placeholder={f.placeholder} className="h-10 w-full bg-transparent px-3 text-sm text-ink outline-none placeholder:text-muted-foreground" />
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
                    {suggested.map((f) => (
                      <button key={f.key} type="button" onClick={() => add(f.key)} className={cn("flex h-8 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary-soft px-2.5 text-sm text-primary-foreground transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none")}>
                        <span className="text-primary">{f.icon}</span>{f.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Section>

        <Section title="Target companies" open={!!open.target} onToggle={() => toggle("target")}>
          <div className="px-6 pb-5 text-sm text-muted-foreground">Add a list of companies to search inside, or leave empty to search everywhere.</div>
        </Section>
        <Section
          title="Excluded people"
          open={!!open.excluded}
          onToggle={() => toggle("excluded")}
          trailing={<span className="flex h-7 items-center gap-1.5 rounded-full border border-primary/40 bg-primary-soft px-2.5 text-[13px] font-medium text-primary"><Globe className="size-3.5" strokeWidth={2} />Upgrade</span>}
        >
          <div className="px-6 pb-5 text-sm text-muted-foreground">People already in your CRM or on an exclusion list are skipped.</div>
        </Section>
        <Section title="Result limits" open={!!open.limits} onToggle={() => toggle("limits")}>
          <div className="px-6 pb-5 text-sm text-muted-foreground">Start at 10 leads per search; credits are spent per row.</div>
        </Section>
      </div>
    </aside>
  );
}
