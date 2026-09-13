"use client";

import { ArrowUp, ChevronDown, ChevronUp, Download, FileCheck, Phone, Search, Target, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { quickActions } from "@/lib/legacy/data/home";
import type { QuickAction } from "@/lib/legacy/types/home";
import { cn } from "@/lib/legacy/utils";

const COLLAPSE_KEY = "slipstream.home.collapsed";

const ICONS: Record<QuickAction["id"], ReactNode> = {
  "add-call": <Phone className="size-7" strokeWidth={1.75} />,
  "find-leads": <Search className="size-7" strokeWidth={1.75} />,
  "review-drafts": <FileCheck className="size-7" strokeWidth={1.75} />,
  "derive-icp": <Target className="size-7" strokeWidth={1.75} />,
  "import-hubspot": <Download className="size-7" strokeWidth={1.75} />,
};

// Routes a free-text ask to the surface that answers it.
export function routeForAsk(text: string): string {
  const q = text.toLowerCase();
  if (/\b(call|transcript|conversation)/.test(q)) return "/";
  if (/\b(draft|campaign|outreach)/.test(q)) return "/legacy/campaigns";
  if (/\b(analys|pattern|intelligence|icp)/.test(q)) return "/legacy/intelligence";
  return "/legacy/leads";
}

export function GetStarted({ onAddCall }: { onAddCall: () => void }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [ask, setAsk] = useState("");

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1"); } catch {}
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1"); } catch {}
      return !c;
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ask.trim()) return;
    router.push(routeForAsk(ask));
  };

  const go = (a: QuickAction) => (a.id === "add-call" ? onAddCall() : router.push(a.href ?? "/"));

  return (
    <section className="px-11 pt-[34px]">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] leading-9 font-bold tracking-[-0.02em] text-foreground">Hey Maxim, ready to get started?</h1>
        <button type="button" onClick={toggle} aria-expanded={!collapsed} className="flex h-9 items-center gap-2 rounded-legacy-md border border-border px-4 text-[16px] font-medium text-foreground transition-colors hover:bg-legacy-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          {collapsed ? "Show more" : "Show less"}
          {collapsed ? <ChevronDown className="size-4" strokeWidth={2.25} /> : <ChevronUp className="size-4" strokeWidth={2.25} />}
        </button>
      </div>

      {!collapsed && (
        <>
          <form onSubmit={submit} className="mt-[34px] flex h-[50px] w-[683px] max-w-full items-center gap-4 rounded-legacy-lg border border-border bg-card pr-3 pl-5 shadow-[0_1px_2px_rgba(17,24,39,0.06)] focus-within:ring-2 focus-within:ring-primary">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Zap className="size-3.5" strokeWidth={2.5} /></span>
            <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask Slipstream anything or describe what you'd like to do…" aria-label="Ask Slipstream" className="min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground" />
            <button type="submit" aria-label="Send" disabled={!ask.trim()} className={cn("flex size-8 shrink-0 items-center justify-center rounded-legacy-md transition-colors", ask.trim() ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary/70")}>
              <ArrowUp className="size-4" strokeWidth={2.25} />
            </button>
          </form>

          <div className="mt-16 -mr-11 flex gap-5 overflow-x-auto pr-11 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickActions.map((a) => (
              <button key={a.id} type="button" onClick={() => go(a)} className="flex min-h-[128px] w-[315px] shrink-0 flex-col items-start rounded-legacy-xl border border-border/70 bg-page px-6 pt-6 pb-6 text-left transition-colors hover:border-foreground/20 hover:bg-legacy-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                <span className="flex items-center gap-3.5 text-[20px] leading-7 font-semibold whitespace-nowrap text-foreground">
                  <span className="text-primary">{ICONS[a.id]}</span>
                  {a.title}
                </span>
                <span className="mt-2.5 pl-[42px] text-[15px] leading-[21px] text-muted-foreground">{a.description}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
