"use client";

import {
  ArrowDownUp,
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronDown,
  Columns3,
  Filter,
  Folder,
  History,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  Settings,
  Share2,
  Square,
  SquareCheck,
  Table2,
  Building2,
  Download,
  PenLine,
  Target,
  Check,
  CircleStop,
  Headset,
  FlaskConical,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AddCallDialog } from "@/components/shell/AddCallDialog";
import { NotificationsMenu } from "@/components/shell/NotificationsMenu";
import { UserMenu } from "@/components/shell/UserMenu";
import { lists, runs } from "@/lib/data/lists";
import type { List, ListColumn, ListRow } from "@/lib/types/lists";
import { cn } from "@/lib/utils";
import type { AddColumnKind } from "./ListGrid";

// Glide draws on canvas and touches window at import time, so it is client-only.
const ListGrid = dynamic(() => import("./ListGrid").then((m) => m.ListGrid), {
  ssr: false,
  loading: () => (
    <div
      className="h-[600px] w-full border border-line bg-card"
      aria-busy="true"
    />
  ),
});

const TOOLS = [
  { id: "enrich", label: "Enrich with Origami", hint: "Size, industry and signals per row", icon: Building2 },
  { id: "draft", label: "Draft with Claude", hint: "First touch in the voice of the won calls", icon: PenLine },
  { id: "score", label: "Score against won deals", hint: "Similarity to the won-deal centroid", icon: Target },
  { id: "export", label: "Export CSV", hint: "Download the visible rows", icon: Download },
] as const;

type ToolId = (typeof TOOLS)[number]["id"];
type View = "table" | "overview";

const outline =
  "flex h-9 cursor-pointer items-center gap-2 rounded-md border border-line bg-card px-3 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-page active:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-default disabled:opacity-50 disabled:hover:bg-card";
const iconBtn =
  "flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-[15px] text-ink transition-colors duration-150 hover:bg-muted active:bg-line/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none";
const crumb =
  "flex h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 text-[17px] text-ink transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none";

const timeFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Melbourne",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

function csv(columns: ListColumn[], rows: ListRow[]) {
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  return [
    columns.map((c) => esc(c.title)).join(","),
    ...rows.map((r) => columns.map((c) => esc(r[c.id] ?? "")).join(",")),
  ].join("\n");
}

export function ListWorkbook({ list: initial }: { list: List }) {
  const router = useRouter();
  const [list, setList] = useState<List>(initial);
  const [view, setView] = useState<View>("table");
  const [views, setViews] = useState<string[]>([initial.name]);
  const [autoRun, setAutoRun] = useState(false);
  const [draftMode, setDraftMode] = useState(false);
  const [tools, setTools] = useState(false);
  const [selected, setSelected] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(
    null,
  );
  const [search, setSearch] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(100);
  const [addCount, setAddCount] = useState(10);

  const rows = useMemo(() => {
    const q = (search ?? filter).trim().toLowerCase();
    let out = list.rows.filter(
      (r) =>
        !q || Object.values(r).some((v) => String(v).toLowerCase().includes(q)),
    );
    if (sort) {
      const { id, dir } = sort;
      out = [...out].sort((a, b) => {
        const va = a[id] ?? "",
          vb = b[id] ?? "";
        const c =
          typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb));
        return dir === "asc" ? c : -c;
      });
    }
    return out;
  }, [list.rows, filter, search, sort]);

  const visibleColumns = list.columns.length - hidden.size;

  const simulate = (id: string, after?: () => void) => {
    if (running) return;
    setRunning(id);
    setCompleted(0);
    const started = Date.now();
    const tick = window.setInterval(
      () =>
        setCompleted(
          Math.min(99, Math.round(((Date.now() - started) / 1500) * 100)),
        ),
      100,
    );
    window.setTimeout(() => {
      window.clearInterval(tick);
      setCompleted(100);
      setRunning(null);
      setDone((s) => new Set(s).add(id));
      setList((l) => ({ ...l, lastRunAt: new Date().toISOString() }));
      after?.();
    }, 1500);
  };

  const runTool = (id: ToolId) => {
    if (id === "export") {
      const blob = new Blob(
        [
          csv(
            list.columns.filter((c) => !hidden.has(c.id)),
            rows,
          ),
        ],
        { type: "text/csv" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${list.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setDone((s) => new Set(s).add(id));
      return;
    }
    simulate(id);
  };

  const addColumn = (kind: AddColumnKind) => {
    const n = list.columns.length + 1;
    const title =
      kind === "claude"
        ? "Claude draft"
        : kind === "enrichment"
          ? "Origami enrichment"
          : `${kind[0].toUpperCase()}${kind.slice(1)} ${n}`;
    setList((l) => ({
      ...l,
      columns: [
        ...l.columns,
        {
          id: `col-${n}-${Date.now()}`,
          title,
          kind: kind === "claude" ? "text" : kind,
        },
      ],
    }));
  };

  const addRows = () =>
    setList((l) => ({
      ...l,
      rows: [
        ...l.rows,
        ...Array.from({ length: Math.max(1, addCount) }, () => ({})),
      ],
    }));
  const addView = () => setViews((v) => [...v, `View ${v.length + 1}`]);

  return (
    <div className="flex h-screen min-w-0 flex-col bg-background">
      {/* Top bar: breadcrumb on the left, the shell's actions on the right */}
      <header className="flex h-16 shrink-0 items-center gap-1.5 border-b border-line bg-card pr-4 pl-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button type="button" className={crumb} />}
          >
            <Folder
              className="size-[18px] text-ink"
              strokeWidth={1.5}
            />{" "}
            Home{" "}
            <ChevronDown
              className="size-4 text-ink"
              strokeWidth={2}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={() => router.push("/home")}>
              Home
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/")}>
              Conversations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/leads")}>
              Leads
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="px-1 text-[17px] text-muted-foreground">/</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button type="button" className={crumb} />}
          >
            <Rows3
              className="size-[18px] text-ink"
              strokeWidth={1.5}
            />{" "}
            {list.name}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Lists</DropdownMenuLabel>
              {lists.map((l) => (
                <DropdownMenuItem
                  key={l.id}
                  onClick={() => router.push(`/lists/${l.id}`)}
                >
                  {l.name}
                  {l.id === list.id && <Check className="ml-auto size-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="px-1 text-[17px] text-muted-foreground">/</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button type="button" className={cn(crumb, "font-semibold")} />}
          >
            <Table2
              className="size-[18px] text-ink"
              strokeWidth={1.5}
            />{" "}
            {view === "table" ? list.name : "Overview"}{" "}
            <ChevronDown
              className="size-4 text-ink"
              strokeWidth={2}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => setView("table")}>
              Table{view === "table" && <Check className="ml-auto size-3.5" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView("overview")}>
              Overview
              {view === "overview" && <Check className="ml-auto size-3.5" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto flex items-center">
          <AddCallDialog />
          <div className="ml-10 flex items-center gap-3">
            <NotificationsMenu />
            <span className="w-1" aria-hidden />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex h-[78px] shrink-0 items-center gap-2 px-4">
        <div className="flex h-9 items-center rounded-lg border border-line bg-card">
          <button
            type="button"
            aria-pressed={autoRun}
            onClick={() => setAutoRun((v) => !v)}
            className="flex h-full cursor-pointer items-center gap-2 rounded-l-[7px] px-3 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-page active:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:outline-none"
          >
            <RefreshCw
              className={cn(
                "size-4",
                autoRun ? "text-primary" : "text-muted-foreground",
              )}
              strokeWidth={1.75}
            />{" "}
            Auto-run
            {autoRun && <span className="size-1.5 rounded-full bg-primary" />}
          </button>
          <span className="h-full w-px bg-line" />
          <span className="flex h-full items-center gap-2 px-3 text-[15px] text-ink tabular-nums">
            {selected > 0 ? (
              <SquareCheck
                className="size-[18px] text-ink"
                strokeWidth={1.75}
              />
            ) : (
              <Square
                className="size-[18px] text-ink"
                strokeWidth={1.75}
              />
            )}{" "}
            {selected}
          </span>
        </div>
        <button
          type="button"
          className={cn(iconBtn, "size-9 justify-center px-0")}
          aria-label="Table view"
          onClick={() => setView("table")}
        >
          <Rows3 className="size-5" strokeWidth={1.75} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button type="button" className={iconBtn} />}
          >
            <Columns3 className="size-5" strokeWidth={1.75} />{" "}
            <span className="tabular-nums">
              {visibleColumns}/{list.columns.length}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Columns</DropdownMenuLabel>
              {list.columns.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={!hidden.has(c.id)}
                  onCheckedChange={(on) =>
                    setHidden((h) => {
                      const n = new Set(h);
                      if (on) n.delete(c.id);
                      else n.add(c.id);
                      return n;
                    })
                  }
                >
                  {c.title}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className={cn(iconBtn, "cursor-default hover:bg-transparent")}>
          <Table2 className="size-5" strokeWidth={1.75} />{" "}
          <span className="tabular-nums">
            {rows.length}/{list.rows.length}
          </span>
        </span>
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label="Filter rows"
                className={cn(
                  iconBtn,
                  "size-9 justify-center px-0",
                  filter && "bg-muted",
                )}
              />
            }
          >
            <Filter className="size-5" strokeWidth={1.75} />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            <label className="text-xs font-medium text-muted-foreground">
              Rows containing
            </label>
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="e.g. Practice Manager"
              className="mt-1.5 h-9 w-full rounded-md border border-line px-2.5 text-sm outline-none transition-[box-shadow,border-color] duration-150 focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            {filter && (
              <button
                type="button"
                onClick={() => setFilter("")}
                className="mt-2 cursor-pointer text-xs text-muted-foreground transition-colors duration-150 hover:text-ink"
              >
                Clear
              </button>
            )}
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Sort rows"
                className={cn(
                  iconBtn,
                  "size-9 justify-center px-0",
                  sort && "bg-muted",
                )}
              />
            }
          >
            <ArrowDownUp className="size-5" strokeWidth={1.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {list.columns.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() =>
                    setSort((s) =>
                      s?.id === c.id
                        ? { id: c.id, dir: s.dir === "asc" ? "desc" : "asc" }
                        : { id: c.id, dir: "asc" },
                    )
                  }
                >
                  {c.title}
                  {sort?.id === c.id && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {sort.dir}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              {sort && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSort(null)}>
                    Clear sort
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {search === null ? (
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearch("")}
            className={cn(iconBtn, "size-9 justify-center px-0")}
          >
            <Search className="size-5" strokeWidth={1.75} />
          </button>
        ) : (
          <label className="flex h-9 items-center gap-2 rounded-md border border-line px-3 text-[15px] transition-[box-shadow,border-color] duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
            <Search
              className="size-4 text-muted-foreground"
              strokeWidth={1.75}
            />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => {
                if (!search) setSearch(null);
              }}
              placeholder="Search rows"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-pressed={draftMode}
            onClick={() => setDraftMode((v) => !v)}
            className={cn(
              outline,
              draftMode && "border-primary/40 bg-primary-soft",
            )}
          >
            <FlaskConical
              className={cn(
                "size-[18px]",
                draftMode ? "text-primary" : "text-muted-foreground",
              )}
              strokeWidth={1.75}
            />{" "}
            Draft mode
          </button>
          <Link href="/campaigns" className={outline}>
            <Headset
              className="size-[18px] text-muted-foreground"
              strokeWidth={1.75}
            />{" "}
            Coach
          </Link>
          <button
            type="button"
            aria-pressed={tools}
            onClick={() => setTools((v) => !v)}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-3.5 text-[15px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Tools{" "}
            {tools ? (
              <ArrowRightToLine className="size-[18px]" strokeWidth={2} />
            ) : (
              <ArrowLeftToLine className="size-[18px]" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col pb-4 pl-[2px]">
          {view === "table" ? (
            <>
              <div
                className={cn(
                  "mt-[26px] min-h-0 shrink overflow-hidden transition-opacity duration-150",
                  draftMode && "opacity-80",
                )}
              >
                <ListGrid
                  columns={list.columns}
                  rows={rows}
                  hidden={hidden}
                  completed={completed}
                  onSelectionCount={setSelected}
                  onRun={(id) => simulate(`col:${id}`)}
                  onAddColumn={addColumn}
                  running={
                    running?.startsWith("col:") ? running.slice(4) : null
                  }
                />
              </div>
              <div className="mt-3 flex shrink-0 items-center gap-3 pl-4 text-[15px] text-muted-foreground">
                <button type="button" onClick={addRows} className={outline}>
                  <Plus className="size-4" strokeWidth={2} /> Add
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={addCount}
                  onChange={(e) => setAddCount(Number(e.target.value) || 1)}
                  className="h-9 w-[90px] rounded-md border border-line px-3 text-[15px] text-ink tabular-nums outline-none transition-[box-shadow,border-color] duration-150 [appearance:textfield] focus:border-primary focus:ring-2 focus:ring-primary/30 [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Rows to add"
                />
                more rows at the bottom
              </div>
            </>
          ) : (
            <div className="mt-[26px] grid max-w-3xl grid-cols-3 gap-3 pl-[2px]">
              {[
                { label: "Rows", value: list.rows.length },
                { label: "Columns", value: list.columns.length },
                {
                  label: "Last run",
                  value: timeFmt.format(new Date(list.lastRunAt)),
                },
              ].map((t) => (
                <div
                  key={t.label}
                  className="rounded-lg border border-line bg-card px-4 py-3"
                >
                  <p className="text-[13px] text-muted-foreground">
                    {t.label}
                  </p>
                  <p className="mt-0.5 text-[17px] font-semibold text-ink tabular-nums">
                    {t.value}
                  </p>
                </div>
              ))}
              <div className="col-span-3 rounded-lg border border-line bg-card p-4 text-sm text-muted-foreground">
                {list.name} holds {list.rows.length} rows across{" "}
                {list.columns.length} columns. Run a tool from the Tools drawer
                to enrich, score or draft against every row.
              </div>
            </div>
          )}
        </div>

        <div
          className={cn(
            "shrink-0 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none",
            tools ? "w-80" : "w-0",
          )}
          aria-hidden={!tools}
          inert={!tools}
        >
          <aside className="flex h-full w-80 flex-col border-l border-line bg-card">
            <header className="flex h-12 items-center justify-between border-b border-line px-4 text-[15px] font-semibold text-ink">
              Tools
              <button
                type="button"
                aria-label="Close tools"
                onClick={() => setTools(false)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <ArrowRightToLine className="size-4" strokeWidth={1.75} />
              </button>
            </header>
            <ul className="flex flex-col gap-1 p-2">
              {TOOLS.map((t) => {
                const busy = running === t.id;
                const ok = done.has(t.id);
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors duration-150 hover:bg-page"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line text-ink">
                      <t.icon className="size-4" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{t.label}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ok && !busy ? "Done" : t.hint}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => runTool(t.id)}
                      disabled={!!running}
                      aria-label={`Run ${t.label}`}
                      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line text-ink transition-colors duration-150 hover:bg-page active:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-default disabled:opacity-50"
                    >
                      {busy ? (
                        <span className="size-3.5 animate-spin rounded-full border-2 border-line border-t-ink" />
                      ) : ok ? (
                        <Check className="size-4" strokeWidth={2} />
                      ) : (
                        <Play className="size-3.5" strokeWidth={2} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </div>

      {/* Bottom tab strip */}
      <div className="flex h-[72px] shrink-0 items-stretch border-t border-line bg-card">
        <button
          type="button"
          onClick={() => setView("overview")}
          className={cn(
            "flex cursor-pointer items-center gap-2.5 px-3 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-page focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:outline-none",
            view === "overview" &&
              "border-r border-line text-primary shadow-[inset_0_2px_0_0_var(--primary)]",
          )}
        >
          <Share2 className="size-5 text-ink" strokeWidth={1.75} />{" "}
          Overview
        </button>
        {views.map((v, i) => (
          <DropdownMenu key={v}>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  onClick={() => setView("table")}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 px-3 text-[15px] font-medium transition-colors duration-150 hover:bg-page focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:outline-none",
                    view === "table" && i === 0
                      ? "border-x border-line font-semibold text-primary shadow-[inset_0_2px_0_0_var(--primary)]"
                      : "text-ink",
                  )}
                />
              }
            >
              <Table2 className="size-5" strokeWidth={1.75} /> {v}{" "}
              <ChevronDown
                className="size-4"
                strokeWidth={2}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={() => setView("table")}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setViews((all) => [...all, `${v} copy`])}
              >
                Duplicate
              </DropdownMenuItem>
              {i > 0 && (
                <DropdownMenuItem
                  onClick={() => setViews((all) => all.filter((x) => x !== v))}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
        <div className="flex items-center pl-3">
          <button
            type="button"
            onClick={addView}
            className={outline}
          >
            <Plus className="size-4" strokeWidth={2} /> Add
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3 border-l border-line px-4">
          <div className="mr-2 flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-[120px] overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-ink transition-[width] duration-300 ease-out"
                  style={{ width: `${completed}%` }}
                />
              </span>
              {completed === 100 && (
                <Check className="size-4 text-ink" strokeWidth={2} />
              )}
            </div>
            <span className="text-[15px] text-muted-foreground tabular-nums">
              {completed}% of table completed
            </span>
          </div>
          <button
            type="button"
            disabled={!running}
            onClick={() => setRunning(null)}
            className={cn(outline, "text-muted-foreground")}
          >
            <CircleStop
              className="size-[18px]"
              strokeWidth={1.75}
            />{" "}
            Stop
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<button type="button" className={outline} />}
            >
              <History
                className="size-[18px] text-ink"
                strokeWidth={1.75}
              />{" "}
              History
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Past runs</DropdownMenuLabel>
                {runs.map((r) => (
                  <DropdownMenuItem
                    key={r.id}
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="text-sm text-ink">{r.tool}</span>
                    <span className="text-xs text-muted-foreground">
                      {timeFmt.format(new Date(r.at))} · {r.rows} rows
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            href="/settings"
            aria-label="List settings"
            className="flex size-9 items-center justify-center rounded-md border border-line text-ink transition-colors duration-150 hover:bg-page active:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Settings className="size-[18px]" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Re-exported so the grid's ▶ can share the play glyph without a second import.
function Play(props: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={props.strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}
