"use client";

import { FileText, MoreHorizontal, Phone, Star, Table2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { HomeItem, HomeItemType } from "@/lib/types/home";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<HomeItemType, typeof Table2> = { list: Table2, calls: Phone, call: Phone, drafts: FileText };

function ago(minutes: number | null): string {
  if (minutes == null) return "";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const h = Math.round(minutes / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

// Clay's column ratios at 1934px content width; Name, Tags and Owner flex.
const COLS = "grid-cols-[minmax(0,1fr)_131px_minmax(0,0.45fr)_158px_197px_minmax(96px,0.31fr)_86px_64px]";
const head = "text-[15px] font-semibold text-foreground";

export function RecentTable({ rows, loading, favourites, emptyLabel, onToggleFavourite, onRename, onDuplicate, onDelete }: {
  rows: HomeItem[];
  loading: boolean;
  favourites: Set<string>;
  emptyLabel: string;
  onToggleFavourite: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) input.current?.select(); }, [editing]);

  const startRename = (item: HomeItem) => { setDraft(item.name); setEditing(item.id); };
  const commit = (id: string) => { if (draft.trim()) onRename(id, draft.trim()); setEditing(null); };
  const onRowKey = (e: KeyboardEvent, item: HomeItem) => { if (e.key === "Enter" && editing !== item.id) router.push(item.href); };

  return (
    <div className="border-t border-border">
      <div className={cn("grid h-12 items-center border-b border-border px-11", COLS, head)}>
        <span>Name</span><span>Favourite</span><span>Tags</span><span>Created at</span><span>Last opened by me</span><span>Owner</span><span>Access</span><span />
      </div>

      {loading && Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={cn("grid h-[61px] items-center border-b border-border px-11", COLS)} aria-busy="true">
          <span className="h-3.5 w-48 rounded bg-muted" /><span className="size-4 rounded bg-muted" /><span /><span className="h-3.5 w-20 rounded bg-muted" /><span className="h-3.5 w-20 rounded bg-muted" /><span className="h-3.5 w-16 rounded bg-muted" /><span className="h-3.5 w-8 rounded bg-muted" /><span />
        </div>
      ))}

      {!loading && rows.length === 0 && (
        <div className="flex justify-center pt-[120px] pb-16 text-[16px] text-muted-foreground">{emptyLabel}</div>
      )}

      {!loading && rows.map((item) => {
        const Icon = TYPE_ICON[item.type];
        const fav = favourites.has(item.id);
        return (
          <div
            key={item.id}
            role="link"
            tabIndex={0}
            onClick={() => editing !== item.id && router.push(item.href)}
            onKeyDown={(e) => onRowKey(e, item)}
            className={cn("grid h-[61px] cursor-pointer items-center border-b border-border px-11 text-[16px] text-foreground transition-colors duration-150 hover:bg-page focus-visible:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary", COLS)}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              {editing === item.id ? (
                <input
                  ref={input}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commit(item.id); if (e.key === "Escape") setEditing(null); }}
                  onBlur={() => commit(item.id)}
                  aria-label="Rename"
                  className="h-8 w-80 rounded-md border border-border px-2 text-[16px] outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <span className="truncate">{item.name}</span>
              )}
            </span>
            <span>
              <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFavourite(item.id); }} aria-pressed={fav} aria-label={fav ? "Remove from favourites" : "Add to favourites"} className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                <Star className={cn("size-[18px] transition-colors duration-150", fav ? "fill-foreground text-foreground" : "text-muted-foreground")} strokeWidth={1.5} />
              </button>
            </span>
            <span className="flex gap-1.5">
              {item.tags.map((t) => <span key={t} className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-[12px] font-medium text-foreground/80">{t}</span>)}
            </span>
            <span className="text-foreground">{ago(item.createdMinutesAgo)}</span>
            <span className="text-foreground">{ago(item.lastOpenedMinutesAgo)}</span>
            <span className="flex items-center gap-2"><span className="size-4 rounded-full bg-foreground" />{item.owner}</span>
            <span className="text-foreground">{item.access}</span>
            <span className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger render={<button type="button" aria-label={`Actions for ${item.name}`} className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground active:bg-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
                  <MoreHorizontal className="size-4" strokeWidth={1.5} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => router.push(item.href)}>Open</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => startRename(item)}>Rename</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(item.id)}>Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(item.id)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </div>
        );
      })}
    </div>
  );
}
