"use client";

import "@glideapps/glide-data-grid/dist/index.css";
import {
  CompactSelection,
  DataEditor,
  GridCellKind,
  type CustomCell,
  type CustomRenderer,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Item,
  type Theme,
} from "@glideapps/glide-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Conversation, ConversationStatus } from "@/lib/types";

// Palette from app/globals.css, spelled out because the canvas cannot read
// CSS variables. Keep in sync with the tokens there.
const C = {
  ink: "#13302C",
  muted: "#617B76",
  line: "#CDDBD7",
  surface: "#FBFDFC",
  hover: "#E3ECE9",
  avatar: "#D6E9E3",
  primary: "#FF6847",
  mist: "#EEF4F2",
};

const STATUS: Record<ConversationStatus, string> = {
  processing: "Processing",
  needs_review: "Needs review",
  action_ready: "Action ready",
  synced: "Synced",
};

const COLUMNS: GridColumn[] = [
  { id: "contact", title: "Contact", width: 190 },
  { id: "company", title: "Company", width: 210 },
  { id: "title", title: "Title", width: 170 },
  { id: "preview", title: "Preview", width: 240, grow: 1 },
  { id: "time", title: "Time", width: 160 },
  { id: "status", title: "Status", width: 140 },
];

const dayFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "2-digit", hour12: false });
const when = (iso: string) => { const d = new Date(iso); return `${dayFmt.format(d)} · ${timeFmt.format(d)}`; };
const duration = (s?: number) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "");
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

type ContactCell = CustomCell<{ kind: "contact"; name: string }>;
type StatusCell = CustomCell<{ kind: "status"; status: ConversationStatus }>;
type TimeCell = CustomCell<{ kind: "time"; when: string; duration: string }>;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

const contactRenderer: CustomRenderer<ContactCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is ContactCell => (c.data as { kind?: string }).kind === "contact",
  draw: ({ ctx, rect, theme }, cell) => {
    const x = rect.x + theme.cellHorizontalPadding;
    const cy = rect.y + rect.height / 2;
    const r = 14;
    ctx.beginPath(); ctx.arc(x + r, cy, r, 0, Math.PI * 2); ctx.fillStyle = C.avatar; ctx.fill();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `500 11px ${theme.fontFamily}`; ctx.fillStyle = C.ink;
    ctx.fillText(initials(cell.data.name), x + r, cy + 0.5);
    ctx.textAlign = "left";
    ctx.font = `500 14px ${theme.fontFamily}`;
    ctx.fillText(cell.data.name, x + r * 2 + 12, cy + 0.5);
    return true;
  },
};

const statusRenderer: CustomRenderer<StatusCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is StatusCell => (c.data as { kind?: string }).kind === "status",
  draw: ({ ctx, rect, theme }, cell) => {
    const s = cell.data.status;
    const label = STATUS[s];
    const x = rect.x + theme.cellHorizontalPadding;
    const cy = rect.y + rect.height / 2;
    const h = 24;
    ctx.font = `12px ${theme.fontFamily}`;
    const w = 8 + 6 + 6 + ctx.measureText(label).width + 8;
    ctx.beginPath(); roundRect(ctx, x, cy - h / 2, w, h, 5);
    ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    const dx = x + 8 + 3;
    if (s === "synced") {
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(dx - 3.5, cy); ctx.lineTo(dx - 1, cy + 2.5); ctx.lineTo(dx + 3.5, cy - 2.5); ctx.stroke();
    } else if (s === "needs_review") {
      ctx.beginPath(); ctx.arc(dx, cy, 2.5, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(dx, cy, 3, 0, Math.PI * 2); ctx.fillStyle = C.primary; ctx.fill();
    }
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = C.ink;
    ctx.fillText(label, x + 8 + 6 + 6, cy + 0.5);
    return true;
  },
};

const timeRenderer: CustomRenderer<TimeCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is TimeCell => (c.data as { kind?: string }).kind === "time",
  draw: ({ ctx, rect, theme }, cell) => {
    const x = rect.x + theme.cellHorizontalPadding;
    const cy = rect.y + rect.height / 2;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = `14px ${theme.fontFamily}`; ctx.fillStyle = C.muted;
    ctx.fillText(cell.data.when, x, cy + 0.5);
    if (cell.data.duration) {
      const w = ctx.measureText(cell.data.when).width;
      ctx.fillStyle = "#13302C66";
      ctx.fillText(cell.data.duration, x + w + 6, cy + 0.5);
    }
    return true;
  },
};

const RENDERERS = [contactRenderer, statusRenderer, timeRenderer] as unknown as CustomRenderer<CustomCell>[];

const THEME: Partial<Theme> = {
  accentColor: C.primary, accentFg: "#182521", accentLight: C.hover,
  textDark: C.ink, textMedium: C.muted, textLight: "#8FA39E", textBubble: C.ink,
  bgIconHeader: C.muted, fgIconHeader: C.surface, textHeader: C.muted, textHeaderSelected: C.ink,
  bgCell: C.surface, bgCellMedium: C.mist, bgHeader: C.surface, bgHeaderHasFocus: C.hover, bgHeaderHovered: C.hover,
  bgBubble: C.mist, bgBubbleSelected: C.hover, bgSearchResult: "#FFEDE7",
  borderColor: C.line, horizontalBorderColor: C.line, headerBottomBorderColor: C.line, drilldownBorder: C.line,
  linkColor: C.ink, cellHorizontalPadding: 14, cellVerticalPadding: 8,
  headerFontStyle: "500 13px", baseFontStyle: "14px", markerFontStyle: "13px", editorFontSize: "14px",
  lineHeight: 1.4, headerIconSize: 16, roundingRadius: 6,
};

function useFontFamily() {
  const [family, setFamily] = useState("Inter, system-ui, sans-serif");
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim();
    if (v) setFamily(`${v}, system-ui, sans-serif`);
    document.fonts?.ready.then(() => setFamily((f) => `${f} `));
  }, []);
  return family;
}

export function ConversationsGrid({ rows, onSelectionCount }: { rows: Conversation[]; onSelectionCount?: (n: number) => void }) {
  const fontFamily = useFontFamily();
  const theme = useMemo<Partial<Theme>>(() => ({ ...THEME, fontFamily }), [fontFamily]);
  const [selection, setSelection] = useState<GridSelection>({ columns: CompactSelection.empty(), rows: CompactSelection.empty() });
  const [hoverRow, setHoverRow] = useState<number>();

  useEffect(() => { onSelectionCount?.(selection.rows.length); }, [selection, onSelectionCount]);

  const getCellContent = useCallback(([col, row]: Item): GridCell => {
    const r = rows[row];
    const id = COLUMNS[col]?.id;
    const text = (s: string, muted = false): GridCell => ({ kind: GridCellKind.Text, data: s, displayData: s, allowOverlay: false, themeOverride: muted ? { textDark: C.muted } : undefined });
    if (!r || !id) return text("");
    switch (id) {
      case "contact": return { kind: GridCellKind.Custom, data: { kind: "contact", name: r.contact }, copyData: r.contact, allowOverlay: false } satisfies ContactCell;
      case "company": return text(r.company);
      case "title": return text(r.title, true);
      case "preview": return text(`“${r.preview}”`, true);
      case "time": return { kind: GridCellKind.Custom, data: { kind: "time", when: when(r.at), duration: duration(r.durationSeconds) }, copyData: when(r.at), allowOverlay: false } satisfies TimeCell;
      case "status": return { kind: GridCellKind.Custom, data: { kind: "status", status: r.status }, copyData: STATUS[r.status], allowOverlay: false } satisfies StatusCell;
      default: return text("");
    }
  }, [rows]);

  const getRowThemeOverride = useCallback((row: number): Partial<Theme> | undefined => {
    if (selection.rows.hasIndex(row)) return { bgCell: C.hover };
    if (row === hoverRow) return { bgCell: C.mist };
    return undefined;
  }, [selection, hoverRow]);

  return (
    <DataEditor
      width="100%" height="100%"
      columns={COLUMNS} rows={rows.length} getCellContent={getCellContent}
      customRenderers={RENDERERS} theme={theme} getRowThemeOverride={getRowThemeOverride}
      rowHeight={52} headerHeight={40}
      rowMarkers={{ kind: "checkbox-visible", width: 48, checkboxStyle: "square" }}
      gridSelection={selection} onGridSelectionChange={setSelection}
      rangeSelect="none" columnSelect="none" rowSelect="multi" rowSelectionMode="multi"
      verticalBorder={false} smoothScrollX smoothScrollY drawFocusRing={false}
      getCellsForSelection keybindings={{ search: true, selectAll: true }}
      onItemHovered={(a) => setHoverRow(a.kind === "cell" ? a.location[1] : undefined)}
    />
  );
}
