"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DataEditor,
  GridCellKind,
  type CustomCell,
  type CustomRenderer,
  type GridCell,
  type GridColumn,
  type Item,
  type Theme,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import type { Lead } from "@/lib/types";

/* The sheet. Glide Data Grid themed to the app tokens; canvas renderers for
   the row number, the two-line contact, the score bar, the status pill, the
   draft check. Fixed widths (1016px, so everything fits at 1440 without a
   horizontal scroll), no user resizing or reordering, everything scrolls
   together, and the grid ends at the last row. */

import type { Row, Sort } from "./columns";
export type { Row, Sort };

const INK = "#181925", SOFT = "#737373", FAINT = "#a3a3a3", LINE = "#e8e8e8", GREEN = "#16a34a";
export const ROW_H = 52, HEADER_H = 40;

const THEME: Partial<Theme> = {
  accentColor: "#ff6847",
  accentFg: "#ffffff",
  accentLight: "#fff1ec",
  textDark: INK,
  textMedium: "#666666",
  textLight: FAINT,
  textBubble: INK,
  bgIconHeader: FAINT,
  fgIconHeader: "#ffffff",
  textHeader: SOFT,
  textHeaderSelected: INK,
  bgCell: "#ffffff",
  bgCellMedium: "#f6f6f7",
  bgHeader: "#fafafa",
  bgHeaderHasFocus: "#fafafa",
  bgHeaderHovered: "#fafafa",
  bgBubble: "#f5f5f5",
  bgBubbleSelected: "#ffffff",
  bgSearchResult: "#fff1ec",
  borderColor: LINE,
  horizontalBorderColor: LINE,
  headerBottomBorderColor: LINE,
  drilldownBorder: "transparent",
  linkColor: "#ff6847",
  cellHorizontalPadding: 14,
  cellVerticalPadding: 3,
  headerFontStyle: "500 13px",
  baseFontStyle: "14px",
  markerFontStyle: "13px",
  fontFamily: '"Open Runde", Inter, system-ui, sans-serif',
  editorFontSize: "14px",
  lineHeight: 1.4,
  headerIconSize: 14,
  roundingRadius: 6,
};

// Lucide outlines, 14px at 1.5 stroke, for the header glyphs and the link cell.
const PATHS: Record<string, string> = {
  company: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  contact: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  similarity: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
  status: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
  trigger: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  location: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  draft: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
};
const svg = (body: string, stroke = FAINT) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const HEADER_ICONS = Object.fromEntries(Object.entries(PATHS).map(([k, v]) => [k, () => svg(v)]));

const COLUMNS: (GridColumn & { id: string; width: number })[] = [
  { id: "n", title: "", width: 44, icon: "similarity" },
  { id: "company", title: "Company", width: 280, icon: "company" },
  { id: "contact", title: "Contact", width: 180, icon: "contact" },
  { id: "similarity", title: "Similarity", width: 112, icon: "similarity" },
  { id: "status", title: "Status", width: 96, icon: "status" },
  { id: "trigger", title: "Trigger", width: 200, icon: "trigger" },
  { id: "location", title: "Location", width: 128, icon: "location" },
  { id: "draft", title: "Draft", width: 88, icon: "draft" },
];

type TextCell = CustomCell<{ kind: "text"; text: string; weight?: number }>;
type IndexCell = CustomCell<{ kind: "index"; n: number }>;
type CompanyCell = CustomCell<{ kind: "company"; name: string; fictional: boolean }>;
type ContactCell = CustomCell<{ kind: "contact"; name: string; title: string }>;
type ScoreCell = CustomCell<{ kind: "score"; value: number }>;
type PillCell = CustomCell<{ kind: "pill"; label: string; tone: "grey" | "green" }>;
type DraftCell = CustomCell<{ kind: "draft"; drafted: boolean }>;

const is = <T extends CustomCell>(kind: string) => (c: CustomCell): c is T => (c.data as { kind?: string }).kind === kind;

/** Ellipsis-truncate text to a width (Glide's text cells do this; custom cells must). */
function fitText(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + "…").width <= max) lo = mid; else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + "…";
}

const textRenderer: CustomRenderer<TextCell> = {
  kind: GridCellKind.Custom,
  isMatch: is<TextCell>("text"),
  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    ctx.textBaseline = "middle";
    ctx.font = `${cell.data.weight ?? 400} 14px ${theme.fontFamily}`; ctx.fillStyle = INK;
    ctx.fillText(fitText(ctx, cell.data.text, rect.width - theme.cellHorizontalPadding * 2), rect.x + theme.cellHorizontalPadding, rect.y + rect.height / 2);
    return true;
  },
};

const indexRenderer: CustomRenderer<IndexCell> = {
  kind: GridCellKind.Custom,
  isMatch: is<IndexCell>("index"),
  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    ctx.textBaseline = "middle"; ctx.textAlign = "center";
    ctx.font = `13px ${theme.fontFamily}`; ctx.fillStyle = FAINT;
    ctx.fillText(String(cell.data.n), rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.textAlign = "start";
    return true;
  },
};

/* Generated prospects are invented, so the company name carries a muted chip
   (the grey Pill from ui.tsx, drawn on canvas). */
const FICTIONAL = "Fictional";

const companyRenderer: CustomRenderer<CompanyCell> = {
  kind: GridCellKind.Custom,
  isMatch: is<CompanyCell>("company"),
  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const x = rect.x + theme.cellHorizontalPadding, cy = rect.y + rect.height / 2;
    let max = rect.width - theme.cellHorizontalPadding * 2, chipW = 0;
    if (cell.data.fictional) {
      ctx.font = `500 11px ${theme.fontFamily}`;
      chipW = ctx.measureText(FICTIONAL).width + 14;
      max -= chipW + 8;
    }
    ctx.textBaseline = "middle";
    ctx.font = `500 14px ${theme.fontFamily}`; ctx.fillStyle = INK;
    const name = fitText(ctx, cell.data.name, Math.max(24, max));
    ctx.fillText(name, x, cy);
    if (!cell.data.fictional) return true;
    const cx = x + ctx.measureText(name).width + 8, h = 18;
    ctx.beginPath(); ctx.roundRect(cx, cy - h / 2, chipW, h, 9); ctx.fillStyle = "#f5f5f5"; ctx.fill();
    ctx.font = `500 11px ${theme.fontFamily}`; ctx.fillStyle = SOFT;
    ctx.fillText(FICTIONAL, cx + 7, cy + 0.5);
    return true;
  },
};

const contactRenderer: CustomRenderer<ContactCell> = {
  kind: GridCellKind.Custom,
  isMatch: is<ContactCell>("contact"),
  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const x = rect.x + theme.cellHorizontalPadding, cy = rect.y + rect.height / 2, max = rect.width - theme.cellHorizontalPadding * 2;
    ctx.textBaseline = "middle";
    ctx.font = `14px ${theme.fontFamily}`; ctx.fillStyle = INK;
    ctx.fillText(fitText(ctx, cell.data.name, max), x, cy - 9);
    ctx.font = `12.5px ${theme.fontFamily}`; ctx.fillStyle = SOFT;
    ctx.fillText(fitText(ctx, cell.data.title, max), x, cy + 9);
    return true;
  },
};

const scoreRenderer: CustomRenderer<ScoreCell> = {
  kind: GridCellKind.Custom,
  isMatch: is<ScoreCell>("score"),
  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const x = rect.x + theme.cellHorizontalPadding, cy = rect.y + rect.height / 2;
    const v = cell.data.value;
    const bw = 44, bh = 4, by = cy - bh / 2;
    ctx.beginPath(); ctx.roundRect(x, by, bw, bh, 2); ctx.fillStyle = LINE; ctx.fill();
    ctx.beginPath(); ctx.roundRect(x, by, Math.max(bh, bw * (v / 100)), bh, 2); ctx.fillStyle = INK; ctx.fill();
    ctx.textBaseline = "middle";
    ctx.font = `500 14px ${theme.fontFamily}`; ctx.fillStyle = v >= 80 ? GREEN : INK;
    ctx.fillText(String(v), x + bw + 8, cy);
    return true;
  },
};

const pillRenderer: CustomRenderer<PillCell> = {
  kind: GridCellKind.Custom,
  isMatch: is<PillCell>("pill"),
  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const green = cell.data.tone === "green";
    ctx.font = `500 12px ${theme.fontFamily}`;
    const w = ctx.measureText(cell.data.label).width + 20, h = 24;
    const x = rect.x + theme.cellHorizontalPadding, y = rect.y + (rect.height - h) / 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fillStyle = green ? "#dcfce7" : "#f5f5f5"; ctx.fill();
    ctx.fillStyle = green ? GREEN : SOFT; ctx.textBaseline = "middle";
    ctx.fillText(cell.data.label, x + 10, y + h / 2 + 0.5);
    return true;
  },
};

const draftRenderer: CustomRenderer<DraftCell> = {
  kind: GridCellKind.Custom,
  isMatch: is<DraftCell>("draft"),
  draw: (args, cell) => {
    const { ctx, rect } = args;
    const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 1.75;
    ctx.beginPath();
    if (cell.data.drafted) {
      ctx.strokeStyle = INK;
      ctx.moveTo(cx - 5, cy); ctx.lineTo(cx - 1.5, cy + 3.5); ctx.lineTo(cx + 5, cy - 4);
    } else {
      ctx.strokeStyle = FAINT;
      ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy);
    }
    ctx.stroke();
    return true;
  },
};

const HIGHLIGHT_MS = 1500;

export default function LeadsGridInner({ rows, sort, onSort, onOpen, showSearch, onSearchClose, selectedId }: {
  rows: Row[];
  /** The lead open in the panel; its row reads selected. */
  selectedId: string | null;
  sort: Sort;
  onSort: (s: Sort) => void;
  onOpen: (lead: Lead) => void;
  showSearch: boolean;
  onSearchClose: () => void;
}) {
  const columns = useMemo(() => COLUMNS.map<GridColumn>((c) => ({ ...c })), []);

  // Sort indicator after the header label: 12px, faint, no icon swap.
  const drawHeader = useCallback((args: { ctx: CanvasRenderingContext2D; columnIndex: number; rect: { x: number; y: number; width: number; height: number }; theme: Theme; column: GridColumn }, drawContent: () => void) => {
    drawContent();
    if (!sort || sort.col !== args.columnIndex) return;
    const { ctx, rect, theme, column } = args;
    ctx.font = `${theme.headerFontStyle} ${theme.fontFamily}`;
    const label = ctx.measureText(column.title).width;
    const x = rect.x + theme.cellHorizontalPadding + (column.icon ? theme.headerIconSize + 8 : 0) + label + 6;
    ctx.font = `12px ${theme.fontFamily}`; ctx.fillStyle = FAINT; ctx.textBaseline = "middle";
    ctx.fillText(sort.dir === "asc" ? "↑" : "↓", x, rect.y + rect.height / 2);
  }, [sort]);

  // Hover and selection tints, and the edge fades that track the scroller.
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [fades, setFades] = useState({ left: false, right: false, bottom: false });

  // The grid is exactly as tall as its rows (capped by the pane), so nothing
  // is ruled below the last row.
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [paneHeight, setPaneHeight] = useState(0);
  useEffect(() => {
    if (!host) return;
    const ro = new ResizeObserver(() => setPaneHeight(host.clientHeight));
    ro.observe(host);
    return () => ro.disconnect();
  }, [host]);
  const gridHeight = Math.min(paneHeight || Infinity, HEADER_H + rows.length * ROW_H + 2);

  // Re-render every 60ms while any row is still highlighted so the tint fades.
  const [, setTick] = useState(0);
  const latest = Math.max(0, ...rows.map((r) => r.landedAt ?? 0));
  useEffect(() => {
    if (!latest || Date.now() - latest > HIGHLIGHT_MS) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 60);
    const stop = window.setTimeout(() => window.clearInterval(t), HIGHLIGHT_MS + 100);
    return () => { window.clearInterval(t); window.clearTimeout(stop); };
  }, [latest]);

  const getRowThemeOverride = useCallback((row: number) => {
    const r = rows[row];
    if (!r) return undefined;
    const age = r.landedAt ? Date.now() - r.landedAt : Infinity;
    if (age <= HIGHLIGHT_MS) return { bgCell: `rgba(255, 104, 71, ${(0.14 * (1 - age / HIGHLIGHT_MS)).toFixed(3)})` };
    if (r.id === selectedId) return { bgCell: "#f6f6f7" };
    if (row === hoverRow) return { bgCell: "#fafafa" };
    return undefined;
  }, [rows, selectedId, hoverRow]);

  // Watch the scroller for the fades (it mounts after the dynamic import).
  useEffect(() => {
    if (!host) return;
    const scroller = host.querySelector<HTMLElement>(".dvn-scroller");
    if (!scroller) return;
    const update = () => setFades({
      left: scroller.scrollLeft > 1,
      right: scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1,
      bottom: scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1,
    });
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(scroller);
    return () => { scroller.removeEventListener("scroll", update); ro.disconnect(); };
  }, [host, rows.length, paneHeight]);

  const getCell = useCallback(([col, row]: Item): GridCell => {
    const r = rows[row];
    const text = (d: string, opts?: Partial<GridCell>) => ({ kind: GridCellKind.Text, data: d, displayData: d, allowOverlay: false, ...opts }) as GridCell;
    if (!r) return text("");
    switch (COLUMNS[col].id) {
      case "n": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: String(row + 1), data: { kind: "index", n: row + 1 } } as IndexCell;
      case "company": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.company, data: { kind: "company", name: r.company, fictional: r.synthetic } } as CompanyCell;
      case "contact": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: `${r.contact} · ${r.title}`, data: { kind: "contact", name: r.contact, title: r.title } } as ContactCell;
      case "similarity":
        if (!r.scored) return { kind: GridCellKind.Loading, allowOverlay: false, skeletonWidth: 78, skeletonWidthVariability: 0 };
        return { kind: GridCellKind.Custom, allowOverlay: false, copyData: String(r.similarity), data: { kind: "score", value: r.similarity } } as ScoreCell;
      case "status":
        if (r.status === "new") return text("");
        return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.status, data: { kind: "pill", label: r.status === "approved" ? "Approved" : "Drafted", tone: r.status === "approved" ? "green" : "grey" } } as PillCell;
      case "trigger": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.trigger, data: { kind: "text", text: r.trigger } } as TextCell;
      case "location": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.location, data: { kind: "text", text: r.location } } as TextCell;
      case "draft": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.draft?.subject ?? "", data: { kind: "draft", drafted: r.drafted } } as DraftCell;
      default: return text("");
    }
  }, [rows]);

  const openRow = useCallback(([, row]: Item) => { const r = rows[row]; if (r) onOpen(r); }, [rows, onOpen]);

  return (
    <div ref={setHost} className="h-full w-full">
      <div className="relative overflow-hidden rounded-xl border border-line" style={{ height: paneHeight ? gridHeight : "100%" }}>
        <DataEditor
          columns={columns}
          rows={rows.length}
          getCellContent={getCell}
          width="100%"
          height="100%"
          rowMarkers="none"
          rowHeight={ROW_H}
          headerHeight={HEADER_H}
          freezeColumns={0}
          theme={THEME}
          headerIcons={HEADER_ICONS}
          customRenderers={[indexRenderer, textRenderer, companyRenderer, contactRenderer, scoreRenderer, pillRenderer, draftRenderer]}
          getRowThemeOverride={getRowThemeOverride}
          onHeaderClicked={(col) => col > 0 && onSort(sort?.col === col ? (sort.dir === "desc" ? { col, dir: "asc" } : null) : { col, dir: "desc" })}
          onCellActivated={openRow}
          onCellClicked={openRow}
          showSearch={showSearch}
          onSearchClose={onSearchClose}
          keybindings={{ search: true, selectAll: false }}
          rangeSelect="none"
          columnSelect="none"
          rowSelect="none"
          drawFocusRing={false}
          isDraggable={false}
          maxColumnWidth={200}
          minColumnWidth={44}
          smoothScrollX
          smoothScrollY
          getCellsForSelection={true}
          verticalBorder={true}
          fixedShadowX={false}
          overscrollX={0}
          overscrollY={0}
          drawHeader={drawHeader}
          onItemHovered={(a) => setHoverRow(a.kind === "cell" ? a.location[1] : null)}
        />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent transition-opacity duration-150" style={{ opacity: fades.left ? 1 : 0 }} />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent transition-opacity duration-150" style={{ opacity: fades.right ? 1 : 0 }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent transition-opacity duration-150" style={{ opacity: fades.bottom ? 1 : 0 }} />
      </div>
    </div>
  );
}
