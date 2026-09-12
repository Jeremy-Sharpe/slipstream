"use client";

import { ArrowLeft, BarChart3, Check, ChevronsUpDown, Database, Globe, HelpCircle, Loader2, MessageSquare, Settings, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NotificationsMenu } from "@/components/shell/NotificationsMenu";
import { UserMenu } from "@/components/shell/UserMenu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "./IconButton";

const SURFACES = [
  { href: "/", label: "Conversations", icon: MessageSquare },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/intelligence", label: "Intelligence", icon: BarChart3 },
];

const SHORTCUTS = [
  ["Enter", "Expand or collapse the focused row"],
  ["⌘ F", "Search inside the grid"],
  ["Esc", "Close a dialog or menu"],
];

export function TopBar({ searching, onRunSearch, brief, onBriefChange }: {
  searching: boolean;
  onRunSearch: () => void;
  brief: string;
  onBriefChange: (brief: string) => void;
}) {
  const router = useRouter();
  const [briefOpen, setBriefOpen] = useState(false);
  const [draftBrief, setDraftBrief] = useState(brief);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-line bg-card pr-4 pl-3">
      <Link href="/" aria-label="Back to conversations" className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
        <ArrowLeft className="size-[18px]" strokeWidth={1.75} />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button" className="ml-6 flex items-center gap-2 rounded-md px-1 py-1 text-[17px] font-semibold text-ink hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
          <Target className="size-5" strokeWidth={1.75} />
          Leads
          <ChevronsUpDown className="size-4 text-muted-foreground" strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Switch surface</DropdownMenuLabel>
            {SURFACES.map(({ href, label, icon: Icon }) => (
              <DropdownMenuItem key={href} onClick={() => router.push(href)}>
                <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                <span className="flex-1">{label}</span>
                {href === "/leads" && <Check className="size-4" strokeWidth={2} />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          onClick={onRunSearch}
          disabled={searching}
          className="mr-6 flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-70"
        >
          {searching ? <Loader2 className="size-[18px] animate-spin" strokeWidth={2} /> : <Sparkles className="size-[18px]" strokeWidth={2} />}
          {searching ? "Searching…" : "Run search"}
        </button>

        <IconButton aria-label="Settings" render={<Link href="/settings" />}>
          <Settings className="size-5" strokeWidth={1.75} />
        </IconButton>

        <DropdownMenu>
          <DropdownMenuTrigger render={<IconButton aria-label="Pipeline status" />}>
            <Database className="size-5" strokeWidth={1.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Pipeline</DropdownMenuLabel>
              {[["Supabase", "not connected"], ["Origami", "no API key"]].map(([name, state]) => (
                <DropdownMenuItem key={name} disabled className="text-muted-foreground">
                  <span className="size-2 rounded-full bg-inactive" />
                  <span className="text-foreground">{name}</span>
                  <span>— {state}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger render={<IconButton aria-label="Help" />}>
            <HelpCircle className="size-5" strokeWidth={1.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem render={<a href="https://github.com/Jeremy-Sharpe/slipstream#readme" target="_blank" rel="noreferrer" />}>Documentation</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>Keyboard shortcuts</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => { setDraftBrief(brief); setBriefOpen(true); }}
          className="ml-2 flex h-9 items-center gap-2 rounded-md border border-line px-3.5 text-base text-ink transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <Globe className="size-5 text-muted-foreground" strokeWidth={1.75} />
          Brief
        </button>

        <NotificationsMenu />
        <UserMenu />
      </div>

      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Origami brief</DialogTitle>
            <DialogDescription>The ICP as the search brief. Edit it before running a search.</DialogDescription>
          </DialogHeader>
          <textarea
            value={draftBrief}
            onChange={(e) => setDraftBrief(e.target.value)}
            rows={9}
            className="w-full resize-y rounded-md border border-line bg-card p-3 text-sm leading-relaxed text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBriefOpen(false)}>Cancel</Button>
            <Button onClick={() => { onBriefChange(draftBrief); setBriefOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <dl className="flex flex-col divide-y divide-line">
            {SHORTCUTS.map(([key, what]) => (
              <div key={key} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-muted-foreground">{what}</dt>
                <dd><kbd className="rounded-md border border-line bg-muted px-1.5 py-0.5 font-mono text-xs text-ink">{key}</kbd></dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </header>
  );
}
