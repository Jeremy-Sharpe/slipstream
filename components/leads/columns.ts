import type { Lead } from "@/lib/types";

/* Shared with the view without importing the canvas grid on the server. */
export type Row = Lead & { scored: boolean; drafted: boolean };
export type Sort = { col: number; dir: "asc" | "desc" } | null;
export const SORT_KEYS = ["company", "contact", "similarity", "status", "trigger", "location", "linkedin", "draft"] as const;
