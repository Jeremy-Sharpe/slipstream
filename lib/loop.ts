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
  /** The artefact the beat produced, shown inside its card; null when it has not been derived. */
  preview: BeatPreview | null;
  provenance: string;
  evidence: { label: string; href: string };
};

export type BeatPreview =
  | { kind: "turns"; turns: { key: number; name: string; t: number; text: string }[] }
  | { kind: "fields"; rows: { label: string; value: string; confidence: number }[] }
  | { kind: "follow-up"; title: string; lines: string[] }
  | { kind: "numbers"; items: { label: string; value: string }[] }
  | { kind: "icp"; line: string; companies: string[] }
  | { kind: "leads"; leads: { id: string; company: string; similarity: number }[] }
  | { kind: "campaign"; line: string; state: string };

export type Loop = {
  /** One line of what the API reports about itself, for the footer. */
  runtimeLine: string;
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
const range = (values: number[]) => (values.length ? `${Math.min(...values)} to ${Math.max(...values)}` : null);

function runtimeLine(readiness: ApiReadiness | null): string {
  if (!readiness) return "Runtime unavailable.";
  const flags = readiness.integrations;
  return [
    `${label(readiness.environment ?? "unknown")} API`,
    readiness.reasoning_model ? `${readiness.reasoning_provider ?? "provider"} ${readiness.reasoning_model}` : `reasoning ${UNKNOWN.toLowerCase()}`,
    readiness.embedding_model ?? "no embeddings",
    `rev ${readiness.revision.slice(0, 7)}`,
    `storage ${readiness.storage}`,
    `Origami ${flags.origami ? "connected" : "not connected (leads labelled fictional)"}`,
    `delivery ${flags.email_delivery ? "on" : "off, nothing is sent"}`,
  ].join(" · ");
}

const speakerName = (speaker: string, rep: string | null) => (speaker === "rep" ? rep ?? "Rep" : speaker === "prospect" ? "Prospect" : speaker);
const money = (n: number) => `$${n.toLocaleString("en-AU")}`;

function fieldsPreview(extraction: ApiCallExtraction | null): BeatPreview | null {
  if (!extraction) return null;
  const { contact, deal } = extraction;
  const rows: { label: string; value: string; confidence: number }[] = [];
  if (contact.name?.value != null) {
    rows.push({ label: "Contact", value: [contact.name.value, contact.title?.value].filter((v) => v != null).join(" · "), confidence: contact.name.confidence });
  }
  if (deal.stage?.value != null) rows.push({ label: "Deal stage", value: label(String(deal.stage.value)), confidence: deal.stage.confidence });
  if (deal.amount?.value != null) rows.push({ label: "Value", value: typeof deal.amount.value === "number" ? money(deal.amount.value) : String(deal.amount.value), confidence: deal.amount.confidence });
  return rows.length ? { kind: "fields", rows } : null;
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

  const topLeads = leads ? [...leads].sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0)).slice(0, 3) : [];
  const queued = leads ? leads.filter((lead) => lead.status !== "rejected").length : 0;
  const approved = leads ? leads.filter((lead) => lead.status === "approved").length : 0;
  const sent = leads ? leads.filter((lead) => lead.status === "contacted").length : 0;

  const beats: Beat[] = [
    {
      n: "01",
      verb: "Listen",
      title: "One sales call",
      what: demoCall ? `${demoCall.subject.replace(/\s+[—–]\s+/g, " · ")}, ${demoCall.segments.length} turns${demoCall.duration_seconds ? `, ${mmss(demoCall.duration_seconds)}` : ""}.` : NOT_DERIVED,
      preview: demoCall?.segments.length
        ? { kind: "turns", turns: demoCall.segments.slice(0, 2).map((segment) => ({ key: segment.sequence, name: speakerName(segment.speaker, demoCall.rep), t: Math.round(segment.start_ms / 1000), text: segment.body })) }
        : null,
      provenance: "Recorded demo call",
      evidence: { label: "Transcript", href: demoHref },
    },
    {
      n: "02",
      verb: "Remember",
      title: "CRM writes itself",
      what: extractionBeat(demoExtraction),
      preview: fieldsPreview(demoExtraction),
      provenance: "Recorded demo call",
      evidence: { label: "Extracted fields", href: demoHref },
    },
    {
      n: "03",
      verb: "Respond",
      title: "Safe follow-up",
      what: draftBeat(demoExtraction),
      preview: demoExtraction
        ? {
            kind: "follow-up",
            title: demoExtraction.next_step ? `Next step kept: ${demoExtraction.next_step.description}` : "No dated next step on the call",
            lines: [`${demoExtraction.promises.length} promises checked · ${demoExtraction.grounding.dropped} dropped · ${demoExtraction.grounding.repaired} repaired`],
          }
        : null,
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
      preview: source
        ? { kind: "numbers", items: [{ label: "Calls analysed", value: String(source.calls) }, { label: "Won deals", value: String(wins ?? 0) }, { label: "Patterns", value: playbook ? String(playbook.patterns.length) : "None yet" }] }
        : null,
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
      preview: profile
        ? {
            kind: "icp",
            line: `${wins ?? 0} won deals → ${[profile.industries.slice(0, 2).join(", "), `${profile.headcount_band} staff`, profile.roles[0]].filter(Boolean).join(" · ")}`,
            companies: (evidence?.icp?.source_deals ?? []).slice(0, 3).map((deal) => deal.company_name),
          }
        : null,
      provenance: live,
      evidence: { label: "ICP profile", href: "/intelligence" },
    },
    {
      n: "06",
      verb: "Find",
      title: "Next search writes itself",
      what: evidence
        ? `Brief generated from the won-deal profile · ${evidence.lead_count} companies found${similarity ? ` · Similarity ${similarity}` : ""}.`
        : NOT_DERIVED,
      preview: topLeads.length
        ? { kind: "leads", leads: topLeads.map((lead) => ({ id: lead.id, company: lead.company_name, similarity: Math.round((lead.similarity_score ?? 0) * 100) })) }
        : null,
      provenance: live,
      evidence: { label: "Leads", href: "/leads" },
    },
    {
      n: "07",
      verb: "Execute",
      title: "Outreach stays controlled",
      what: leads
        ? `${queued} prospects queued · ${approved} approved · ${sent} sent.`
        : NOT_DERIVED,
      preview: leads
        ? { kind: "campaign", line: `${queued} queued · ${approved} approved · ${sent} sent`, state: readiness?.integrations.email_delivery ? "Waiting for approval" : "Nothing is sent" }
        : null,
      provenance: "Live guardrail",
      evidence: { label: "Leads", href: "/leads" },
    },
  ];

  // Illustrative scenarios, stated with their assumptions. Not measured results.
  const admin = rateScenario({ volume: 8, baselineRate: 10, scenarioRate: 0 });
  const deals = rateScenario({ volume: 40, baselineRate: 0.2, scenarioRate: 0.225 });
  const replies = rateScenario({ volume: 200, baselineRate: 0.05, scenarioRate: 0.06 });

  return {
    runtimeLine: runtimeLine(readiness),
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
