"use client";

import { BarChart3, Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Page header: icon square + title, search and a primary "+ New analysis".
export function IntelligenceHeader({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  return (
    <header className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <span className="flex size-[46px] items-center justify-center rounded-lg bg-icon-well text-foreground"><BarChart3 className="size-[22px]" strokeWidth={1.75} /></span>
        <h1 className="text-[26px] leading-none font-bold tracking-[-0.02em] text-foreground">Intelligence</h1>
      </div>
      <div className="flex items-center gap-2.5">
        <label className="flex h-10 w-[273px] items-center gap-2.5 rounded-md border border-border bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-primary">
          <Search className="size-4" strokeWidth={1.75} />
          <input value={query} onChange={(e) => onQuery(e.target.value)} aria-label="Search analyses" className="min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground" />
        </label>
        <NewAnalysis />
      </div>
    </header>
  );
}

function NewAnalysis() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<"idle" | "running" | "queued">("idle");

  const run = () => {
    if (!question.trim()) return;
    setState("running");
    window.setTimeout(() => setState("queued"), 1500);
  };
  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) { setState("idle"); setQuestion(""); }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button className="h-10 rounded-md px-3.5 text-[16px] font-medium" />}>
        <Plus className="size-[18px]" strokeWidth={2.25} /> New analysis
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New analysis</DialogTitle>
          <DialogDescription>Ask a question across the twelve calls. The answer lands in this page.</DialogDescription>
        </DialogHeader>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          placeholder="What do you want to know about your calls?"
          aria-label="Question"
          className="w-full resize-none rounded-lg border border-border bg-card p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
        />
        {state === "queued" && (
          <div className="rounded-lg border border-border bg-page p-3 text-sm">
            <p className="font-medium text-foreground">Analysis queued</p>
            <p className="mt-0.5 text-muted-foreground">Results appear here once the calls have been read.</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" className="h-9" onClick={() => reset(false)}>{state === "queued" ? "Close" : "Cancel"}</Button>
          <Button className="h-9" onClick={run} disabled={!question.trim() || state !== "idle"}>
            {state === "running" ? <><Loader2 className="size-4 animate-spin" /> Running…</> : "Run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
