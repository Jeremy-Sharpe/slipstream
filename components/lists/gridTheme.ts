import type { Theme } from "@glideapps/glide-data-grid";

// Palette from app/globals.css, spelled out because the canvas cannot read
// CSS variables. Keep in sync with the tokens there and with
// components/conversations/ConversationsGrid.tsx.
export const C = {
  ink: "#111827",
  muted: "#6B7280",
  line: "#E5E7EB",
  surface: "#FFFFFF",
  hover: "#F3F4F6",
  primary: "#FF6847",
  mist: "#F9FAFB",
};

export const GRID_THEME: Partial<Theme> = {
  accentColor: C.primary, accentFg: "#182521", accentLight: "#FFEDE7",
  textDark: C.ink, textMedium: C.muted, textLight: "#9CA3AF", textBubble: C.ink,
  bgIconHeader: C.muted, fgIconHeader: C.surface, textHeader: C.ink, textHeaderSelected: C.ink,
  bgCell: C.surface, bgCellMedium: C.mist, bgHeader: C.surface, bgHeaderHasFocus: C.hover, bgHeaderHovered: C.hover,
  bgBubble: C.mist, bgBubbleSelected: C.hover, bgSearchResult: "#FFEDE7",
  borderColor: C.line, horizontalBorderColor: C.line, headerBottomBorderColor: C.line, drilldownBorder: C.line,
  linkColor: C.ink, cellHorizontalPadding: 12, cellVerticalPadding: 8,
  headerFontStyle: "600 14px", baseFontStyle: "14px", markerFontStyle: "13px", editorFontSize: "14px",
  lineHeight: 1.4, headerIconSize: 16, roundingRadius: 6,
};
