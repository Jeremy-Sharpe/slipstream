"use client";

import { MoreHorizontal } from "lucide-react";
import type { KeyboardEvent } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Campaign, CampaignPerson } from "@/lib/types/campaigns";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { campaignActions } from "./store";

const COLS = "grid-cols-[minmax(170px,1fr)_minmax(150px,220px)_72px_110px_96px_48px]";
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const dateFmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Melbourne" });

export function PeopleTable({ campaign, selectedId, onSelect }: { campaign: Campaign; selectedId: string | null; onSelect: (p: CampaignPerson) => void }) {
  const onKey = (e: KeyboardEvent, p: CampaignPerson) => { if (e.key === "Enter") onSelect(p); };
  return (
    <div className="min-w-[640px] flex-1">
      <div className="flex h-14 items-center justify-between border-b border-border px-6">
        <h2 className="text-[17px] font-semibold text-foreground">People</h2>
        <span className="text-[14px] text-muted-foreground">{campaign.people.length} enrolled</span>
      </div>
      <div className={cn("grid h-12 items-center border-b border-border px-6 text-[14.5px] font-semibold text-foreground", COLS)}>
        <span>Person</span><span>Company</span><span>Step</span><span>Status</span><span>Next action</span><span />
      </div>
      {campaign.people.length === 0 && (
        <div className="flex h-48 flex-col items-center justify-center gap-1 text-center">
          <p className="text-[15px] text-foreground">No one enrolled yet.</p>
          <p className="text-[15px] text-muted-foreground">Add people from a lead list to draft their sequences.</p>
        </div>
      )}
      {campaign.people.map((p) => (
        <div
          key={p.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(p)}
          onKeyDown={(e) => onKey(e, p)}
          className={cn("grid h-[61px] cursor-pointer items-center border-b border-border px-6 text-[16px] text-foreground transition-colors hover:bg-page focus-visible:bg-page focus-visible:outline-none", COLS, selectedId === p.id && "bg-page")}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-avatar text-[12px] font-medium text-foreground">{initials(p.name)}</span>
            <span className="truncate font-medium">{p.name}</span>
          </span>
          <span className="truncate text-muted-foreground">{p.company}</span>
          <span className="tabular-nums text-muted-foreground">{p.step} of {campaign.steps.length}</span>
          <span><StatusBadge status={p.status} /></span>
          <span className="tabular-nums text-muted-foreground">{p.status === "skipped" ? "—" : dateFmt.format(new Date(p.nextAction))}</span>
          <span className="flex justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger render={<button type="button" aria-label={`Actions for ${p.name}`} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
                <MoreHorizontal className="size-4" strokeWidth={1.75} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onSelect(p)}>Open</DropdownMenuItem>
                {p.status !== "approved" && <DropdownMenuItem onClick={() => campaignActions.setPerson(campaign.id, p.id, "approved")}>Approve</DropdownMenuItem>}
                {p.status !== "skipped" && <DropdownMenuItem onClick={() => campaignActions.setPerson(campaign.id, p.id, "skipped")}>Skip</DropdownMenuItem>}
                {p.status === "skipped" && <DropdownMenuItem onClick={() => campaignActions.setPerson(campaign.id, p.id, "pending")}>Re-enrol</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => campaignActions.removePerson(campaign.id, p.id)}>Remove</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </div>
      ))}
    </div>
  );
}
