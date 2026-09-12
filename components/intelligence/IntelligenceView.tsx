"use client";

import { AlertCircle, ArrowRightLeft, CheckCircle2, ListChecks, Loader2, MessageSquareWarning, Mic, Server, Target, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { defaultBrief } from "@/lib/data/brief";
import { API_BASE_URL, getLatestIcp, getReadiness, type ApiIcpProfile, type ApiReadiness } from "@/lib/api/slipstream";
import type { Intelligence } from "@/lib/types/intelligence";
import { IntelligenceHeader } from "./IntelligenceHeader";
import { BriefCard, DerivedIcp, NextSteps, Objections, TalkRatio, Tiles, TrainingLens, Triggers } from "./sections";

const QUICK_LINKS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "patterns", label: "Win patterns", icon: ArrowRightLeft },
  { id: "icp", label: "Derived ICP", icon: Target },
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
    objections: ["objections", ...data.objections.map((o) => `${o.text} ${o.call.company}`)].join(" "),
    "talk-ratio": ["talk ratio", ...data.talkRatios.map((t) => `${t.call.company} ${t.rep}`)].join(" "),
    "next-steps": ["next steps", ...data.nextSteps.map((n) => `${n.description} ${n.call.company}`)].join(" "),
    triggers: ["triggers", ...data.triggers.map((t) => t.label)].join(" "),
    brief: `origami brief find more like these ${brief}`,
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
  const currentProfileState = profileState.data === data ? profileState : { data, status: "checking" as const };
  const currentReadinessState = readinessState.data === data ? readinessState : { data, status: "checking" as const };
  const liveProfile = currentProfileState.status === "live" ? currentProfileState.profile : null;
  const displayData = useMemo(() => {
    if (!liveProfile) return data;
    const knownCalls = new Map(
      data.icp.attributes.flatMap((attribute) => attribute.evidence).map((item) => [item.id, item]),
    );
    const evidenceFor = (...terms: string[]) => liveProfile.evidence
      .filter((item) => terms.some((term) => item.attribute.toLowerCase().includes(term)))
      .flatMap((item) => item.deal_ids)
      .map((id) => knownCalls.get(id))
      .filter((item) => item != null);
    return {
      ...data,
      icpVersion: liveProfile.version,
      confidence: Math.round(liveProfile.profile.confidence * 100),
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
  const brief = liveProfile?.profile.origami_brief ?? defaultBrief;
  const text = useMemo(() => sectionText(displayData, brief), [displayData, brief]);
  const q = query.trim().toLowerCase();
  const show = (id: string) => !q || text[id]?.toLowerCase().includes(q);
  const visibleCount = Object.keys(text).filter(show).length;

  useEffect(() => {
    let cancelled = false;
    getLatestIcp()
      .then((profile) => {
        if (cancelled) return;
        setProfileState(profile ? { data, status: "live", profile } : { data, status: "missing" });
      })
      .catch((error) => {
        if (cancelled) return;
        setProfileState({ data, status: "error", message: error instanceof Error ? error.message : "Analysis service unavailable" });
      });
    getReadiness()
      .then((readiness) => { if (!cancelled) setReadinessState({ data, status: "ready", readiness }); })
      .catch(() => { if (!cancelled) setReadinessState({ data, status: "error" }); });
    return () => { cancelled = true; };
  }, [data]);

  const evaluationLabel = `${data.callsAnalysed}-call labelled evaluation`;
  const readiness = currentReadinessState.status === "ready" ? currentReadinessState.readiness : null;
  const configured = readiness?.integrations.openrouter === true || readiness?.integrations.anthropic === true
    ? true
    : readiness?.integrations.openrouter === false && readiness?.integrations.anthropic === false
      ? false
      : null;
  const revision = readiness ? `${readiness.revision.slice(0, 7)} connected` : currentReadinessState.status === "error" ? "API health unavailable" : "checking API health";
  const sourceNote = currentProfileState.status === "live"
    ? `ICP v${currentProfileState.profile.version} and Origami brief loaded live · all other sections remain the ${evaluationLabel} · ${revision}`
    : currentProfileState.status === "missing"
      ? `${revision} · no stored ICP yet${configured === false ? " · model key not configured" : ""} · showing the ${evaluationLabel}`
      : currentProfileState.status === "error"
        ? `${currentProfileState.message} · showing the ${evaluationLabel} · ${revision}`
        : `Showing the ${evaluationLabel} while checking for a stored live ICP · ${revision}`;

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
    <div className="px-11 pt-[34px] pb-16">
      <IntelligenceHeader query={query} onQuery={setQuery} />

      <div role="status" aria-atomic="true" className="mt-7 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-[14px]">
        {currentProfileState.status === "checking" ? <Loader2 className="size-4 animate-spin text-primary" /> : currentProfileState.status === "live" ? <CheckCircle2 className="size-4 text-primary" /> : currentProfileState.status === "error" ? <AlertCircle className="size-4 text-destructive" /> : <Server className="size-4 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{currentProfileState.status === "live" ? "Live ICP + labelled evaluation analysis" : "Labelled evaluation analysis"}</p>
          <p className="text-[12px] text-muted-foreground">{sourceNote}</p>
        </div>
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
      <div className="mt-4 grid grid-cols-6 gap-5">
        {QUICK_LINKS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => jump(id)}
            className="flex h-[76px] items-center gap-4 rounded-xl border border-border/70 bg-page px-6 text-left text-[20px] font-semibold text-foreground transition-colors hover:border-foreground/20 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
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
          {show("patterns") && <TrainingLens data={displayData} active={active} />}
          {show("icp") && <DerivedIcp data={displayData} active={active} />}
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
