import type { ApiLead, ApiPlaybook, ApiReadiness } from "@/lib/api/slipstream";
import type { ApiCallExtraction, ApiDemoEvidence, ApiFixtureCall } from "@/lib/api/intelligence";
import { rateScenario } from "@/lib/demo/revenue-loop";

// The Revenue loop page: the runtime the API reports, the seven beats of the
// loop with the numbers each one is made of, and three illustrative value
// scenarios. Nothing here is a constant except the prose and the assumptions,
// which are stated where they are used.

export const DEMO_CALL = "call-13-marlowe-finch-demo";

export type Beat = {
  n: string;
  verb: string;
  title: string;
  /** What actually happened, from the API. "Not yet derived." when it has not. */
  what: string;
  impact: string;
  provenance: string;
  evidence: { label: string; href: string };
};

export type Loop = {
  runtime: { label: string; value: string }[];
  runtimeNote: string;
  runtimeCaveat: string | null;
  beats: Beat[];
  value: { figure: string; note: string }[];
  demoHref: string;
  errors: { readiness: string | null; evidence: string | null; leads: string | null };
};

export type LoopInput = {
  readiness: ApiReadiness | null;
  evidence: ApiDemoEvidence | null;
  leads: ApiLead[] | null;
  playbook: ApiPlaybook | null;
  demoCall: ApiFixtureCall | null;
  demoExtraction: ApiCallExtraction | null;
  demoHref: string;
  errors: Loop["errors"];
};

const NOT_DERIVED = "Not yet derived.";
const UNKNOWN = "Unknown";

const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
const label = (key: string) => key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const range = (values: number[]) => (values.length ? `${Math.min(...values)}–${Math.max(...values)}` : null);

function runtimeRows(readiness: ApiReadiness | null): { label: string; value: string }[] {
  return [
    { label: "API", value: readiness ? `${label(readiness.environment ?? "unknown")} · ${readiness.storage} storage` : UNKNOWN },
    { label: "Reasoning", value: readiness?.reasoning_model ? `${readiness.reasoning_provider ?? "provider"} · ${readiness.reasoning_model}` : UNKNOWN },
    { label: "Embeddings", value: readiness?.embedding_model ?? "None" },
    { label: "Revision", value: readiness ? readiness.revision.slice(0, 7) : UNKNOWN },
  ];
}

function extractionBeat(extraction: ApiCallExtraction | null): string {
  if (!extraction) return NOT_DERIVED;
  const fields = [...Object.values(extraction.contact), ...Object.values(extraction.company), ...Object.values(extraction.deal)].filter(
    (field) => field.value !== null && field.value !== undefined,
  );
  if (!fields.length) return NOT_DERIVED;
  const confidences = fields.map((field) => Math.round(field.confidence * 100));
  return `${fields.length} fields written to CRM with ${range(confidences)}% confidence.`;
}

function draftBeat(extraction: ApiCallExtraction | null): string {
  if (!extraction) return NOT_DERIVED;
  const grounding = `${extraction.promises.length} promises checked against the transcript, ${extraction.grounding.dropped} dropped and ${extraction.grounding.repaired} repaired.`;
  return extraction.next_step ? `The dated next step is kept. ${grounding}` : grounding;
}

export function buildLoop(input: LoopInput): Loop {
  const { readiness, evidence, leads, playbook, demoCall, demoExtraction, demoHref } = input;
  const profile = evidence?.icp?.profile ?? null;
  const source = profile?.source_summary ?? null;
  const wins = evidence?.icp?.source_deals?.length ?? null;
  const similarity = leads ? range(leads.map((lead) => Math.round((lead.similarity_score ?? 0) * 100))) : null;
  const icpVersion = evidence?.icp?.version ?? null;
  const live = icpVersion != null ? `Live · ICP v${icpVersion}` : "Live";

  const integrations = readiness ? Object.entries(readiness.integrations) : [];
  const runtimeNote = readiness
    ? `Storage: ${readiness.storage} · ${integrations.map(([key, on]) => `${label(key)} ${on ? "on" : "off"}`).join(" · ")}`
    : "Runtime unavailable.";
  const caveats = [
    readiness && !readiness.integrations.origami ? "leads are generated and labelled fictional" : null,
    readiness && !readiness.integrations.email_delivery ? "nothing is sent" : null,
  ].filter((item): item is string => item !== null);

  const beats: Beat[] = [
    {
      n: "01",
      verb: "Listen",
      title: "One sales call",
      what: demoCall ? `${demoCall.subject}, ${demoCall.segments.length} turns${demoCall.duration_seconds ? `, ${mmss(demoCall.duration_seconds)}` : ""}.` : NOT_DERIVED,
      impact: "The conversation becomes structured input instead of a note nobody reads.",
      provenance: "Recorded demo call",
      evidence: { label: "Transcript", href: demoHref },
    },
    {
      n: "02",
      verb: "Remember",
      title: "CRM writes itself",
      what: extractionBeat(demoExtraction),
      impact: "Every field points at the turn it came from, so the rep checks instead of types.",
      provenance: "Recorded demo call",
      evidence: { label: "Extracted fields", href: demoHref },
    },
    {
      n: "03",
      verb: "Respond",
      title: "Safe follow-up",
      what: draftBeat(demoExtraction),
      impact: "The follow-up says only what the call supports, and goes out the same day.",
      provenance: "Recorded demo call",
      evidence: { label: "Follow-up draft", href: demoHref },
    },
    {
      n: "04",
      verb: "Learn",
      title: "The team compounds",
      what: source
        ? `${source.calls} calls and ${source.emails} ${source.emails === 1 ? "email" : "emails"} · ${wins ?? 0} wins · ${playbook ? `${playbook.patterns.length} ${playbook.patterns.length === 1 ? "pattern" : "patterns"}` : "patterns not yet derived"}.`
        : NOT_DERIVED,
      impact: "What the best calls did differently is written down with the quotes that prove it.",
      provenance: live,
      evidence: { label: "Intelligence", href: "/intelligence" },
    },
    {
      n: "05",
      verb: "Focus",
      title: "ICP emerges",
      what: profile
        ? `${profile.industries.length} won industries · ${profile.headcount_band} staff · ${profile.roles.slice(0, 3).join(", ")}.`
        : NOT_DERIVED,
      impact: "The ideal customer is derived from the deals that closed, not from a workshop.",
      provenance: live,
      evidence: { label: "ICP profile", href: "/intelligence" },
    },
    {
      n: "06",
      verb: "Find",
      title: "Next search writes itself",
      what: evidence
        ? `Brief generated from the won-deal profile · ${evidence.lead_count} companies found${similarity ? ` · similarity ${similarity}` : ""}.`
        : NOT_DERIVED,
      impact: "The next companies to call look like the last ones that said yes.",
      provenance: live,
      evidence: { label: "Leads", href: "/leads" },
    },
    {
      n: "07",
      verb: "Execute",
      title: "Outreach stays controlled",
      what: leads
        ? `${leads.filter((lead) => lead.status !== "rejected").length} prospects queued · ${leads.filter((lead) => lead.status === "approved").length} approved · ${leads.filter((lead) => lead.status === "contacted").length} sent.`
        : NOT_DERIVED,
      impact: "Outreach is drafted and queued for a person to approve. Nothing leaves without one.",
      provenance: "Live guardrail",
      evidence: { label: "Leads", href: "/leads" },
    },
  ];

  // Illustrative scenarios, stated with their assumptions. Not measured results.
  const admin = rateScenario({ volume: 8, baselineRate: 10, scenarioRate: 0 });
  const deals = rateScenario({ volume: 40, baselineRate: 0.2, scenarioRate: 0.225 });
  const replies = rateScenario({ volume: 200, baselineRate: 0.05, scenarioRate: 0.06 });

  return {
    runtime: runtimeRows(readiness),
    runtimeNote,
    runtimeCaveat: caveats.length ? `${caveats.join(", ")}.` : null,
    beats,
    value: [
      { figure: `${admin.baselineOutcomes} min a day`, note: "Illustrative: 10 minutes of CRM admin and follow-up per call, 8 calls a day." },
      { figure: `+${deals.additionalOutcomes} deal a month`, note: `Illustrative: 40 opportunities a month, 20% to 22.5% win rate, ${deals.baselineOutcomes} to ${deals.scenarioOutcomes} wins.` },
      { figure: `+${replies.additionalOutcomes} replies`, note: `Illustrative: 200 prospects, 5% to 6% reply rate, ${replies.baselineOutcomes} to ${replies.scenarioOutcomes} replies.` },
    ],
    demoHref,
    errors: input.errors,
  };
}
