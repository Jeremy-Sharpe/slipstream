"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DataEditor,
  GridCellKind,
  GridColumnIcon,
  type CustomCell,
  type CustomRenderer,
  type GridCell,
  type GridColumn,
  type Item,
  type Theme,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { gradientFor } from "../Avatar";
import type { Lead } from "@/lib/types";

/* The sheet. Glide Data Grid themed to the app tokens; canvas renderers for
   the contact avatar and the status pill. Rows arriving from a running search
   get a 1.5s soft tangerine highlight; cells fill in place as scoring and
   drafting progress. */

export type Row = Lead & { scored: boolean; drafted: boolean };
export type Sort = { col: number; dir: "asc" | "desc" } | null;

const THEME: Partial<Theme> = {
  accentColor: "#ff6847",
  accentFg: "#ffffff",
  accentLight: "#fff1ec",
  textDark: "#181925",
  textMedium: "#666666",
  textLight: "#a3a3a3",
  textBubble: "#181925",
  bgIconHeader: "#a3a3a3",
  fgIconHeader: "#ffffff",
  textHeader: "#737373",
  textHeaderSelected: "#181925",
  bgCell: "#ffffff",
  bgCellMedium: "#f6f6f7",
  bgHeader: "#ffffff",
  bgHeaderHasFocus: "#f6f6f7",
  bgHeaderHovered: "#f6f6f7",
  bgBubble: "#f5f5f5",
  bgBubbleSelected: "#ffffff",
  bgSearchResult: "#fff1ec",
  borderColor: "#e8e8e8",
  horizontalBorderColor: "#e8e8e8",
  headerBottomBorderColor: "#e8e8e8",
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
  headerIconSize: 16,
  roundingRadius: 6,
};

const COLUMNS: (GridColumn & { id: string; width: number })[] = [
  { id: "company", title: "Company", width: 220, icon: GridColumnIcon.HeaderString },
  { id: "contact", title: "Contact", width: 200 },
  { id: "title", title: "Title", width: 180 },
  { id: "location", title: "Location", width: 140 },
  { id: "trigger", title: "Trigger", width: 260, icon: GridColumnIcon.HeaderString },
  { id: "similarity", title: "Similarity", width: 100, icon: GridColumnIcon.HeaderNumber },
  { id: "status", title: "Status", width: 110 },
  { id: "draft", title: "Draft", width: 320, grow: 1 },
];

type AvatarCell = CustomCell<{ kind: "avatar"; name: string }>;
type PillCell = CustomCell<{ kind: "pill"; label: string; tone: "grey" | "green" }>;

const avatarRenderer: CustomRenderer<AvatarCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is AvatarCell => (c.data as { kind?: string }).kind === "avatar",
  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const size = 24;
    const x = rect.x + theme.cellHorizontalPadding, y = rect.y + (rect.height - size) / 2;
    const [a, b] = gradientFor(cell.data.name);
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = theme.textDark; ctx.textBaseline = "middle";
    ctx.fillText(cell.data.name, x + size + 10, rect.y + rect.height / 2);
    return true;
  },
};

const pillRenderer: CustomRenderer<PillCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is PillCell => (c.data as { kind?: string }).kind === "pill",
  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const green = cell.data.tone === "green";
    ctx.font = `500 12px ${theme.fontFamily}`;
    const w = ctx.measureText(cell.data.label).width + 20, h = 24;
    const x = rect.x + theme.cellHorizontalPadding, y = rect.y + (rect.height - h) / 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fillStyle = green ? "#dcfce7" : "#f5f5f5"; ctx.fill();
    ctx.fillStyle = green ? "#16a34a" : "#737373"; ctx.textBaseline = "middle";
    ctx.fillText(cell.data.label, x + 10, y + h / 2 + 0.5);
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
    () => COLUMNS.map<GridColumn>((c, i) => ({ ...c, width: widths[c.id] ?? c.width, title: sort?.col === i ? `${c.title} ${sort.dir === "asc" ? "↑" : "↓"}` : c.title })),
    [widths, sort],
  );

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
      case "company": return text(r.company, { themeOverride: { baseFontStyle: "500 14px" } } as Partial<GridCell>);
      case "contact": return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.contact, data: { kind: "avatar", name: r.contact } } as AvatarCell;
      case "title": return text(r.title);
      case "location": return text(r.location);
      case "trigger": return text(r.trigger);
      case "similarity":
        if (!r.scored) return { kind: GridCellKind.Loading, allowOverlay: false, skeletonWidth: 32, skeletonWidthVariability: 0 };
        return { kind: GridCellKind.Number, data: r.similarity, displayData: String(r.similarity), allowOverlay: false, contentAlign: "right", themeOverride: { textDark: r.similarity >= 80 ? "#16a34a" : "#181925", baseFontStyle: "500 14px" } };
      case "status":
        if (!r.drafted) return text("");
        return { kind: GridCellKind.Custom, allowOverlay: false, copyData: r.status, data: { kind: "pill", label: r.status === "approved" ? "Approved" : "Drafted", tone: r.status === "approved" ? "green" : "grey" } } as PillCell;
      case "draft":
        if (!r.drafted) return { kind: GridCellKind.Loading, allowOverlay: false, skeletonWidth: 180, skeletonWidthVariability: 60 };
        return text(r.draft.subject.split("\n")[0]);
      default: return text("");
    }
  }, [rows]);

  return (
    <DataEditor
      columns={columns}
      rows={rows.length}
      getCellContent={getCell}
      width="100%"
      height="100%"
      rowMarkers={{ kind: "number", theme: { borderColor: "transparent", textLight: "#a3a3a3" } }}
      rowHeight={44}
      headerHeight={40}
      theme={THEME}
      customRenderers={[avatarRenderer, pillRenderer]}
      getRowThemeOverride={getRowThemeOverride}
      onHeaderClicked={(col) => onSort(sort?.col === col ? (sort.dir === "desc" ? { col, dir: "asc" } : null) : { col, dir: "desc" })}
      onCellActivated={([, row]) => { const r = rows[row]; if (r) onOpen(r); }}
      onCellClicked={([, row]) => { const r = rows[row]; if (r) onOpen(r); }}
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
    />
  );
}
