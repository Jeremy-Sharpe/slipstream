import { Building2, Link2, MapPin, Type, Users, Zap, type LucideIcon } from "lucide-react";
import type { Lead } from "@/lib/types";

// The lead-search filter model. Criteria values are comma-joined strings so
// the code view and the table filter share one shape.
export type FilterKey = "industry" | "size" | "buyer_title" | "trigger" | "region" | "target";
export type FilterValues = Partial<Record<FilterKey, string>>;
export type TargetMode = "any" | "in_hubspot" | "not_in_hubspot";

export type FilterState = {
  criteria: FilterValues;
  targetMode: TargetMode;
  targets: string[];
  excluded: string[];
  total: number;
  perCompany: number;
};

export const defaultFilterState: FilterState = {
  criteria: {},
  targetMode: "any",
  targets: [],
  excluded: [],
  total: 10,
  perCompany: 1,
};

export const CRITERIA: { key: FilterKey; label: string; icon: LucideIcon; placeholder: string }[] = [
  { key: "industry", label: "Industry", icon: Building2, placeholder: "Law firm, accounting practice, etc." },
  { key: "size", label: "Company size", icon: Users, placeholder: "25–80 staff, etc." },
  { key: "buyer_title", label: "Buyer title", icon: Type, placeholder: "Practice manager, etc." },
  { key: "trigger", label: "Trigger", icon: Zap, placeholder: "Statement of advice backlog, etc." },
  { key: "region", label: "Region", icon: MapPin, placeholder: "Melbourne, etc." },
  { key: "target", label: "Target companies", icon: Link2, placeholder: "Paste domains or names" },
];

export const criterion = (key: FilterKey) => CRITERIA.find((c) => c.key === key)!;

export const splitValues = (value?: string) => (value ?? "").split(",").map((t) => t.trim()).filter(Boolean);
export const joinValues = (values: string[]) => values.join(", ");

const has = (hay: string, needle: string) => hay.toLowerCase().includes(needle.trim().toLowerCase());

/** Comma-separated terms match if any term is found. */
function matchesAny(hay: string, value?: string) {
  const terms = splitValues(value);
  if (terms.length === 0) return true;
  return terms.some((t) => has(hay, t));
}

// Region terms map to how locations are written on rows ("Kew, VIC").
const REGIONAL_VIC = ["geelong", "ballarat", "bendigo", "mornington", "shepparton", "warrnambool"];
function matchesRegion(location: string, value?: string) {
  const terms = splitValues(value);
  if (terms.length === 0) return true;
  const loc = location.toLowerCase();
  const isVic = loc.endsWith("vic") || loc.includes("victoria");
  const isRegional = REGIONAL_VIC.some((t) => loc.includes(t));
  return terms.some((raw) => {
    const t = raw.toLowerCase();
    if (t === "australia") return true;
    if (t === "victoria") return isVic;
    if (t === "melbourne") return isVic && !isRegional;
    if (t === "regional victoria") return isVic && isRegional;
    return has(location, t);
  });
}

// Deterministic stand-in for a HubSpot lookup until the CRM is wired: leads
// that already have a draft are treated as known to the CRM.
const inHubspot = (l: Lead) => l.status !== "new";

export function applyFilters(leads: Lead[], f: FilterState): Lead[] {
  const c = f.criteria;
  const targets = [...f.targets, ...splitValues(c.target)];
  const rows = leads.filter(
    (l) =>
      matchesAny(`${l.company} ${l.title}`, c.industry) &&
      matchesAny(l.title, c.buyer_title) &&
      matchesAny(l.match_evidence.map((e) => `${e.attribute} ${e.value}`).join(" "), c.trigger) &&
      matchesRegion(l.location, c.region) &&
      (targets.length === 0 || targets.some((t) => has(l.company, t))) &&
      !f.excluded.some((x) => has(l.company, x)) &&
      (f.targetMode === "any" || (f.targetMode === "in_hubspot") === inHubspot(l)),
    // size is not on the row yet; it becomes a real filter once headcount lands.
  );
  return rows.slice(0, Math.max(1, f.total));
}

/** Criteria that have been added as rule rows (a key present in `criteria`, even empty). */
export const activeCriteria = (c: FilterValues): FilterKey[] => CRITERIA.map((x) => x.key).filter((k) => k in c);
