"use client";

import { Plus, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { conversations as fixtures } from "@/lib/data/conversations";
import { addConversation } from "@/lib/store/conversations";
import { cn } from "@/lib/utils";

// Pick a fixture call or an audio file; either lands in the feed as Processing.
export function AddCallDialog() {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<string | null>(fixtures[0]?.id ?? null);
  const [file, setFile] = useState<File | null>(null);

  const add = () => {
    const now = new Date().toISOString();
    const id = `call-${Date.now().toString(36)}`;
    if (file) {
      addConversation({ id, kind: "call", contact: "Unknown caller", title: "", company: file.name, industry: "", headcount: 0, location: "", rep: "Sam Whitfield", at: now, outcome: "open", preview: "Transcribing…", status: "processing" });
    } else {
      const src = fixtures.find((f) => f.id === pick);
      if (!src) return;
      addConversation({ ...src, id, sourceId: src.sourceId ?? src.id, at: now, status: "processing", preview: "Transcribing…" });
    }
    setFile(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-9 rounded-md px-3.5 text-[16px] font-medium" />}>
        <Plus className="size-[18px]" strokeWidth={2} /> Add a call
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a call</DialogTitle>
          <DialogDescription>Pick a recorded call or upload audio. It lands in the feed while it transcribes.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground">Recorded calls</p>
          <div role="radiogroup" className="max-h-56 overflow-y-auto rounded-md border border-border">
            {fixtures.map((f) => {
              const on = !file && pick === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => { setPick(f.id); setFile(null); }}
                  className={cn("flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left text-sm transition-colors duration-150 last:border-b-0 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none", on && "bg-muted")}
                >
                  <span className={cn("size-3.5 rounded-full border border-muted-foreground", on && "border-4 border-primary")} />
                  <span className="flex-1 truncate">{f.contact} <span className="text-muted-foreground">· {f.company}</span></span>
                </button>
              );
            })}
          </div>

          <p className="text-xs font-medium text-muted-foreground">Or upload audio</p>
          <label className={cn("flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted focus-within:ring-2 focus-within:ring-primary", file && "border-solid text-foreground")}>
            <Upload className="size-4" strokeWidth={1.75} />
            <span className="truncate">{file ? file.name : "Choose a file (mp3, m4a, wav)"}</span>
            <input type="file" accept="audio/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={add} disabled={!file && !pick}>Add call</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
