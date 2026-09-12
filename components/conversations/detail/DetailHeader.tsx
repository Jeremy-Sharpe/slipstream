"use client";

import { Check, ChevronDown, ChevronRight, Download, ExternalLink, Folder, MessageSquare, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusPill } from "@/components/conversations/StatusPill";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { CallRecord } from "@/lib/types/calls";
import type { ConversationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const dayFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "2-digit", hour12: false });
const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function DetailHeader({ call, others, status, onMarkDone, onRerun, rerunning }: {
  call: CallRecord;
  others: { id: string; company: string; prospect: string }[];
  status: ConversationStatus;
  onMarkDone: () => void;
  onRerun: () => void;
  rerunning: boolean;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const at = new Date(call.at);

  const downloadTranscript = () => {
    const lines = call.turns.map((t) => `[${fmtDuration(t.at)}] ${t.name}: ${t.text}`);
    const blob = new Blob([`${call.company} — ${call.rep} with ${call.prospect}\n${dayFmt.format(at)} ${timeFmt.format(at)}\n\n${lines.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${call.id}-transcript.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-card px-6 text-sm">
        <Link href="/home" className="flex items-center gap-2 rounded-md px-1.5 py-1 text-ink hover:bg-muted"><Folder className="size-4 text-muted-foreground" strokeWidth={1.75} />Home</Link>
        <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={2} />
        <Link href="/" className="flex items-center gap-2 rounded-md px-1.5 py-1 text-ink hover:bg-muted"><MessageSquare className="size-4 text-muted-foreground" strokeWidth={1.75} />Conversations</Link>
        <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={2} />
        <DropdownMenu>
          <DropdownMenuTrigger render={<button type="button" className="flex items-center gap-1.5 rounded-md px-1.5 py-1 font-semibold text-ink hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
            {call.company}
            <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {others.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => router.push(`/conversations/${c.id}`)} className={cn(c.id === call.id && "font-medium")}>
                <span className="truncate">{c.company}</span>
                <span className="ml-auto text-xs text-muted-foreground">{c.prospect.split(" ")[0]}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-card px-6">
        <StatusPill status={status} />
        <span className="text-sm text-ink">{call.rep}</span>
        <span className="text-sm text-muted-foreground tabular-nums">{dayFmt.format(at)} · {timeFmt.format(at)}</span>
        <span className="text-sm text-muted-foreground tabular-nums">{fmtDuration(call.durationSeconds)}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" className="h-8 rounded-md text-sm" onClick={onMarkDone} disabled={status === "synced"}>
            <Check className="size-3.5" strokeWidth={2} /> {status === "synced" ? "Done" : "Mark done"}
          </Button>
          <Button variant="outline" className="h-8 rounded-md text-sm" nativeButton={false} render={<Link href="/settings" />}>
            <ExternalLink className="size-3.5" strokeWidth={2} /> Open in HubSpot
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" aria-label="More" className="flex size-8 items-center justify-center rounded-md border border-line text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
              <MoreHorizontal className="size-4" strokeWidth={2} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onRerun} disabled={rerunning}><RefreshCw className={cn("size-4", rerunning && "animate-spin")} strokeWidth={1.75} /> {rerunning ? "Re-running…" : "Re-run extraction"}</DropdownMenuItem>
              <DropdownMenuItem onClick={downloadTranscript}><Download className="size-4" strokeWidth={1.75} /> Download transcript</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="text-destructive"><Trash2 className="size-4" strokeWidth={1.75} /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this conversation?</DialogTitle>
            <DialogDescription>The transcript, extracted fields and draft for {call.company} will be removed. This can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button onClick={() => { setConfirmDelete(false); router.push("/"); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
