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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-muted-foreground hover:text-foreground",
              tab === t.key && "bg-muted font-medium text-foreground",
            )}
          >
            {t.label}
            <span className="text-[11px] tabular-nums text-muted-foreground">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10"><Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" /></TableHead>
              <TableHead className="w-[220px]">Contact</TableHead>
              <TableHead className="w-[210px]">Company</TableHead>
              <TableHead className="w-[190px]">Title</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead className="w-[130px]">Time</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                  {rows.length === 0 ? "No conversations yet. Add a call to get started." : "Nothing matches."}
                </TableCell>
              </TableRow>
            )}
            {visible.map((r) => (
              <TableRow key={r.id} data-state={checked.has(r.id) ? "selected" : undefined} className="cursor-pointer">
                <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={checked.has(r.id)} onCheckedChange={() => toggle(r.id)} aria-label={`Select ${r.contact}`} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
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
                <TableCell className="text-muted-foreground">{r.title}</TableCell>
                <TableCell className="max-w-0 text-muted-foreground"><span className="block truncate">“{r.preview}”</span></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                  {when(r.at)}
                  {r.durationSeconds ? <span className="ml-1.5 text-foreground/40">{duration(r.durationSeconds)}</span> : null}
                </TableCell>
                <TableCell><StatusPill status={r.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>Showing {visible.length} of {rows.length}</span>
          {checked.size > 0 && <span>{checked.size} selected</span>}
        </div>
      </div>
    </div>
  );
}
