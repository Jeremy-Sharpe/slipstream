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
   the two-line contact, the score bar, the status pill, the LinkedIn link and
   the draft check. Row numbers, Company and Contact stay frozen; the rest
   scrolls like a spreadsheet at natural widths. The grid ends at the last row. */

import type { Row, Sort } from "./columns";
export type { Row, Sort };

const INK = "#181925", SOFT = "#737373", FAINT = "#a3a3a3", LINE = "#e8e8e8", GREEN = "#16a34a";
export const ROW_H = 52, HEADER_H = 40, MARKER_W = 44;

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
  bgHeader: "#ffffff",
  bgHeaderHasFocus: "#f6f6f7",
  bgHeaderHovered: "#f6f6f7",
  bgBubble: "#f5f5f5",
  bgBubbleSelected: "#ffffff",
  bgSearchResult: "#fff1ec",
  borderColor: LINE,
  horizontalBorderColor: LINE,
  headerBottomBorderColor: LINE,
  drilldownBorder: "transparent",
  linkColor: "#ff6847",
  cellHorizontalPadding: 12,
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
  linkedin: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  draft: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
};
const svg = (body: string, stroke = FAINT) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const HEADER_ICONS = Object.fromEntries(Object.entries(PATHS).map(([k, v]) => [k, () => svg(v)]));

const COLUMNS: (GridColumn & { id: string; width: number })[] = [
  { id: "company", title: "Company", width: 220, icon: "company" },
  { id: "contact", title: "Contact", width: 200, icon: "contact" },
  { id: "similarity", title: "Similarity", width: 120, icon: "similarity" },
  { id: "status", title: "Status", width: 100, icon: "status" },
  { id: "trigger", title: "Trigger", width: 240, icon: "trigger" },
  { id: "location", title: "Location", width: 140, icon: "location" },
  { id: "linkedin", title: "LinkedIn", width: 80, icon: "linkedin" },
  { id: "draft", title: "Draft", width: 60, icon: "draft" },
];

type TextCell = CustomCell<{ kind: "text"; text: string; weight?: number }>;
type ContactCell = CustomCell<{ kind: "contact"; name: string; title: string }>;
type ScoreCell = CustomCell<{ kind: "score"; value: number }>;
type PillCell = CustomCell<{ kind: "pill"; label: string; tone: "grey" | "green" }>;
type LinkCell = CustomCell<{ kind: "link"; url: string }>;
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

const contactRenderer: CustomRenderer<ContactCell> = {
  kind: GridCellKind.Custom,
  isMatch: is<ContactCell>("contact"),
  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const x = rect.x + theme.cellHorizontalPadding, cy = rect.y + rect.height / 2, max = rect.width - theme.cellHorizontalPadding * 2;
    ctx.textBaseline = "middle";
    ctx.font = `14px ${theme.fontFamily}`; ctx.fillStyle = INK;
    ctx.fillText(fitText(ctx, cell.data.name, max), x, cy - 9);
    ctx.font = `12px ${theme.fontFamily}`; ctx.fillStyle = SOFT;
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
    ctx.textBaseline = "middle";
    ctx.font = `500 14px ${theme.fontFamily}`; ctx.fillStyle = v >= 80 ? GREEN : INK;
    ctx.fillText(String(v), x, cy);
    const bx = x + 34, bw = 44, bh = 4, by = cy - bh / 2;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 2); ctx.fillStyle = LINE; ctx.fill();
    ctx.beginPath(); ctx.roundRect(bx, by, Math.max(bh, bw * (v / 100)), bh, 2); ctx.fillStyle = INK; ctx.fill();
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

let external: Path2D | undefined;
const EXTERNAL = () => (external ??= new Path2D("M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"));
const linkRenderer: CustomRenderer<LinkCell> = {
  kind: GridCellKind.Custom,
  isMatch: is<LinkCell>("link"),
  needsHover: true,
  draw: (args) => {
    const { ctx, rect, hoverAmount, overrideCursor } = args;
    if (hoverAmount > 0) overrideCursor?.("pointer");
    const size = 14, x = rect.x + (rect.width - size) / 2, y = rect.y + (rect.height - size) / 2;
    ctx.save();
    ctx.translate(x, y); ctx.scale(size / 24, size / 24);
    ctx.lineWidth = 1.5 * (24 / size); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = hoverAmount > 0 ? INK : FAINT;
    ctx.stroke(EXTERNAL());
    ctx.restore();
    return true;
  },
  onClick: (a) => { window.open(a.cell.data.url, "_blank", "noopener"); a.preventDefault(); return undefined; },
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

export default function LeadsGridInner({ rows, sort, onSort, onOpen, showSearch, onSearchClose }: {
  rows: Row[];
  sort: Sort;
  onSort: (s: Sort) => void;
  onOpen: (lead: Lead) => void;
  showSearch: boolean;
  onSearchClose: () => void;
}) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const columns = useMemo(
    () => COLUMNS.map<GridColumn>((c, i) => {
      const width = widths[c.id] ?? c.width;
      return sort?.col === i ? { ...c, width, icon: undefined, title: `${sort.dir === "asc" ? "↑" : "↓"} ${c.title}` } : { ...c, width };
    }),
    [widths, sort],
  );

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
    const at = rows[row]?.landedAt;
    if (!at) return undefined;
    const age = Date.now() - at;
    if (age > HIGHLIGHT_MS) return undefined;
    const alpha = 1 - age / HIGHLIGHT_MS;
    return { bgCell: `rgba(255, 104, 71, ${(0.14 * alpha).toFixed(3)})` };
  }, [rows]);

  const getCell = useCallback(([col, row]: Item): GridCell => {
    const r = rows[row];
    const text = (d: string, opts?: Partial<GridCell>) => ({ kind: GridCellKind.Text, data: d, displayData: d, allowOverlay: false, ...opts }) as GridCell;
    if (!r) return text("");
    switch (COLUMNS[col].id) {
      case "company": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.company, data: { kind: "text", text: r.company, weight: 500 } } as TextCell;
      case "contact": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: `${r.contact} · ${r.title}`, data: { kind: "contact", name: r.contact, title: r.title } } as ContactCell;
      case "similarity":
        if (!r.scored) return { kind: GridCellKind.Loading, allowOverlay: false, skeletonWidth: 78, skeletonWidthVariability: 0 };
        return { kind: GridCellKind.Custom, allowOverlay: false, copyData: String(r.similarity), data: { kind: "score", value: r.similarity } } as ScoreCell;
      case "status":
        if (r.status === "new") return text("");
        return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.status, data: { kind: "pill", label: r.status === "approved" ? "Approved" : "Drafted", tone: r.status === "approved" ? "green" : "grey" } } as PillCell;
      case "trigger": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.trigger, data: { kind: "text", text: r.trigger } } as TextCell;
      case "location": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.location, data: { kind: "text", text: r.location } } as TextCell;
      case "linkedin":
        if (!r.linkedinUrl) return text("");
        return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.linkedinUrl, data: { kind: "link", url: r.linkedinUrl } } as LinkCell;
      case "draft": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.draft?.subject ?? "", data: { kind: "draft", drafted: r.drafted } } as DraftCell;
      default: return text("");
    }
  }, [rows]);

  const openRow = useCallback(([col, row]: Item) => { if (COLUMNS[col]?.id === "linkedin") return; const r = rows[row]; if (r) onOpen(r); }, [rows, onOpen]);

  return (
    <div ref={setHost} className="h-full w-full">
      <div className="overflow-hidden rounded-xl border border-line" style={{ height: paneHeight ? gridHeight : "100%" }}>
        <DataEditor
          columns={columns}
          rows={rows.length}
          getCellContent={getCell}
          width="100%"
          height="100%"
          rowMarkers={{ kind: "number", width: MARKER_W, theme: { textLight: FAINT, borderColor: LINE } }}
          rowHeight={ROW_H}
          headerHeight={HEADER_H}
          freezeColumns={2}
          theme={THEME}
          headerIcons={HEADER_ICONS}
          customRenderers={[textRenderer, contactRenderer, scoreRenderer, pillRenderer, linkRenderer, draftRenderer]}
          getRowThemeOverride={getRowThemeOverride}
          onHeaderClicked={(col) => onSort(sort?.col === col ? (sort.dir === "desc" ? { col, dir: "asc" } : null) : { col, dir: "desc" })}
          onCellActivated={openRow}
          onCellClicked={openRow}
          onColumnResize={(col, size) => { if (col.id) setWidths((w) => ({ ...w, [col.id as string]: size })); }}
          showSearch={showSearch}
          onSearchClose={onSearchClose}
          keybindings={{ search: true, selectAll: false }}
          rangeSelect="none"
          columnSelect="none"
          rowSelect="none"
          drawFocusRing={false}
          smoothScrollX
          smoothScrollY
          getCellsForSelection={true}
          verticalBorder={true}
          fixedShadowX={false}
          overscrollX={0}
          overscrollY={0}
        />
      </div>
    </div>
  );
}
