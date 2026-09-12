"use client";

import { ChevronDown, Clock, ListFilter, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { homeItems } from "@/lib/data/home";
import type { HomeItem, HomeItemType, Owner } from "@/lib/types/home";
import { cn } from "@/lib/utils";
import { RecentTable } from "./RecentTable";

type Tab = "all" | "recents" | "favourites";
type OwnerFilter = "all" | Owner;
type TypeFilter = "all" | "list" | "calls" | "drafts";

const FAV_KEY = "slipstream.home.favourites";
const OWNERS: { key: OwnerFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Maxim", label: "Me" },
  { key: "Sam", label: "Sam" },
  { key: "Jordan", label: "Jordan" },
];
const TYPES: { key: TypeFilter; label: string; match: HomeItemType[] }[] = [
  { key: "all", label: "All types", match: ["list", "calls", "call", "drafts"] },
  { key: "list", label: "Lists", match: ["list"] },
  { key: "calls", label: "Calls", match: ["calls", "call"] },
  { key: "drafts", label: "Drafts", match: ["drafts"] },
];

export function RecentSection({ onAddCall, loading = false }: { onAddCall: () => void; loading?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<HomeItem[]>(homeItems);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState<OwnerFilter>("all");
  const [showTypes, setShowTypes] = useState(false);
  const [type, setType] = useState<TypeFilter>("all");
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [deleted, setDeleted] = useState<{ item: HomeItem; index: number } | null>(null);

  useEffect(() => {
    try { const raw = localStorage.getItem(FAV_KEY); if (raw) setFavourites(new Set(JSON.parse(raw) as string[])); } catch {}
  }, []);
  const toggleFavourite = (id: string) => {
    setFavourites((s) => {
      const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...n])); } catch {}
      return n;
    });
  };

  const rename = (id: string, name: string) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, name } : i)));
  const duplicate = (id: string) => setItems((cur) => {
    const i = cur.findIndex((x) => x.id === id);
    if (i < 0) return cur;
    const src = cur[i];
    const copy: HomeItem = { ...src, id: `${src.id}-copy-${Date.now().toString(36)}`, name: `${src.name} (copy)`, createdMinutesAgo: 0, lastOpenedMinutesAgo: null, owner: "Maxim" };
    return [...cur.slice(0, i + 1), copy, ...cur.slice(i + 1)];
  });
  const remove = (id: string) => setItems((cur) => {
    const index = cur.findIndex((x) => x.id === id);
    if (index < 0) return cur;
    setDeleted({ item: cur[index], index });
    return cur.filter((x) => x.id !== id);
  });
  useEffect(() => {
    if (!deleted) return;
    const t = window.setTimeout(() => setDeleted(null), 5000);
    return () => window.clearTimeout(t);
  }, [deleted]);
  const undo = () => {
    if (!deleted) return;
    setItems((cur) => [...cur.slice(0, deleted.index), deleted.item, ...cur.slice(deleted.index)]);
    setDeleted(null);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const types = TYPES.find((t) => t.key === type)?.match ?? [];
    let rows = items.filter((i) => types.includes(i.type) && (owner === "all" || i.owner === owner) && (!q || `${i.name} ${i.tags.join(" ")}`.toLowerCase().includes(q)));
    if (tab === "favourites") rows = rows.filter((i) => favourites.has(i.id));
    if (tab === "recents") rows = rows.filter((i) => i.lastOpenedMinutesAgo != null).sort((a, b) => (a.lastOpenedMinutesAgo ?? 0) - (b.lastOpenedMinutesAgo ?? 0));
    return rows;
  }, [items, tab, query, owner, type, favourites]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "recents", label: "Recents" },
    { key: "favourites", label: "Favourites" },
  ];

  const emptyLabel = items.length === 0
    ? "Nothing here yet. Add a call or find leads to get started."
    : tab === "favourites" ? "No favourites yet. Star anything to keep it here."
    : tab === "recents" ? "Nothing opened recently."
    : "Nothing matches.";

  return (
    <section className="mt-14 flex flex-col">
      <div className="flex items-center justify-between px-9">
        <div className="flex items-center gap-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-icon-well text-foreground"><Clock className="size-5" strokeWidth={1.75} /></span>
          <h2 className="text-[22px] font-bold tracking-tight text-foreground">Recent</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="flex h-9 w-[240px] items-center gap-2 rounded-lg border border-border bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-primary">
            <Search className="size-4" strokeWidth={1.75} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search recent" className="w-full bg-transparent text-sm text-foreground outline-none" />
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none" />}>
              <Plus className="size-4" strokeWidth={2.25} /> New
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/leads")}>New lead search</DropdownMenuItem>
              <DropdownMenuItem onClick={onAddCall}>New call</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/campaigns")}>New campaign</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-8 px-9 pb-4">
        <div className="inline-flex h-9 items-center rounded-lg border border-border bg-muted/70 p-0.5">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn("flex h-full items-center rounded-[5px] px-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground", tab === t.key && "border border-border bg-card font-medium text-foreground shadow-xs")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="flex h-14 items-center gap-2 px-9">
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" className="flex h-8 items-center rounded-md border border-border text-sm text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" />}>
              <span className="border-r border-border px-2.5 font-medium">Owner</span>
              <span className="flex items-center gap-1 px-2.5">{OWNERS.find((o) => o.key === owner)?.label}<ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={2} /></span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {OWNERS.map((o) => <DropdownMenuItem key={o.key} onClick={() => setOwner(o.key)} className={cn(owner === o.key && "font-medium")}>{o.label}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" onClick={() => setShowTypes((v) => !v)} aria-pressed={showTypes} className={cn("flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", showTypes && "bg-muted")}>
            <ListFilter className="size-4 text-muted-foreground" strokeWidth={1.75} /> Filters
          </button>
          {showTypes && (
            <div className="ml-2 flex items-center gap-1.5" role="radiogroup" aria-label="Type">
              {TYPES.map((t) => (
                <button key={t.key} type="button" role="radio" aria-checked={type === t.key} onClick={() => setType(t.key)} className={cn("h-7 rounded-md border px-2.5 text-[13px] transition-colors", type === t.key ? "border-primary/40 bg-primary-soft text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted")}>{t.label}</button>
              ))}
            </div>
          )}
          {deleted && (
            <span className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              Deleted “{deleted.item.name}”. <button type="button" onClick={undo} className="font-medium text-primary hover:underline">Undo</button>
            </span>
          )}
        </div>

        <RecentTable
          rows={visible}
          loading={loading}
          favourites={favourites}
          emptyLabel={emptyLabel}
          onToggleFavourite={toggleFavourite}
          onRename={rename}
          onDuplicate={duplicate}
          onDelete={remove}
        />
      </div>
    </section>
  );
}
