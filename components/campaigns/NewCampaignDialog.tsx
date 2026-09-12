"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { campaignActions } from "./store";

const SOURCES = ["Leads — ICP v3", "Won deals"];

export function NewCampaignDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState(SOURCES[0]);

  const create = () => {
    const c = campaignActions.create(name.trim() || "Untitled campaign", source);
    setOpen(false);
    setName("");
    router.push(`/campaigns/${c.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" className="flex h-10 items-center gap-1.5 rounded-md bg-primary px-3.5 text-[16px] font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none" />}>
        <Plus className="size-[18px]" strokeWidth={2.25} /> New campaign
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
          <DialogDescription>Sequences are drafted per person and approved one at a time. Nothing is sent from Slipstream.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Name</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="Essential Eight renewals — Q4" className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
          </label>
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Source list</span>
            <div className="flex flex-col gap-1">
              {SOURCES.map((s) => (
                <button key={s} type="button" onClick={() => setSource(s)} className={cn("flex h-10 items-center gap-2.5 rounded-lg border border-border px-3 text-left text-sm text-foreground hover:bg-page", source === s && "border-primary bg-primary-soft")}>
                  <span className={cn("size-4 rounded-full border border-border bg-card", source === s && "border-[5px] border-primary")} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg border border-border px-3.5 text-sm text-foreground hover:bg-muted">Cancel</button>
          <button type="button" onClick={create} className="h-9 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/85">Create</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
