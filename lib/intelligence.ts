import {
  getIcpEvidenceInventory,
  getIcpFreshness,
  getLatestIcp,
  getLatestPlaybook,
  getScorecard,
  type ApiIcpEvidenceInventory,
  type ApiIcpFreshness,
  type ApiIcpProfile,
  type ApiPlaybook,
  type ApiScorecard,
} from "@/lib/api/slipstream";
import { fixtureConversationId, getFixtures, type ApiFixtureSummary } from "@/lib/api/intelligence";

// What the team learned from its calls, read back from the API: the ICP worked
// backwards from the won deals, and the behaviours behind them taken from the
// scorecards. Every number below is computed from a response, never a constant.

export type Tile = { label: string; value: string; line: string };

export type CallLink = { callId: string; href: string; company: string };

export type Quote = CallLink & { turn: number; text: string };

/* A behaviour measured across the cohort: won against the rest, with the quotes
   behind it. The API computes these now; the client recomputes them only when the
   API returns none. */
export type BehaviourPattern = {
  kind: "behaviour";
  key: string;
  behaviour: string;
  takeaway: string;
  won: { n: number; of: number };
  other: { n: number; of: number };
  quotes: Quote[];
};

/* What the judge noticed that the fixed behaviours do not cover. Its quotes carry
   no turn index, only the call they came from. */
export type AnalystPattern = {
  kind: "analyst";
  key: string;
  behaviour: string;
  whyItMatters: string;
  quotes: (CallLink & { text: string })[];
};

export type Pattern = BehaviourPattern | AnalystPattern;

export type Trigger = { label: string; count: number | null };

export type IcpRow = {
  attribute: string;
  label: string;
  value: string;
  deals: { id: string; company: string; href: string }[];
};

export type IcpView = {
  summary: string;
  confidence: number;
  wonDeals: number;
  rows: IcpRow[];
  sourceSummary: { deals: number; calls: number; emails: number; outcome_labelled: number } | null;
  freshness: { status: ApiIcpFreshness["status"]; reason: string } | null;
  inventory: ApiIcpEvidenceInventory | null;
};

export type Provenance = {
  rubricVersion: string | null;
  playbookModel: string | null;
  playbookGeneratedAt: string | null;
  profileVersion: number | null;
  cohortRevision: string | null;
  profileCreatedAt: string | null;
};

export type Intelligence = {
  tiles: Tile[];
  patterns: Pattern[];
  coachingFocus: string[];
  coachingSource: "playbook" | "scorecards" | null;
  triggers: Trigger[];
  icp: IcpView | null;
  provenance: Provenance;
  scoredCalls: number;
  unscoredFixtures: string[];
  needsDerive: boolean;
  errors: { icp: string | null; freshness: string | null; playbook: string | null; scorecards: string | null };
};

const DISCOVERY_FLOOR = 4;
const SCORED_OUTCOMES = ["won", "stalled", "lost", "no_show"] as const;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const firstName = (name: string) => name.split(" ")[0];
const reason = (error: unknown) => (error instanceof Error ? error.message : "Request failed");

const ATTRIBUTE_LABELS: Record<string, string> = {
  industry: "Industry",
  headcount_band: "Company size",
  contact_role: "Champion title",
  role: "Champion title",
  trigger: "Buying trigger",
};

function attributeValue(attribute: string, profile: ApiIcpProfile["profile"], why: string): string {
  switch (attribute) {
    case "industry":
      return profile.industries.join(" · ");
    case "headcount_band":
      return `${profile.headcount_band} staff`;
    case "contact_role":
    case "role":
      return profile.roles.join(" · ");
    case "trigger":
      return profile.triggers.join(" · ");
    default:
      return why;
  }
}

async function scorecardsFor(fixtures: ApiFixtureSummary[]): Promise<{ scorecards: ApiScorecard[]; missing: string[]; error: string | null }> {
  const results = await Promise.allSettled(fixtures.map((fixture) => getScorecard(fixture.call_id)));
  const scorecards: ApiScorecard[] = [];
  const missing: string[] = [];
  let error: string | null = null;
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      error ??= reason(result.reason);
      return;
    }
    if (result.value) scorecards.push(result.value);
    else if (!fixtures[index].demo) missing.push(fixtures[index].call_id);
  });
  return { scorecards, missing, error };
}

function buildTiles(scorecards: ApiScorecard[], fixtures: ApiFixtureSummary[]): Tile[] {
  const labelled = scorecards.filter((card) => card.outcome !== null);
  const won = labelled.filter((card) => card.outcome === "won");
  const other = labelled.filter((card) => card.outcome !== "won");
  // The fallback labels describe the same history the ICP is derived from: the demo call is not part of it.
  const history = fixtures.filter((fixture) => !fixture.demo);
  const fixtureWon = history.filter((fixture) => fixture.outcome === "won");

  const counts = Object.fromEntries(SCORED_OUTCOMES.map((outcome) => [outcome, labelled.filter((card) => card.outcome === outcome).length]));
  const byRep = [...new Set(scorecards.map((card) => card.rep))].map((rep) => `${firstName(rep)} ${scorecards.filter((card) => card.rep === rep).length}`);

  const analysed: Tile = {
    label: "Calls analysed",
    value: String(scorecards.length),
    line: scorecards.length
      ? byRep.join(" · ")
      : `${history.length} calls in the history, none scored yet`,
  };

  const winRate: Tile = labelled.length
    ? {
        label: "Win rate",
        value: pct(won.length / labelled.length),
        line: `${counts.won} won · ${counts.stalled} stalled · ${counts.lost} lost · ${counts.no_show} no-show`,
      }
    : {
        label: "Win rate",
        value: history.length ? pct(fixtureWon.length / history.length) : "—",
        line: `From the ${history.length} fixture labels, no scorecards yet`,
      };

  const nextStep: Tile = won.length
    ? {
        label: "Dated next step in wins",
        value: `${won.filter((card) => card.next_step_secured).length} of ${won.length}`,
        line: `${other.filter((card) => card.next_step_secured).length} of ${other.length} elsewhere`,
      }
    : {
        label: "Dated next step in wins",
        value: `— of ${fixtureWon.length}`,
        line: `${fixtureWon.length} wins in the fixture labels, none scored yet`,
      };

  return [analysed, winRate, nextStep];
}

type CallLinks = { companies: Map<string, string>; hrefs: Map<string, string> };

async function callLinks(fixtures: ApiFixtureSummary[]): Promise<CallLinks> {
  return {
    companies: new Map(fixtures.map((fixture) => [fixture.call_id, fixture.company])),
    hrefs: new Map(await Promise.all(fixtures.map(async (fixture) => [fixture.call_id, `/calls/${await fixtureConversationId(fixture.call_id)}`] as const))),
  };
}

function linkFor(links: CallLinks, callId: string): CallLink {
  return { callId, href: links.hrefs.get(callId) ?? "/conversations", company: links.companies.get(callId) ?? callId };
}

/* The behaviours the API computed, the source whenever it returns any. */
function apiPatterns(behaviours: NonNullable<ApiPlaybook["behaviours"]>, links: CallLinks): BehaviourPattern[] {
  return behaviours.map((item) => ({
    kind: "behaviour",
    key: item.key,
    behaviour: item.behaviour,
    takeaway: item.takeaway,
    won: item.won,
    other: item.other,
    quotes: item.quotes.map((quote) => ({ ...linkFor(links, quote.call_id), turn: quote.turn_index, text: quote.quote })),
  }));
}

/* The judge's own patterns, shown beside the measured ones rather than instead of
   them: it cites quotes, not counts. */
function analystPatterns(patterns: ApiPlaybook["patterns"], links: CallLinks): AnalystPattern[] {
  return patterns.map((item, index) => ({
    kind: "analyst",
    key: `analyst-${index}-${item.behaviour}`,
    behaviour: item.behaviour,
    whyItMatters: item.why_it_matters,
    quotes: item.quotes.map((text, position) => ({ ...linkFor(links, item.call_ids[position] ?? item.call_ids[0]), text })),
  }));
}

function buildPatterns(scorecards: ApiScorecard[], links: CallLinks): BehaviourPattern[] {
  const labelled = scorecards.filter((card) => card.outcome !== null);
  const won = labelled.filter((card) => card.outcome === "won");
  const other = labelled.filter((card) => card.outcome !== "won");
  if (!labelled.length) return [];

  const quote = (card: ApiScorecard, evidence: { turn_index: number; quote: string } | undefined): Quote | null => {
    const key = card.source_external_id ?? card.call_id;
    return evidence ? { ...linkFor(links, key), turn: evidence.turn_index, text: evidence.quote } : null;
  };

  const rate = (cards: ApiScorecard[], test: (card: ApiScorecard) => boolean) => (cards.length ? cards.filter(test).length / cards.length : 0);

  const behaviours: { key: string; behaviour: string; test: (card: ApiScorecard) => boolean; takeaway: string; quote: (card: ApiScorecard) => Quote | null }[] = [
    {
      key: "dated-next-step",
      behaviour: "Secured a dated next step",
      test: (card) => card.next_step_secured,
      takeaway: `Won calls booked the next step ${pct(rate(won, (card) => card.next_step_secured))} of the time, the rest ${pct(rate(other, (card) => card.next_step_secured))}.`,
      quote: (card) => quote(card, card.next_step_evidence ?? undefined),
    },
    {
      key: `discovery-floor-${DISCOVERY_FLOOR}`,
      behaviour: `${DISCOVERY_FLOOR} or more discovery questions`,
      test: (card) => card.discovery_questions >= DISCOVERY_FLOOR,
      takeaway: `Won calls asked ${mean(won.map((card) => card.discovery_questions)).toFixed(1)} discovery questions on average, the rest ${mean(other.map((card) => card.discovery_questions)).toFixed(1)}.`,
      quote: (card) => quote(card, card.discovery_evidence[0]),
    },
    {
      key: "objection-handled",
      behaviour: "Objection handled on the call",
      test: (card) => card.objection_handling === "handled",
      takeaway: `Won calls answered the objection outright ${pct(rate(won, (card) => card.objection_handling === "handled"))} of the time, the rest ${pct(rate(other, (card) => card.objection_handling === "handled"))}.`,
      quote: (card) => quote(card, card.objection_evidence[0]),
    },
    {
      key: "healthy-talk-ratio",
      behaviour: "Rep talk ratio in the healthy band",
      test: (card) => card.talk_ratio_band === "healthy",
      takeaway: `Winning reps spoke ${pct(mean(won.map((card) => card.rep_talk_ratio)))} of the call, the rest ${pct(mean(other.map((card) => card.rep_talk_ratio)))}.`,
      quote: () => null,
    },
  ];

  return behaviours.map((behaviour) => ({
    kind: "behaviour" as const,
    key: behaviour.key,
    behaviour: behaviour.behaviour,
    takeaway: behaviour.takeaway,
    won: { n: won.filter(behaviour.test).length, of: won.length },
    other: { n: other.filter(behaviour.test).length, of: other.length },
    quotes: won
      .filter(behaviour.test)
      .map(behaviour.quote)
      .filter((item): item is Quote => item !== null)
      .slice(0, 2),
  }));
}

function coachingFrom(playbook: ApiPlaybook | null, scorecards: ApiScorecard[]): { lines: string[]; source: Intelligence["coachingSource"] } {
  if (playbook?.coaching_focus.length) return { lines: playbook.coaching_focus.slice(0, 3), source: "playbook" };
  const weak = scorecards.filter((card) => card.outcome === "lost" || card.outcome === "stalled");
  const tally = new Map<string, number>();
  for (const card of weak) for (const line of card.to_improve) tally.set(line, (tally.get(line) ?? 0) + 1);
  const lines = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([line]) => line);
  return { lines, source: lines.length ? "scorecards" : null };
}

async function buildIcp(
  profile: ApiIcpProfile,
  freshness: ApiIcpFreshness | null,
  inventory: ApiIcpEvidenceInventory | null,
): Promise<IcpView> {
  const sourceDeals = new Map((profile.source_deals ?? []).map((deal) => [deal.deal_id, deal]));
  const rows = await Promise.all(
    profile.evidence.map(async (item) => ({
      attribute: item.attribute,
      label: ATTRIBUTE_LABELS[item.attribute] ?? item.attribute.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
      value: attributeValue(item.attribute, profile.profile, item.why),
      deals: await Promise.all(
        item.deal_ids
          .map((dealId) => sourceDeals.get(dealId))
          .filter((deal): deal is NonNullable<typeof deal> => deal != null)
          .map(async (deal) => ({
            id: deal.deal_id,
            company: deal.company_name,
            href: deal.call_ids[0] ? `/calls/${await fixtureConversationId(deal.call_ids[0])}` : "/conversations",
          })),
      ),
    })),
  );

  return {
    summary: profile.profile.summary,
    confidence: profile.profile.confidence,
    wonDeals: (profile.source_deals ?? []).length,
    rows,
    sourceSummary: profile.profile.source_summary ?? null,
    freshness: freshness ? { status: freshness.status, reason: freshness.reason } : null,
    inventory,
  };
}

export async function getIntelligence(): Promise<Intelligence> {
  const [icpResult, inventoryResult, freshnessResult, playbookResult, fixturesResult] = await Promise.allSettled([
    getLatestIcp(),
    getIcpEvidenceInventory(),
    getIcpFreshness(),
    getLatestPlaybook(),
    getFixtures(),
  ]);

  const profile = icpResult.status === "fulfilled" ? icpResult.value : null;
  const inventory = inventoryResult.status === "fulfilled" ? inventoryResult.value : null;
  const freshness = freshnessResult.status === "fulfilled" ? freshnessResult.value : null;
  const playbook = playbookResult.status === "fulfilled" ? playbookResult.value : null;
  const fixtures = fixturesResult.status === "fulfilled" ? fixturesResult.value : [];

  const { scorecards, missing, error: scorecardError } = fixtures.length
    ? await scorecardsFor(fixtures)
    : { scorecards: [] as ApiScorecard[], missing: [] as string[], error: null };

  const links = await callLinks(fixtures);
  const derivedBehaviours = playbook?.behaviours ?? [];
  const patterns: Pattern[] = [
    ...(derivedBehaviours.length ? apiPatterns(derivedBehaviours, links) : buildPatterns(scorecards, links)),
    ...analystPatterns(playbook?.patterns ?? [], links),
  ];

  const coaching = coachingFrom(playbook, scorecards);
  const errors = {
    icp: icpResult.status === "rejected" ? reason(icpResult.reason) : null,
    freshness: freshnessResult.status === "rejected" ? reason(freshnessResult.reason) : null,
    playbook: playbookResult.status === "rejected" ? reason(playbookResult.reason) : null,
    scorecards:
      fixturesResult.status === "rejected" ? reason(fixturesResult.reason) : scorecardError,
  };

  return {
    tiles: buildTiles(scorecards, fixtures),
    patterns,
    coachingFocus: coaching.lines,
    coachingSource: coaching.source,
    triggers: (profile?.profile.triggers ?? []).map((label) => ({ label, count: null })),
    icp: profile ? await buildIcp(profile, freshness, inventory) : null,
    provenance: {
      rubricVersion: playbook?.sources[0]?.rubric_version ?? scorecards[0]?.rubric_version ?? null,
      playbookModel: playbook?.model ?? null,
      playbookGeneratedAt: playbook?.generated_at ?? null,
      profileVersion: profile?.version ?? null,
      cohortRevision: profile?.profile.cohort_revision ?? null,
      profileCreatedAt: (profile as (ApiIcpProfile & { created_at?: string | null }) | null)?.created_at ?? null,
    },
    scoredCalls: scorecards.length,
    unscoredFixtures: missing,
    needsDerive: !profile || !playbook || scorecards.length === 0,
    errors,
  };
}
