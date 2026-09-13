"use client";

import { Check, ChevronDown, ChevronRight, Download, ExternalLink, Folder, MessageSquare, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusPill } from "@/components/legacy/conversations/StatusPill";
import { Button } from "@/components/legacy/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/legacy/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/legacy/ui/dropdown-menu";
import type { CallRecord } from "@/lib/legacy/types/calls";
import type { ConversationStatus } from "@/lib/legacy/types";
import { cn } from "@/lib/legacy/utils";

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
      <div className="flex h-16 min-w-0 shrink-0 items-center gap-2 border-b border-legacy-line bg-card px-3 text-[15px] sm:px-5 sm:text-[17px]">
        <Link href="/legacy/home" className="hidden items-center gap-2 rounded-legacy-md px-1.5 py-1 text-legacy-ink hover:bg-legacy-muted sm:flex"><Folder className="size-[18px] text-legacy-ink" strokeWidth={1.75} />Home</Link>
        <ChevronRight className="hidden size-4 text-muted-foreground sm:block" strokeWidth={2} />
        <Link href="/legacy" className="flex shrink-0 items-center gap-2 rounded-legacy-md px-1.5 py-1 text-legacy-ink hover:bg-legacy-muted"><MessageSquare className="size-[18px] text-legacy-ink" strokeWidth={1.75} /><span className="hidden sm:inline">Conversations</span></Link>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
        <DropdownMenu>
          <DropdownMenuTrigger render={<button type="button" className="flex min-w-0 items-center gap-1.5 rounded-legacy-md px-1.5 py-1 font-semibold text-legacy-ink hover:bg-legacy-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
            <span className="truncate">{call.company}</span>
            <ChevronDown className="size-4 text-muted-foreground" strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {others.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => router.push(`/legacy/conversations/${c.id}`)} className={cn(c.id === call.id && "font-medium")}>
                <span className="truncate">{c.company}</span>
                <span className="ml-auto text-[13px] text-muted-foreground">{c.prospect.split(" ")[0]}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex min-h-[72px] shrink-0 flex-wrap items-center gap-2 border-b border-legacy-line bg-card px-3 py-3 sm:gap-4 sm:px-5">
        <StatusPill status={status} />
        <span className="text-[16px] text-legacy-ink">{call.rep}</span>
        <span className="hidden text-[16px] text-muted-foreground tabular-nums md:inline">{dayFmt.format(at)} · {timeFmt.format(at)}</span>
        <span className="hidden text-[16px] text-muted-foreground tabular-nums sm:inline">{fmtDuration(call.durationSeconds)}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" className="h-10 rounded-legacy-md px-3 text-[14px] font-medium sm:px-3.5 sm:text-[15px]" onClick={onMarkDone} disabled={status === "synced"}>
            <Check className="size-4" strokeWidth={2} /> {status === "synced" ? "Done" : <><span className="sm:hidden">Done</span><span className="hidden sm:inline">Mark done</span></>}
          </Button>
          <Button aria-label="Open in HubSpot" variant="outline" className="size-10 rounded-legacy-md p-0 text-[15px] font-medium sm:h-10 sm:w-auto sm:px-3.5" nativeButton={false} render={<Link href="/legacy/settings" />}>
            <ExternalLink className="size-4" strokeWidth={2} /> <span className="hidden sm:inline">Open in HubSpot</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" aria-label="More" className="flex size-10 items-center justify-center rounded-legacy-md border border-legacy-line text-muted-foreground hover:bg-legacy-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
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
            <Button onClick={() => { setConfirmDelete(false); router.push("/legacy"); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
