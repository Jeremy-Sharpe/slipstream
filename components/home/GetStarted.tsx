"use client";

import { ArrowUp, ChevronDown, ChevronUp, Download, FileCheck, Phone, Search, Target, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { quickActions } from "@/lib/data/home";
import type { QuickAction } from "@/lib/types/home";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "slipstream.home.collapsed";

const ICONS: Record<QuickAction["id"], ReactNode> = {
  "add-call": <Phone className="size-5" strokeWidth={1.75} />,
  "find-leads": <Search className="size-5" strokeWidth={1.75} />,
  "review-drafts": <FileCheck className="size-5" strokeWidth={1.75} />,
  "derive-icp": <Target className="size-5" strokeWidth={1.75} />,
  "import-hubspot": <Download className="size-5" strokeWidth={1.75} />,
};

// Routes a free-text ask to the surface that answers it.
export function routeForAsk(text: string): string {
  const q = text.toLowerCase();
  if (/\b(call|transcript|conversation)/.test(q)) return "/";
  if (/\b(draft|campaign|outreach)/.test(q)) return "/campaigns";
  if (/\b(analys|pattern|intelligence|icp)/.test(q)) return "/intelligence";
  return "/leads";
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
    <section className="px-9 pt-7">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Hey Maxim, ready to get started?</h1>
        <button type="button" onClick={toggle} aria-expanded={!collapsed} className="flex h-9 items-center gap-2 rounded-lg border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          {collapsed ? "Show more" : "Show less"}
          {collapsed ? <ChevronDown className="size-4" strokeWidth={2} /> : <ChevronUp className="size-4" strokeWidth={2} />}
        </button>
      </div>

      {!collapsed && (
        <>
          <form onSubmit={submit} className="mt-6 flex h-11 w-[590px] max-w-full items-center gap-3 rounded-lg border border-border bg-card pr-1.5 pl-3 focus-within:ring-2 focus-within:ring-primary">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Zap className="size-3.5" strokeWidth={2.25} /></span>
            <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask Slipstream anything or describe what you'd like to do…" aria-label="Ask Slipstream" className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground" />
            <button type="submit" aria-label="Send" disabled={!ask.trim()} className={cn("flex size-7 shrink-0 items-center justify-center rounded-md transition-colors", ask.trim() ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary/60")}>
              <ArrowUp className="size-4" strokeWidth={2.25} />
            </button>
          </form>

          <div className="mt-12 grid grid-cols-5 gap-4">
            {quickActions.map((a) => (
              <button key={a.id} type="button" onClick={() => go(a)} className="flex min-h-[110px] flex-col items-start rounded-xl border border-border bg-page p-5 text-left transition-colors hover:border-foreground/20 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                <span className="flex items-center gap-3 text-[15px] leading-tight font-semibold whitespace-nowrap text-foreground">
                  <span className="text-primary">{ICONS[a.id]}</span>
                  {a.title}
                </span>
                <span className="mt-2 pl-8 text-[13px] leading-snug text-muted-foreground">{a.description}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
