import { conversations } from "@/lib/data/conversations";
import { leads } from "@/lib/data/leads";
import type { List, ListRun } from "@/lib/types/lists";

// Two lists for the demo: the Origami leads for ICP v3 and the won deals the
// ICP was derived from. Both are built from the same mock data the other
// surfaces read, so numbers line up everywhere.

const sizeOf = (evidence: { attribute: string; value: string }[]) =>
  evidence.find((e) => e.attribute === "Segment")?.value ?? "";

export const lists: List[] = [
  {
    id: "leads-icp-v3",
    name: "Leads — ICP v3",
    lastRunAt: "2026-09-12T16:40:00+10:00",
    columns: [
      { id: "company", title: "Company", kind: "text" },
      { id: "enrich", title: "Enrich company", kind: "enrichment" },
      { id: "linkedin", title: "LinkedIn", kind: "link" },
      { id: "similarity", title: "Similarity", kind: "number" },
      { id: "draft", title: "Draft", kind: "text" },
    ],
    rows: leads.map((l) => ({
      company: l.company,
      enrich: sizeOf(l.match_evidence) || `${l.title} · ${l.location}`,
      linkedin: l.linkedin_url ?? "",
      similarity: l.similarity ?? "",
      draft: l.draft?.subject ?? "—",
    })),
  },
  {
    id: "won-deals",
    name: "Won deals",
    lastRunAt: "2026-09-11T18:05:00+10:00",
    columns: [
      { id: "company", title: "Company", kind: "text" },
      { id: "contact", title: "Contact", kind: "text" },
      { id: "trigger", title: "Trigger", kind: "text" },
      { id: "value", title: "Value AUD", kind: "number" },
      { id: "closed", title: "Closed on", kind: "text" },
    ],
    rows: conversations
      .filter((c) => c.outcome === "won")
      .map((c) => ({
        company: c.company,
        contact: `${c.contact} · ${c.title}`,
        trigger: c.trigger ?? "",
        value: c.valueAud ?? 0,
        closed: c.at.slice(0, 10),
      })),
  },
];

export const runs: ListRun[] = [
  { id: "run-3", tool: "Score against won deals", at: "2026-09-12T16:40:00+10:00", rows: 12 },
  { id: "run-2", tool: "Draft follow-ups", at: "2026-09-12T16:12:00+10:00", rows: 7 },
  { id: "run-1", tool: "Enrich with Origami", at: "2026-09-12T15:58:00+10:00", rows: 12 },
];

export const getList = (id: string) => lists.find((l) => l.id === id);
