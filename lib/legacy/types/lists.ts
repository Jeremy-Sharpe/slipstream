// A list is a workbook table: typed columns over plain rows. Mirrors the
// shape a Supabase-backed list will take; the UI never assumes column names.

export type ColumnKind = "text" | "number" | "link" | "enrichment";

export type ListColumn = { id: string; title: string; kind: ColumnKind };

export type ListRow = Record<string, string | number>;

export type List = {
  id: string;
  name: string;
  columns: ListColumn[];
  rows: ListRow[];
  /** ISO time of the last tool run, for the Overview card and History. */
  lastRunAt: string;
};

export type ListRun = { id: string; tool: string; at: string; rows: number };
