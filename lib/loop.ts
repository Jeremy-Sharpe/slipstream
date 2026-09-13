import type { ApiReadiness } from "@/docs/api-shapes";

// The Revenue loop page: runtime readiness (shaped like GET /readiness on
// main), the seven beats of the loop with their evidence, and the value
// tiles. Mock now; the beats read from the Marlowe & Finch demo call.

export const readiness: ApiReadiness = {
  revision: "16520b8",
  environment: "production",
  storage: "memory",
  integrations: { api: true, origami: false, delivery: false },
  reasoning_provider: "OpenRouter",
  reasoning_model: "gpt-5.4",
  embedding_provider: "OpenAI",
  embedding_model: "text-embedding-3-small",
};

export const DEMO_CALL = "call-13-marlowe-finch-demo";

export type Provenance = "Recorded demo call" | "Live · ICP v3" | "Live guardrail";

export type Beat = {
  n: string;
  verb: string;
  title: string;
  /** One sentence of what happened on the demo call. */
  what: string;
  provenance: Provenance;
  evidence: { label: string; href: string };
};

export const beats: Beat[] = [
  {
    n: "01", verb: "Listen", title: "One sales call",
    what: "Dev names the cyber-insurance renewal and the 5pm proposal deadline.",
    provenance: "Recorded demo call",
    evidence: { label: "Transcript", href: `/calls/${DEMO_CALL}#transcript` },
  },
  {
    n: "02", verb: "Remember", title: "CRM writes itself",
    what: "6 fields written to CRM with 86–96% confidence.",
    provenance: "Recorded demo call",
    evidence: { label: "Extracted fields", href: `/calls/${DEMO_CALL}#fields` },
  },
  {
    n: "03", verb: "Respond", title: "Safe follow-up",
    what: "Draft keeps the agreed next step and drops an unsupported insurance promise.",
    provenance: "Recorded demo call",
    evidence: { label: "Follow-up draft", href: `/calls/${DEMO_CALL}#draft` },
  },
  {
    n: "04", verb: "Learn", title: "The team compounds",
    what: "12 calls and 1 email · 5 wins · 4 patterns.",
    provenance: "Live · ICP v3",
    evidence: { label: "Intelligence", href: "/intelligence" },
  },
  {
    n: "05", verb: "Focus", title: "ICP emerges",
    what: "Professional services and allied health · 25 to 80 staff · practice or operations manager.",
    provenance: "Live · ICP v3",
    evidence: { label: "ICP profile", href: "/intelligence" },
  },
  {
    n: "06", verb: "Find", title: "Next search writes itself",
    what: "Brief generated from the won-deal profile · 10 companies found · similarity 53–92.",
    provenance: "Live · ICP v3",
    evidence: { label: "Leads", href: "/leads" },
  },
  {
    n: "07", verb: "Execute", title: "Outreach stays controlled",
    what: "1 campaign · 10 queued · 0 sent.",
    provenance: "Live guardrail",
    evidence: { label: "Campaign", href: "/leads" },
  },
];

export const value: { line: string }[] = [
  { line: "12 minutes saved per call" },
  { line: "follow-ups the same day" },
  { line: "5 wins turned into 10 leads" },
];
