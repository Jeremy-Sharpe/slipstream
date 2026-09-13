"use client";

import "@glideapps/glide-data-grid/dist/index.css";
import {
  CompactSelection,
  DataEditor,
  GridCellKind,
  GridColumnIcon,
  type CustomCell,
  type CustomRenderer,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Item,
  type Theme,
} from "@glideapps/glide-data-grid";
import { ChevronDown, Play, Plus, Square, SquareCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ColumnKind, ListColumn, ListRow } from "@/lib/types/lists";
import { C, GRID_THEME } from "./gridTheme";

// Clay's table metrics at 1×: 46px header, 33px status row, 46px rows, a
// 130px number/checkbox column, 264px data columns, 196px add-column cell.
export const HEADER_H = 46;
export const STATUS_H = 33;
export const ROW_H = 46;
const INDEX_W = 130;
const INDEX_PAD = 30;
const ADD_COL_W = 196;

const COLUMN_WIDTH: Record<ColumnKind, number> = { text: 264, enrichment: 264, link: 264, number: 140 };

// Plain glyphs like Clay's column-type icons: T, #, chain link, building.
const HEADER_ICONS = {
  text: (p: { fgColor: string }) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><g fill="none" stroke="${p.fgColor}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6V4.5h11V6"/><path d="M10 4.5v11"/><path d="M8 15.5h4"/></g></svg>`,
  number: (p: { fgColor: string }) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><g fill="none" stroke="${p.fgColor}" stroke-width="1.7" stroke-linecap="round"><path d="M8 3.5 6 16.5M14 3.5l-2 13M4 8h13M3 12h13"/></g></svg>`,
  link: (p: { fgColor: string }) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><g fill="none" stroke="${p.fgColor}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1"/><path d="M11.5 8.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1"/></g></svg>`,
  enrich: (p: { fgColor: string }) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><g fill="none" stroke="${p.fgColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v11"/><path d="M3 16h14"/><path d="M8 7.5h1.5M10.5 7.5H12M8 10h1.5M10.5 10H12M8 12.5h1.5M10.5 12.5H12"/></g></svg>`,
};

const ICON: Record<ColumnKind, GridColumnIcon | string> = {
  text: "text",
  number: "number",
  link: "link",
  enrichment: "enrich",
};

type IndexCell = CustomCell<{ kind: "index"; label: string }>;
type TickCell = CustomCell<{ kind: "tick"; label: string }>;
type EnrichCell = CustomCell<{ kind: "enrich"; value: string }>;

function tick(ctx: CanvasRenderingContext2D, x: number, cy: number, color: string) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + 3.5, cy + 3.5); ctx.lineTo(x + 10, cy - 3.5); ctx.stroke();
}

const indexRenderer: CustomRenderer<IndexCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is IndexCell => (c.data as { kind?: string }).kind === "index",
  draw: ({ ctx, rect, theme }, cell) => {
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = `16px ${theme.fontFamily}`; ctx.fillStyle = C.muted;
    ctx.fillText(cell.data.label, rect.x + INDEX_PAD, rect.y + rect.height / 2 + 0.5);
    return true;
  },
};

const tickRenderer: CustomRenderer<TickCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is TickCell => (c.data as { kind?: string }).kind === "tick",
  draw: ({ ctx, rect, theme }, cell) => {
    const x = rect.x + theme.cellHorizontalPadding;
    const cy = rect.y + rect.height / 2;
    tick(ctx, x, cy, C.ink);
    if (cell.data.label) {
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.font = `16px ${theme.fontFamily}`; ctx.fillStyle = C.muted;
      ctx.fillText(cell.data.label, x + 20, cy + 0.5);
    }
    return true;
  },
};

const enrichRenderer: CustomRenderer<EnrichCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is EnrichCell => (c.data as { kind?: string }).kind === "enrich",
  draw: ({ ctx, rect, theme }, cell) => {
    const x = rect.x + theme.cellHorizontalPadding;
    const cy = rect.y + rect.height / 2;
    tick(ctx, x, cy, C.muted);
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = `16px ${theme.fontFamily}`; ctx.fillStyle = C.ink;
    const max = rect.width - theme.cellHorizontalPadding * 2 - 22;
    let text = cell.data.value;
    while (text.length > 1 && ctx.measureText(text).width > max) text = `${text.slice(0, -2).trimEnd()}…`;
    ctx.fillText(text, x + 22, cy + 0.5);
    return true;
  },
};

const RENDERERS = [indexRenderer, tickRenderer, enrichRenderer] as unknown as CustomRenderer<CustomCell>[];

function useFontFamily() {
  const [family, setFamily] = useState("Inter, system-ui, sans-serif");
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim();
    if (v) setFamily(`${v}, system-ui, sans-serif`);
    document.fonts?.ready.then(() => setFamily((f) => `${f} `));
  }, []);
  return family;
}

export type AddColumnKind = ColumnKind | "claude";

export function ListGrid({
  columns,
  rows,
  hidden,
  completed,
  onSelectionCount,
  onRun,
  onAddColumn,
  running,
}: {
  columns: ListColumn[];
  rows: ListRow[];
  hidden: Set<string>;
  /** 0–100, drives the status row under the header. */
  completed: number;
  onSelectionCount?: (n: number) => void;
  onRun: (columnId: string) => void;
  onAddColumn: (kind: AddColumnKind) => void;
  running?: string | null;
}) {
  const fontFamily = useFontFamily();
  const theme = useMemo<Partial<Theme>>(() => ({ ...GRID_THEME, fontFamily }), [fontFamily]);
  const visible = useMemo(() => columns.filter((c) => !hidden.has(c.id)), [columns, hidden]);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [selection, setSelection] = useState<GridSelection>({ columns: CompactSelection.empty(), rows: CompactSelection.empty() });
  const [hoverRow, setHoverRow] = useState<number>();
  const [tx, setTx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // The grid is sized to its columns and rows like Clay's, capped by the
  // space available; it scrolls inside when the cap applies.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { onSelectionCount?.(selection.rows.length); }, [selection, onSelectionCount]);

  const gridColumns = useMemo<(GridColumn & { width: number })[]>(() => [
    { id: "__index", title: "", width: INDEX_W },
    ...visible.map((c) => ({ id: c.id, title: c.title, icon: ICON[c.kind], width: widths[c.id] ?? COLUMN_WIDTH[c.kind] })),
    { id: "__add", title: "", width: ADD_COL_W, themeOverride: { bgHeader: C.surface } },
  ], [visible, widths]);

  // Row 0 is the status row (Clay's "% · ✓ 100%"); data rows follow.
  const getCellContent = useCallback(([col, row]: Item): GridCell => {
    const gc = gridColumns[col];
    const empty: GridCell = { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false };
    if (!gc) return empty;
    if (gc.id === "__index") {
      return { kind: GridCellKind.Custom, data: { kind: "index", label: row === 0 ? "%" : String(row) }, copyData: String(row), allowOverlay: false } satisfies IndexCell;
    }
    if (gc.id === "__add") return empty;
    const column = visible.find((c) => c.id === gc.id);
    if (!column) return empty;
    if (row === 0) {
      if (column.kind === "enrichment") return { kind: GridCellKind.Custom, data: { kind: "tick", label: `${completed}%` }, copyData: `${completed}%`, allowOverlay: false } satisfies TickCell;
      if (column.kind === "link") return { kind: GridCellKind.Custom, data: { kind: "tick", label: "" }, copyData: "", allowOverlay: false } satisfies TickCell;
      return { ...empty, themeOverride: { bgCell: C.mist } };
    }
    const r = rows[row - 1];
    const v = r?.[column.id];
    if (v == null || v === "") return { ...empty, themeOverride: { textDark: C.muted } };
    switch (column.kind) {
      case "link":
        return { kind: GridCellKind.Uri, data: String(v), displayData: String(v).replace(/^https?:\/\//, ""), allowOverlay: false, hoverEffect: true, themeOverride: { textDark: C.ink } };
      case "number":
        return { kind: GridCellKind.Number, data: Number(v), displayData: typeof v === "number" ? v.toLocaleString("en-AU") : String(v), allowOverlay: false, contentAlign: "right" };
      case "enrichment":
        return { kind: GridCellKind.Custom, data: { kind: "enrich", value: String(v) }, copyData: String(v), allowOverlay: false } satisfies EnrichCell;
      default:
        return { kind: GridCellKind.Text, data: String(v), displayData: String(v), allowOverlay: false };
    }
  }, [gridColumns, visible, rows, completed]);

  const getRowThemeOverride = useCallback((row: number): Partial<Theme> | undefined => {
    if (row === 0) return { bgCell: C.mist, bgCellMedium: C.mist };
    if (selection.rows.hasIndex(row)) return { bgCell: C.hover };
    if (row === hoverRow) return { bgCell: C.mist };
    return undefined;
  }, [selection, hoverRow]);

  // Header overlays: a ▶ on each enrichment column and the "+ Add column" cell.
  const offsets = useMemo(() => {
    let x = 0;
    return gridColumns.map((c) => { const start = x; x += c.width; return { id: c.id, start, width: c.width }; });
  }, [gridColumns]);
  const addOffset = offsets.find((o) => o.id === "__add");
  const totalW = offsets.reduce((n, o) => n + o.width, 0) + 1;
  const totalH = HEADER_H + STATUS_H + rows.length * ROW_H + 1;
  const width = box.w ? Math.min(totalW, box.w) : totalW;
  const height = box.h ? Math.min(totalH, box.h) : totalH;

  const allSelected = rows.length > 0 && selection.rows.length === rows.length;
  const toggleAll = () => {
    const rowsSel = allSelected ? CompactSelection.empty() : CompactSelection.fromSingleSelection([1, rows.length + 1]);
    setSelection({ columns: CompactSelection.empty(), rows: rowsSel });
  };
  const toggleRow = (row: number) => {
    setSelection((sel) => ({ ...sel, rows: sel.rows.hasIndex(row) ? sel.rows.remove(row) : sel.rows.add(row) }));
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <div className="relative border border-line bg-card" style={{ width: width + 2, height: height + 2 }}>
      <DataEditor
        width={width} height={height}
        columns={gridColumns} rows={rows.length + 1} getCellContent={getCellContent}
        customRenderers={RENDERERS} headerIcons={HEADER_ICONS} theme={theme} getRowThemeOverride={getRowThemeOverride}
        rowHeight={(row) => (row === 0 ? STATUS_H : ROW_H)} headerHeight={HEADER_H}
        rowMarkers="none"
        gridSelection={selection} onGridSelectionChange={setSelection}
        rangeSelect="none" columnSelect="none" rowSelect="multi" rowSelectionMode="multi"
        verticalBorder smoothScrollX smoothScrollY drawFocusRing={false}
        getCellsForSelection keybindings={{ search: true, selectAll: true }}
        onColumnResize={(col, w) => { if (col.id && !col.id.startsWith("__")) setWidths((s) => ({ ...s, [col.id as string]: w })); }}
        onCellClicked={([col, row]) => { if (gridColumns[col]?.id === "__index" && row > 0) toggleRow(row); }}
        onItemHovered={(a) => setHoverRow(a.kind === "cell" ? a.location[1] : undefined)}
        onVisibleRegionChanged={(_r, x) => setTx(x)}
      />
      <button
        type="button"
        onClick={toggleAll}
        aria-pressed={allSelected}
        aria-label={allSelected ? "Clear selection" : "Select all rows"}
        className="absolute flex size-6 items-center justify-center rounded text-muted-foreground hover:text-ink focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        style={{ left: INDEX_PAD - 3 + tx, top: (HEADER_H - 24) / 2 }}
      >
        {allSelected ? <SquareCheck className="size-[18px] text-ink" strokeWidth={1.75} /> : <Square className="size-[18px]" strokeWidth={1.75} />}
      </button>
      {offsets.map((o) => {
        const column = visible.find((c) => c.id === o.id);
        if (!column || column.kind !== "enrichment") return null;
        const busy = running === column.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onRun(column.id)}
            disabled={busy}
            aria-label={`Run ${column.title}`}
            className="absolute flex size-8 items-center justify-center rounded-md border border-line bg-card text-ink hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-60"
            style={{ left: o.start + o.width - 42 + tx, top: (HEADER_H - 32) / 2 }}
          >
            {busy ? <span className="size-3.5 animate-spin rounded-full border-2 border-line border-t-ink" /> : <Play className="size-4" strokeWidth={1.75} />}
          </button>
        );
      })}
      {addOffset && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button type="button" className="absolute flex h-8 items-center gap-2 rounded-md px-2 text-[16px] font-medium whitespace-nowrap text-ink hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" style={{ left: addOffset.start + 6 + tx, top: (HEADER_H - 32) / 2 }} />}
          >
            <Plus className="size-[18px]" strokeWidth={2} /> Add column <ChevronDown className="size-4 text-ink" strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={() => onAddColumn("text")}>Text</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddColumn("number")}>Number</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddColumn("link")}>Link</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddColumn("enrichment")}>OpenRouter enrichment</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddColumn("claude")}>Claude draft</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      </div>
    </div>
  );
}
