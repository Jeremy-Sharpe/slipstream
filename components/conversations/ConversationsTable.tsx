"use client";

import { Mail, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Conversation, ConversationKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatusPill } from "./StatusPill";

type Tab = "all" | ConversationKind;

const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const dayFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "2-digit", hour12: false });

function when(iso: string) {
  const d = new Date(iso);
  return `${dayFmt.format(d)} · ${timeFmt.format(d)}`;
}

function duration(s?: number) {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ConversationsTable({ rows, query }: { rows: Conversation[]; query: string }) {
  const [tab, setTab] = useState<Tab>("all");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const counts = useMemo(
    () => ({ all: rows.length, call: rows.filter((r) => r.kind === "call").length, email: rows.filter((r) => r.kind === "email").length }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (tab === "all" || r.kind === tab) && (!q || `${r.contact} ${r.company} ${r.title} ${r.preview}`.toLowerCase().includes(q)));
  }, [rows, tab, query]);

  const allChecked = visible.length > 0 && visible.every((r) => checked.has(r.id));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(visible.map((r) => r.id)));
  const toggle = (id: string) => setChecked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "call", label: "Calls" },
    { key: "email", label: "Emails" },
  ];

  return (
    <div className="mt-5 flex flex-col">
      <div className="px-8 pb-4">
        <div className="inline-flex h-9 items-center rounded-md border border-border bg-muted/60 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex h-full items-center gap-2 rounded-[5px] px-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                tab === t.key && "border border-border bg-background font-medium text-foreground shadow-xs",
              )}
            >
              {t.label}
              <span className="text-xs tabular-nums text-muted-foreground">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <Table className="table-fixed text-sm">
          <TableHeader>
            <TableRow className="h-10 hover:bg-transparent">
              <TableHead className="w-14 pl-8"><Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" /></TableHead>
              <TableHead className="w-[170px] font-medium text-muted-foreground">Contact</TableHead>
              <TableHead className="w-[210px] font-medium text-muted-foreground">Company</TableHead>
              <TableHead className="w-[170px] font-medium text-muted-foreground">Title</TableHead>
              <TableHead className="font-medium text-muted-foreground">Preview</TableHead>
              <TableHead className="w-[160px] font-medium text-muted-foreground">Time</TableHead>
              <TableHead className="w-[160px] pr-8 font-medium text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:last-child]:border-b">
            {visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-40 text-center text-sm text-muted-foreground">
                  {rows.length === 0 ? "No conversations yet. Add a call to get started." : "Nothing matches."}
                </TableCell>
              </TableRow>
            )}
            {visible.map((r) => (
              <TableRow key={r.id} data-state={checked.has(r.id) ? "selected" : undefined} className="h-[52px] cursor-pointer hover:bg-muted/50">
                <TableCell className="pl-8" onClick={(e) => e.stopPropagation()}><Checkbox checked={checked.has(r.id)} onCheckedChange={() => toggle(r.id)} aria-label={`Select ${r.contact}`} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-7"><AvatarFallback className="text-[11px]">{initials(r.contact)}</AvatarFallback></Avatar>
                    <span className="font-medium">{r.contact}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-foreground/80">
                    {r.kind === "call" ? <Phone className="size-3.5 text-muted-foreground" strokeWidth={1.75} /> : <Mail className="size-3.5 text-muted-foreground" strokeWidth={1.75} />}
                    <span className="truncate">{r.company}</span>
                  </div>
                </TableCell>
                <TableCell className="truncate text-muted-foreground">{r.title}</TableCell>
                <TableCell className="text-muted-foreground"><span className="block truncate">“{r.preview}”</span></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                  {when(r.at)}
                  {r.durationSeconds ? <span className="ml-1.5 text-foreground/40">{duration(r.durationSeconds)}</span> : null}
                </TableCell>
                <TableCell className="pr-8"><StatusPill status={r.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-8 py-2.5 text-[13px] text-muted-foreground">
          <span>Showing {visible.length} of {rows.length}</span>
          {checked.size > 0 && <span>{checked.size} selected</span>}
        </div>
      </div>
    </div>
  );
}
