"use client";

import { AlertCircle, ArrowRightLeft, CheckCircle2, ListChecks, Loader2, MessageSquareWarning, Mic, Server, Target, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/legacy/ui/button";
import { defaultBrief } from "@/lib/legacy/data/brief";
import { API_BASE_URL, derivePlaybook, getIcpEvidenceInventory, getIcpFreshness, getLatestIcp, getLatestPlaybook, getReadiness, getScorecard, type ApiIcpEvidenceInventory, type ApiIcpFreshness, type ApiIcpProfile, type ApiPlaybook, type ApiReadiness, type ApiScorecard } from "@/lib/api/slipstream";
import type { Intelligence } from "@/lib/legacy/types/intelligence";
import { IntelligenceHeader } from "./IntelligenceHeader";
import { BriefCard, DerivedIcp, NextSteps, Objections, RevenueDna, TalkRatio, Tiles, TrainingLens, Triggers } from "./sections";

const QUICK_LINKS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "patterns", label: "Win patterns", icon: ArrowRightLeft },
  { id: "icp", label: "Derived ICP", icon: Target },
  { id: "revenue-dna", label: "Revenue DNA", icon: Zap },
  { id: "objections", label: "Objections", icon: MessageSquareWarning },
  { id: "talk-ratio", label: "Talk ratio", icon: Mic },
  { id: "next-steps", label: "Next steps", icon: ListChecks },
  { id: "triggers", label: "Triggers", icon: Zap },
];

/** Searchable text per section, so the header search can hide the ones that don't match. */
function sectionText(data: Intelligence, brief: string): Record<string, string> {
  return {
    patterns: ["won-deal patterns training lens", ...data.lens.map((l) => `${l.label} ${l.takeaway}`)].join(" "),
    icp: ["derived icp ideal customer profile", data.icp.summary, ...data.icp.attributes.map((a) => `${a.label} ${a.value} ${a.evidence.map((e) => e.company).join(" ")}`)].join(" "),
    "revenue-dna": "revenue dna continuous outcome learning targeting fingerprint stale rescore leads",
    objections: ["objections", ...data.objections.map((o) => `${o.text} ${o.call.company}`)].join(" "),
    "talk-ratio": ["talk ratio", ...data.talkRatios.map((t) => `${t.call.company} ${t.rep}`)].join(" "),
    "next-steps": ["next steps", ...data.nextSteps.map((n) => `${n.description} ${n.call.company}`)].join(" "),
    triggers: ["triggers", ...data.triggers.map((t) => t.label)].join(" "),
    brief: `lead search brief openrouter find more like these ${brief}`,
  };
}

export function IntelligenceView({ data }: { data: Intelligence }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>();
  const [profileState, setProfileState] = useState<
    { data: Intelligence; status: "checking" | "missing" } |
    { data: Intelligence; status: "live"; profile: ApiIcpProfile } |
    { data: Intelligence; status: "error"; message: string }
  >({ data, status: "checking" });
  const [readinessState, setReadinessState] = useState<
    { data: Intelligence; status: "checking" | "error" } |
    { data: Intelligence; status: "ready"; readiness: ApiReadiness }
  >({ data, status: "checking" });
  const [inventoryState, setInventoryState] = useState<
    { data: Intelligence; status: "checking" | "error" } |
    { data: Intelligence; status: "live"; inventory: ApiIcpEvidenceInventory }
  >({ data, status: "checking" });
  const [freshnessState, setFreshnessState] = useState<
    { data: Intelligence; status: "checking" | "missing" | "error" } |
    { data: Intelligence; status: "live"; freshness: ApiIcpFreshness }
  >({ data, status: "checking" });
  const [playbookState, setPlaybookState] = useState<
    { data: Intelligence; status: "checking" | "missing" } |
    { data: Intelligence; status: "available" | "generating"; scorecards: ApiScorecard[] } |
    { data: Intelligence; status: "live"; playbook: ApiPlaybook } |
    { data: Intelligence; status: "error"; message: string }
  >({ data, status: "checking" });
  const playbookControllerRef = useRef<AbortController>(null);
  const currentProfileState = profileState.data === data ? profileState : { data, status: "checking" as const };
  const currentReadinessState = readinessState.data === data ? readinessState : { data, status: "checking" as const };
  const currentInventoryState = inventoryState.data === data ? inventoryState : { data, status: "checking" as const };
  const currentFreshnessState = freshnessState.data === data ? freshnessState : { data, status: "checking" as const };
  const currentPlaybookState = playbookState.data === data ? playbookState : { data, status: "checking" as const };
  const liveProfile = currentProfileState.status === "live" ? currentProfileState.profile : null;
  const profileData = useMemo(() => {
    if (!liveProfile) return data;
    const knownCalls = new Map(
      [
        ...data.talkRatios.map((item) => item.call),
        ...data.icp.attributes.flatMap((attribute) => attribute.evidence),
      ].map((item) => [item.id, item]),
    );
    const sourceCalls = new Map<string, Array<{ id: string; company: string }>>();
    for (const deal of liveProfile.source_deals ?? []) {
      sourceCalls.set(
        deal.deal_id,
        deal.call_ids.flatMap((callId) => {
          const call = knownCalls.get(callId);
          return call ? [{ ...call, company: deal.company_name }] : [];
        }),
      );
    }
    const evidenceFor = (...terms: string[]) => {
      const legacyResponse = liveProfile.source_deals === undefined;
      const calls = liveProfile.evidence
        .filter((item) => terms.some((term) => item.attribute.toLowerCase().includes(term)))
        .flatMap((item) => item.deal_ids)
        .flatMap((id) => {
          const resolved = sourceCalls.get(id);
          if (resolved) return resolved;
          const legacyCall = legacyResponse ? knownCalls.get(id) : undefined;
          return legacyCall ? [legacyCall] : [];
        });
      return [...new Map(calls.map((call) => [call.id, call])).values()];
    };
    return {
      ...data,
      icpVersion: liveProfile.version,
      confidence: Math.round(liveProfile.profile.confidence * 100),
      sourceSummary: liveProfile.profile.source_summary ? {
        deals: liveProfile.profile.source_summary.deals,
        calls: liveProfile.profile.source_summary.calls,
        emails: liveProfile.profile.source_summary.emails,
        outcomeLabelled: liveProfile.profile.source_summary.outcome_labelled,
      } : null,
      icp: {
        summary: liveProfile.profile.summary,
        attributes: [
          { label: "Industry", value: liveProfile.profile.industries.join(", ") || "Not established", evidence: evidenceFor("industry") },
          { label: "Company size", value: liveProfile.profile.headcount_band || "Not established", evidence: evidenceFor("headcount", "size") },
          { label: "Champion title", value: liveProfile.profile.roles.join(", ") || "Not established", evidence: evidenceFor("role", "title") },
          { label: "Buying trigger", value: liveProfile.profile.triggers.join(", ") || "Not established", evidence: evidenceFor("trigger") },
        ],
      },
    };
  }, [data, liveProfile]);
  const livePlaybook = currentPlaybookState.status === "live" ? currentPlaybookState.playbook : null;
  const displayData = useMemo(() => {
    if (!livePlaybook) return profileData;
    const won = livePlaybook.stats.find((item) => item.outcome_group === "won");
    const notWon = livePlaybook.stats.find((item) => item.outcome_group === "not_won");
    if (!won || !notWon) return profileData;
    const pct = (value: number) => `${Math.round(value * 100)}%`;
    return {
      ...profileData,
      lens: [
        { label: "Secured a dated next step", wins: { value: pct(won.next_step_rate), share: won.next_step_rate }, others: { value: pct(notWon.next_step_rate), share: notWon.next_step_rate }, takeaway: "Live rubric result for stored won and not-won scorecards." },
        { label: "Discovery questions before pricing", wins: { value: `${won.mean_discovery.toFixed(1)} avg`, share: Math.min(1, won.mean_discovery / 6) }, others: { value: `${notWon.mean_discovery.toFixed(1)} avg`, share: Math.min(1, notWon.mean_discovery / 6) }, takeaway: "Live mean of transcript-grounded discovery questions." },
        { label: "Objection handled", wins: { value: pct(won.objection_handled_rate), share: won.objection_handled_rate }, others: { value: pct(notWon.objection_handled_rate), share: notWon.objection_handled_rate }, takeaway: "Live rate of objections judged handled with evidence." },
        { label: "Rep talk ratio", wins: { value: pct(won.mean_talk_ratio), share: won.mean_talk_ratio }, others: { value: pct(notWon.mean_talk_ratio), share: notWon.mean_talk_ratio }, takeaway: "Live deterministic word-share mean by outcome." },
      ],
    };
  }, [livePlaybook, profileData]);
  const brief = liveProfile?.profile.origami_brief ?? defaultBrief;
  const text = useMemo(() => sectionText(displayData, brief), [displayData, brief]);
  const q = query.trim().toLowerCase();
  const show = (id: string) => !q || text[id]?.toLowerCase().includes(q);
  const visibleCount = Object.keys(text).filter(show).length;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    getLatestIcp()
      .then((profile) => {
        if (cancelled) return;
        setProfileState(profile ? { data, status: "live", profile } : { data, status: "missing" });
      })
      .catch((error) => {
        if (cancelled) return;
        setProfileState({ data, status: "error", message: error instanceof Error ? error.message : "Analysis service unavailable" });
      });
    getIcpEvidenceInventory(controller.signal)
      .then((inventory) => {
        if (!cancelled) setInventoryState({ data, status: "live", inventory });
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) setInventoryState({ data, status: "error" });
      });
    getIcpFreshness(controller.signal)
      .then((freshness) => {
        if (!cancelled) setFreshnessState(freshness ? { data, status: "live", freshness } : { data, status: "missing" });
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) setFreshnessState({ data, status: "error" });
      });
    getReadiness()
      .then(async (readiness) => {
        if (cancelled) return;
        setReadinessState({ data, status: "ready", readiness });
        try {
          const storedPlaybook = await getLatestPlaybook(controller.signal);
          if (cancelled) return;
          if (storedPlaybook) {
            setPlaybookState({ data, status: "live", playbook: storedPlaybook });
            return;
          }
          const judgeConfigured = readiness.integrations.openrouter === true || readiness.integrations.openai === true || readiness.integrations.anthropic === true;
          if (!judgeConfigured) {
            setPlaybookState({ data, status: "missing" });
            return;
          }
          const scorecards = (await Promise.all(data.talkRatios.map((item) => getScorecard(item.call.id, controller.signal)))).filter((item) => item != null);
          if (cancelled) return;
          const eligible = scorecards.filter((item) => item.outcome === "won" || item.outcome === "lost" || item.outcome === "stalled");
          const hasWon = eligible.some((item) => item.outcome === "won");
          const hasNotWon = eligible.some((item) => item.outcome === "lost" || item.outcome === "stalled");
          if (eligible.length < 2 || !hasWon || !hasNotWon || new Set(eligible.map((item) => item.call_id)).size !== eligible.length || new Set(eligible.map((item) => item.rubric_version)).size !== 1) {
            if (!cancelled) setPlaybookState({ data, status: "missing" });
            return;
          }
          setPlaybookState({ data, status: "available", scorecards: eligible });
        } catch (error) {
          if (!cancelled) setPlaybookState({ data, status: "error", message: error instanceof Error ? error.message : "Playbook service unavailable" });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setReadinessState({ data, status: "error" });
        setPlaybookState({ data, status: "error", message: "API health unavailable" });
      });
    return () => { cancelled = true; controller.abort(); };
  }, [data]);

  useEffect(() => () => {
    playbookControllerRef.current?.abort();
    playbookControllerRef.current = null;
  }, [data]);

  const generatePlaybook = async () => {
    if (currentPlaybookState.status !== "available") return;
    const scorecards = currentPlaybookState.scorecards;
    playbookControllerRef.current?.abort();
    const controller = new AbortController();
    playbookControllerRef.current = controller;
    setPlaybookState({ data, status: "generating", scorecards });
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 45_000);
    try {
      const playbook = await derivePlaybook(scorecards, controller.signal);
      if (playbookControllerRef.current === controller && !controller.signal.aborted) setPlaybookState({ data, status: "live", playbook });
    } catch (error) {
      if (playbookControllerRef.current !== controller || controller.signal.aborted && !timedOut) return;
      setPlaybookState({ data, status: "error", message: timedOut ? "Playbook generation timed out" : error instanceof Error ? error.message : "Playbook service unavailable" });
    } finally {
      window.clearTimeout(timeout);
      if (playbookControllerRef.current === controller) playbookControllerRef.current = null;
    }
  };

  const evaluationLabel = `${data.callsAnalysed}-call labelled evaluation`;
  const readiness = currentReadinessState.status === "ready" ? currentReadinessState.readiness : null;
  const configured = readiness?.integrations.openrouter === true || readiness?.integrations.openai === true || readiness?.integrations.anthropic === true
    ? true
    : readiness?.integrations.openrouter === false && readiness?.integrations.openai === false && readiness?.integrations.anthropic === false
      ? false
      : null;
  const revision = readiness ? `${readiness.revision.slice(0, 7)} connected` : currentReadinessState.status === "error" ? "API health unavailable" : "checking API health";
  const playbookNote = currentPlaybookState.status === "live"
    ? `win-pattern lens loaded live from stored scorecards (${currentPlaybookState.playbook.model}); all other coaching sections remain the ${evaluationLabel}`
    : currentPlaybookState.status === "error"
      ? `live playbook unavailable (${currentPlaybookState.message})`
      : currentPlaybookState.status === "checking"
        ? "checking for a live playbook"
        : currentPlaybookState.status === "available"
          ? `${currentPlaybookState.scorecards.length} revision-pinned scorecards are ready for explicit playbook generation; the page has not spent model credits`
          : currentPlaybookState.status === "generating"
            ? "generating a live win-pattern lens from stored scorecards"
        : `win-pattern lens remains the ${evaluationLabel}`;
  const liveLensMeta = livePlaybook
    ? `${livePlaybook.stats.reduce((sum, item) => sum + item.calls, 0)} stored scorecards · live ${livePlaybook.model}`
    : undefined;
  const profileNote = currentProfileState.status === "live"
    ? `ICP v${currentProfileState.profile.version} and lead-search brief loaded live · ${playbookNote} · ${revision}`
    : currentProfileState.status === "missing"
      ? `${revision} · no stored ICP yet${configured === false ? " · model key not configured" : ""} · ${playbookNote}`
    : currentProfileState.status === "error"
        ? `${currentProfileState.message} · ${playbookNote} · ${revision}`
        : `Showing the ${evaluationLabel} while checking for a stored live ICP · ${playbookNote} · ${revision}`;
  const inventoryNote = currentInventoryState.status === "live"
    ? `${currentInventoryState.inventory.calls} calls + ${currentInventoryState.inventory.emails} emails across ${currentInventoryState.inventory.deals} deals within the ICP model budget${currentInventoryState.inventory.ready_to_derive ? " · sufficient evidence for derivation" : " · needs two won deals before derivation"}`
    : currentInventoryState.status === "error"
      ? "stored evidence inventory unavailable"
      : "checking stored call/email evidence";
  const sourceNote = `${profileNote} · ${inventoryNote}`;

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => setActive(undefined), 1600);
    return () => window.clearTimeout(t);
  }, [active]);

  const jump = (id: string) => {
    setQuery("");
    setActive(id);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="px-4 pt-6 pb-12 sm:px-11 sm:pt-[34px] sm:pb-16">
      <IntelligenceHeader query={query} onQuery={setQuery} />

      <div role="status" aria-atomic="true" className="mt-5 flex flex-col items-start gap-3 rounded-legacy-lg border border-border bg-card px-4 py-3 text-[14px] sm:mt-7 sm:flex-row sm:items-center">
        {currentProfileState.status === "checking" ? <Loader2 className="size-4 animate-spin text-primary" /> : currentProfileState.status === "live" ? <CheckCircle2 className="size-4 text-primary" /> : currentProfileState.status === "error" ? <AlertCircle className="size-4 text-destructive" /> : <Server className="size-4 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{currentProfileState.status === "live" || currentPlaybookState.status === "live" ? "Live intelligence + labelled evaluation analysis" : currentInventoryState.status === "live" ? "Stored evidence + labelled evaluation analysis" : "Labelled evaluation analysis"}</p>
          <p className="text-[12px] text-muted-foreground">{sourceNote}</p>
        </div>
        {currentPlaybookState.status === "available" && <Button variant="outline" className="h-9 shrink-0 text-[12px]" onClick={() => void generatePlaybook()}>Generate live playbook</Button>}
        {currentPlaybookState.status === "generating" && <Button variant="outline" className="h-9 shrink-0 text-[12px]" disabled><Loader2 className="size-3.5 animate-spin" /> Generating…</Button>}
        <a href={`${API_BASE_URL}/ready`} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-muted-foreground hover:text-foreground">API status</a>
      </div>

      {data.callsAnalysed === 0 && !liveProfile ? (
        <p className="mt-32 text-center text-[15px] text-muted-foreground">Nothing analysed yet. Add a call and the patterns appear here.</p>
      ) : data.callsAnalysed === 0 ? (
        <div className="mt-[42px] flex flex-col gap-6">
          {!show("icp") && !show("brief") ? (
            <p className="mt-24 text-center text-[15px] text-muted-foreground">Nothing matches “{query}”.</p>
          ) : <>
            {show("icp") && <DerivedIcp data={displayData} />}
            {show("brief") && <BriefCard key={brief} brief={brief} />}
          </>}
        </div>
      ) : <>
      <p className="mt-[42px] text-[17px] font-semibold text-foreground">Quick links</p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-7">
        {QUICK_LINKS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => jump(id)}
            className="flex h-[68px] min-w-0 items-center gap-3 rounded-legacy-xl border border-border/70 bg-page px-4 text-left text-[16px] font-semibold text-foreground transition-colors hover:border-foreground/20 hover:bg-legacy-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:h-[76px] sm:gap-4 sm:px-6 sm:text-[20px]"
          >
            <Icon className="size-7 shrink-0 text-primary" strokeWidth={1.75} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {visibleCount === 0 ? (
        <p className="mt-24 text-center text-[15px] text-muted-foreground">Nothing matches “{query}”.</p>
      ) : (
        <div className="mt-[42px] flex flex-col gap-6">
          {!q && <Tiles data={displayData} />}
          {show("patterns") && <TrainingLens data={displayData} active={active} meta={liveLensMeta} />}
          {show("icp") && <DerivedIcp data={displayData} active={active} />}
          {show("revenue-dna") && <RevenueDna freshness={currentFreshnessState.status === "live" ? currentFreshnessState.freshness : null} status={currentFreshnessState.status} active={active} />}
          {show("objections") && <Objections data={displayData} active={active} />}
          {show("talk-ratio") && <TalkRatio data={displayData} active={active} />}
          {show("next-steps") && <NextSteps data={displayData} active={active} />}
          {show("triggers") && <Triggers data={displayData} active={active} />}
          {show("brief") && <BriefCard key={brief} brief={brief} active={active} />}
        </div>
      )}
      </>}
    </div>
  );
}
