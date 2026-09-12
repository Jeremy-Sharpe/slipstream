"use client";

import { ArrowUp, ChevronUp, Download, FileCheck, Phone, Search, Target, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { quickActions } from "@/lib/data/home";
import type { QuickAction } from "@/lib/types/home";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "slipstream.home.collapsed";

const ICONS: Record<QuickAction["id"], ReactNode> = {
  "add-call": <Phone className="size-6" strokeWidth={1.5} />,
  "find-leads": <Search className="size-6" strokeWidth={1.5} />,
  "review-drafts": <FileCheck className="size-6" strokeWidth={1.5} />,
  "derive-icp": <Target className="size-6" strokeWidth={1.5} />,
  "import-hubspot": <Download className="size-6" strokeWidth={1.5} />,
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
    <section className="px-11 pt-[34px]">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] leading-9 font-bold tracking-[-0.02em] text-foreground">Hey Maxim, ready to get started?</h1>
        <button type="button" onClick={toggle} aria-expanded={!collapsed} className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-4 text-[16px] font-medium text-foreground transition-colors duration-150 hover:bg-muted active:bg-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          {collapsed ? "Show more" : "Show less"}
          <ChevronUp className={cn("size-4 transition-transform duration-150", collapsed && "rotate-180")} strokeWidth={2} />
        </button>
      </div>

      {!collapsed && (
        <>
          <form onSubmit={submit} className="mt-[34px] flex h-[50px] w-[683px] max-w-full items-center gap-4 rounded-lg border border-border bg-card pr-3 pl-5 shadow-[0_1px_2px_rgba(17,24,39,0.06)] transition-[box-shadow,border-color] duration-150 focus-within:border-foreground/30 focus-within:shadow-[0_1px_2px_rgba(17,24,39,0.06),0_0_0_2px_var(--primary)]">
            <Zap className="size-5 shrink-0 text-primary" strokeWidth={2} />
            <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask anything or describe what you'd like to do" aria-label="Ask Slipstream" className="min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground" />
            <button type="submit" aria-label="Send" disabled={!ask.trim()} className={cn("flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", ask.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground")}>
              <ArrowUp className="size-4" strokeWidth={2} />
            </button>
          </form>

          <div className="mt-16 -mr-11 flex gap-5 overflow-x-auto pr-11 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickActions.map((a) => (
              <button key={a.id} type="button" onClick={() => go(a)} className="flex h-[133px] w-[328px] shrink-0 flex-col items-start rounded-xl border border-border bg-page px-6 pt-6 text-left transition-colors duration-150 hover:bg-muted active:bg-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                <span className="flex items-center gap-3.5 text-[20px] leading-7 font-semibold whitespace-nowrap text-foreground">
                  <span className="text-foreground">{ICONS[a.id]}</span>
                  {a.title}
                </span>
                <span className="mt-2 pl-[38px] text-[15px] leading-[21px] text-muted-foreground">{a.description}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
