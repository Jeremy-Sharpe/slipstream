"use client";

import { Check, ChevronDown, Folder, MoreHorizontal, Pause, Play, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Campaign } from "@/lib/types/campaigns";
import { cn } from "@/lib/utils";
import { PeopleTable } from "./PeopleTable";
import { PersonPanel } from "./PersonPanel";
import { SequencePanel } from "./SequencePanel";
import { StatusBadge } from "./StatusBadge";
import { campaignActions, exportCsv, useCampaigns } from "./store";

export function CampaignDetail({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const all = useCampaigns();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(campaign.name);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (renaming) input.current?.select(); }, [renaming]);

  const selected = campaign.people.find((p) => p.id === selectedId) ?? null;
  const approved = campaign.people.filter((p) => p.status === "approved").length;
  const pending = campaign.people.filter((p) => p.status === "pending").length;

  const commitRename = () => { if (name.trim() && name.trim() !== campaign.name) campaignActions.rename(campaign.id, name.trim()); setRenaming(false); };
  const remove = () => { campaignActions.remove(campaign.id); router.push("/campaigns"); };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <nav aria-label="Breadcrumb" className="flex h-16 shrink-0 items-center gap-1.5 border-b border-border pr-4 pl-3 text-[17px]">
        <Link href="/home" className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 text-[17px] text-foreground transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"><Folder className="size-[18px]" strokeWidth={1.5} />Home</Link>
        <span className="px-1 text-[17px] text-muted-foreground">/</span>
        <Link href="/campaigns" className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 text-[17px] text-foreground transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"><Send className="size-[18px]" strokeWidth={1.5} />Campaigns</Link>
        <span className="px-1 text-[17px] text-muted-foreground">/</span>
        {renaming ? (
          <input ref={input} value={name} onChange={(e) => setName(e.target.value)} onBlur={commitRename} onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setName(campaign.name); setRenaming(false); } }} className="h-9 w-80 rounded-md border border-border px-2 text-[17px] font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary" />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" className={cn("flex h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 text-[17px] text-foreground transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", "font-semibold")} />}>
              {campaign.name}<ChevronDown className="size-4" strokeWidth={1.5} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {all.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => router.push(`/campaigns/${c.id}`)} className="flex items-center justify-between gap-2">
                  <span className="truncate">{c.name}</span>{c.id === campaign.id && <Check className="size-3.5" strokeWidth={2.5} />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>

      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-border px-5">
        <StatusBadge status={campaign.status} />
        <span className="text-[15px] text-muted-foreground tabular-nums">{campaign.people.length} people · {approved} approved · 0 sent</span>
        <span className="text-[15px] text-muted-foreground">· {campaign.source} · {campaign.owner}</span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => campaignActions.toggleStatus(campaign.id)} className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3.5 text-[15px] font-medium text-foreground transition-colors duration-150 hover:bg-muted active:bg-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
            {campaign.status === "active" ? <><Pause className="size-4" strokeWidth={1.75} /> Pause</> : <><Play className="size-4" strokeWidth={1.75} /> {campaign.status === "draft" ? "Activate" : "Resume"}</>}
          </button>
          <button type="button" onClick={() => campaignActions.approveAll(campaign.id)} disabled={pending === 0} className="flex h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-[15px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/85 active:bg-primary/75 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-default disabled:opacity-50">
            <Check className="size-4" strokeWidth={2.5} /> Approve all{pending > 0 && <span className="tabular-nums opacity-80">({pending})</span>}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" aria-label="More actions" className="flex size-10 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-foreground/70 transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
              <MoreHorizontal className="size-4" strokeWidth={1.75} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => { setName(campaign.name); setRenaming(true); }}>Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCsv(campaign)}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => campaignActions.duplicate(campaign.id)}>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={remove}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="flex min-h-full min-w-max">
            {!selected && <SequencePanel campaign={campaign} />}
            <PeopleTable campaign={campaign} selectedId={selectedId} onSelect={(p) => setSelectedId(p.id)} />
          </div>
        </div>
        {selected && <PersonPanel campaign={campaign} person={selected} onClose={() => setSelectedId(null)} />}
      </div>
    </div>
  );
}
