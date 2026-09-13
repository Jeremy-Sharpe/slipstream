"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActionBar } from "@/components/legacy/leads/ActionBar";
import { FiltersPanel, applyFilters, defaultFilterState, useFiltersPanelState, type FilterState } from "@/components/legacy/leads/FiltersPanel";
import { LeadTable } from "@/components/legacy/leads/LeadTable";
import { ResultBar } from "@/components/legacy/leads/ResultBar";
import { TopBar } from "@/components/legacy/leads/TopBar";
import { ApiError, approveLeadOutreach, bootstrapDemo, draftLeadOutreach, getLatestIcp, getLeads, getLeadSourceStatus, getReadiness, sourceLeads, type ApiIcpProfile, type ApiLead, type ApiOutreachDraft } from "@/lib/api/slipstream";
import { defaultBrief } from "@/lib/legacy/data/brief";
import { leads as seed } from "@/lib/legacy/data/leads";
import type { Draft, Lead, LeadStatus } from "@/lib/legacy/types";

const WON_DEALS = 5;
const TERMINAL_SEARCH_STATES = new Set(["succeeded", "failed", "cancelled"]);
const EVALUATION_LEADS: Lead[] = seed.map((lead) => ({
  ...lead,
  source: "evaluation",
  draft: lead.draft ? { ...lead.draft, source: "evaluation" } : null,
}));

function percentage(value: number | null): number | null {
  return value == null ? null : Math.max(0, Math.min(100, Math.round(value * 100)));
}

function uiStatus(status: ApiLead["status"]): LeadStatus {
  if (status === "reviewed") return "drafted";
  if (status === "approved" || status === "contacted") return "approved";
  if (status === "rejected") return "rejected";
  return "new";
}

function toLead(value: ApiLead): Lead {
  return {
    id: value.id,
    origami_row_id: value.origami_row_id,
    company: value.company_name,
    person: value.person_name ?? "Unknown contact",
    title: value.title ?? "Not provided",
    location: value.location ?? "Not provided",
    linkedin_url: value.linkedin_url,
    relevance_score: percentage(value.origami_relevance_score),
    similarity: percentage(value.similarity_score),
    status: uiStatus(value.status),
    match_evidence: [],
    draft: null,
    source: "live",
  };
}

function toDraft(value: ApiOutreachDraft): Draft {
  return {
    id: value.id,
    subject: value.subject,
    body: value.body,
    status: value.status === "draft" ? "draft" : "approved",
    source: "live",
  };
}

function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function commonProfileId(values: ApiLead[]): string | null {
  const first = values[0]?.icp_profile_id;
  return first && values.every((lead) => lead.icp_profile_id === first) ? first : null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(EVALUATION_LEADS);
  const [filters, setFilters] = useState<FilterState>(defaultFilterState);
  const [filtersHidden, setFiltersHidden] = useFiltersPanelState();
  const [brief, setBrief] = useState(defaultBrief);
  const [icp, setIcp] = useState<ApiIcpProfile | null>(null);
  const [leadProfileId, setLeadProfileId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [source, setSource] = useState<"checking" | "evaluation" | "live">("checking");
  const [leadProvider, setLeadProvider] = useState<"evaluation" | "origami" | "openrouter_demo">("evaluation");
  const [notice, setNotice] = useState("Showing 12 labelled evaluation leads while checking the deployed API.");
  const [integrations, setIntegrations] = useState<{ supabase: boolean | null; origami: boolean | null; openrouter: boolean | null }>({ supabase: null, origami: null, openrouter: null });
  const mounted = useRef(true);
  const loadGeneration = useRef(0);
  const searchController = useRef<AbortController | null>(null);
  const actionController = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    const generation = ++loadGeneration.current;
    const controller = new AbortController();
    let cancelled = false;
    Promise.allSettled([getReadiness(), getLeads(undefined, controller.signal), getLatestIcp()]).then(([readyResult, leadsResult, icpResult]) => {
      if (cancelled || !mounted.current || controller.signal.aborted || loadGeneration.current !== generation) return;
      if (readyResult.status === "fulfilled") {
        setIntegrations({
          supabase: readyResult.value.integrations.supabase ?? null,
          origami: readyResult.value.integrations.origami ?? null,
          openrouter: readyResult.value.integrations.openrouter ?? null,
        });
      }
      const profile = icpResult.status === "fulfilled" ? icpResult.value : null;
      setIcp(profile);
      if (profile) setBrief(profile.profile.origami_brief);
      if (leadsResult.status === "fulfilled" && leadsResult.value.length > 0) {
        setLeads(leadsResult.value.map(toLead));
        setLeadProfileId(commonProfileId(leadsResult.value));
        setSource("live");
        const demoLeads = leadsResult.value.every((lead) => lead.metadata?.source === "openrouter_demo" && lead.metadata?.synthetic === true);
        setLeadProvider(demoLeads ? "openrouter_demo" : "origami");
        setNotice(demoLeads ? `${leadsResult.value.length} fictional OpenRouter demo prospects loaded from the deployed API; .example domains cannot receive email.` : `${leadsResult.value.length} stored Origami leads loaded from the deployed API. Match evidence appears only when the API supplies it.`);
      } else {
        setSource("evaluation");
        setNotice(leadsResult.status === "rejected"
          ? `Lead API unavailable (${leadsResult.reason instanceof Error ? leadsResult.reason.message : "unknown error"}). Showing 12 labelled evaluation leads.`
          : "The deployed API has no stored leads yet. Showing 12 labelled evaluation leads; no outreach action will be presented as live.");
      }
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      loadGeneration.current += 1;
      controller.abort();
      searchController.current?.abort();
      actionController.current?.abort();
    };
  }, []);

  const visible = useMemo(() => applyFilters(leads, filters), [leads, filters]);
  const pending = visible.filter((lead) => lead.draft?.status === "draft").length;
  const replaceLead = (id: string, update: (lead: Lead) => Lead) =>
    setLeads((current) => current.map((lead) => lead.id === id ? update(lead) : lead));

  const runSearch = async () => {
    if (searching || busyLeadId) return;
    loadGeneration.current += 1;
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setSearching(true);
    const useDemoBootstrap = !icp || integrations.origami !== true;
    setNotice(useDemoBootstrap ? "Loading the conversation history, deriving a live ICP, and generating 10 clearly fictional OpenRouter demo prospects…" : "Starting a live Origami search from the latest ICP brief stored by the backend…");
    try {
      const bootstrap = useDemoBootstrap ? await bootstrapDemo(controller.signal) : null;
      if (bootstrap) {
        setIcp(bootstrap.icp);
        setBrief(bootstrap.icp.profile.origami_brief);
      }
      const accepted = bootstrap?.lead_source ?? await sourceLeads(Math.max(1, Math.min(10, filters.total)), controller.signal);
      let status = accepted.status;
      for (let attempt = 0; attempt < 20 && !TERMINAL_SEARCH_STATES.has(status); attempt += 1) {
        await abortableDelay(1500, controller.signal);
        if (controller.signal.aborted) return;
        status = (await getLeadSourceStatus(accepted.origami_job_id, controller.signal)).status;
      }
      if (status !== "succeeded") throw new Error(status === "failed" || status === "cancelled" ? `Origami search ${status}` : "Origami search is still running; refresh shortly");
      let stored: ApiLead[] = [];
      for (let attempt = 0; attempt < 5 && stored.length === 0; attempt += 1) {
        if (controller.signal.aborted) return;
        stored = await getLeads(accepted.icp_profile_id, controller.signal);
        if (stored.length === 0) await abortableDelay(750, controller.signal);
      }
      if (stored.length === 0) throw new Error("Origami completed but no eligible leads were stored");
      if (!mounted.current || controller.signal.aborted) return;
      setLeads(stored.map(toLead));
      setLeadProfileId(accepted.icp_profile_id);
      setSource("live");
      setLeadProvider(bootstrap?.lead_provider === "openrouter_demo" ? "openrouter_demo" : "origami");
      setUpdatedAt(new Date());
      setNotice(bootstrap?.lead_provider === "openrouter_demo" ? `${stored.length} fictional prospects generated live through OpenRouter and scored against ICP v${bootstrap.icp.version}. Reserved .example domains and disabled delivery keep the proof safe.` : `${stored.length} stored leads for this ICP loaded after the Origami job succeeded. Similarity is backend-computed; visible criteria refine rows locally.`);
    } catch (error) {
      if (!mounted.current || isAbort(error)) return;
      const detail = error instanceof ApiError && error.status === 503
        ? "The configured lead-generation model is unavailable on the deployed API"
        : error instanceof Error ? error.message : "Live lead search failed";
      setNotice(`${detail}. ${source === "live" ? "Keeping the previously loaded live rows." : "Keeping the labelled evaluation rows."}`);
    } finally {
      if (mounted.current && searchController.current === controller) {
        setSearching(false);
        searchController.current = null;
      }
    }
  };

  const createDraft = async (lead: Lead) => {
    if (lead.source !== "live" || lead.status !== "new" || busyLeadId || searching) return;
    actionController.current?.abort();
    const controller = new AbortController();
    actionController.current = controller;
    setBusyLeadId(lead.id);
    try {
      const draft = await draftLeadOutreach(lead.id, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      replaceLead(lead.id, (current) => ({ ...current, status: "drafted", draft: toDraft(draft) }));
      setNotice(`Live outreach draft created for ${lead.person}. It is locked to the exact backend copy until approval.`);
    } catch (error) {
      if (mounted.current && !isAbort(error)) setNotice(error instanceof Error ? error.message : "Could not create live outreach draft");
    } finally {
      if (mounted.current && actionController.current === controller) {
        setBusyLeadId(null);
        actionController.current = null;
      }
    }
  };

  const approve = async (lead: Lead) => {
    if (!lead.draft || busyLeadId || searching) return;
    if (lead.source !== "live") {
      replaceLead(lead.id, (current) => ({ ...current, status: "approved", draft: current.draft ? { ...current.draft, status: "approved" } : null }));
      setNotice(`Evaluation-only approval simulated locally for ${lead.person}; no email was sent.`);
      return;
    }
    actionController.current?.abort();
    const controller = new AbortController();
    actionController.current = controller;
    setBusyLeadId(lead.id);
    try {
      const draft = await approveLeadOutreach(lead.id, lead.draft.id, controller.signal);
      if (draft.id !== lead.draft.id) throw new Error("Backend returned a different outreach draft; approval state was not applied");
      if (!mounted.current || controller.signal.aborted) return;
      replaceLead(lead.id, (current) => ({ ...current, status: "approved", draft: toDraft(draft) }));
      setNotice(`Backend approved the reviewed outreach for ${lead.person} and logged the action. It has not been sent.`);
    } catch (error) {
      if (mounted.current && !isAbort(error)) setNotice(error instanceof Error ? error.message : "Could not approve outreach");
    } finally {
      if (mounted.current && actionController.current === controller) {
        setBusyLeadId(null);
        actionController.current = null;
      }
    }
  };

  const approveAll = async () => {
    if (busyLeadId || searching) return;
    const candidates = visible.filter((lead) => lead.draft?.status === "draft");
    const evaluationIds = new Set(candidates.filter((lead) => lead.source !== "live").map((lead) => lead.id));
    if (evaluationIds.size > 0) {
      setLeads((current) => current.map((lead) => evaluationIds.has(lead.id) && lead.draft
        ? { ...lead, status: "approved", draft: { ...lead.draft, status: "approved" } }
        : lead));
    }
    const live = candidates.filter((lead): lead is Lead & { draft: Draft } => lead.source === "live" && lead.draft != null);
    if (live.length === 0) {
      setNotice(`${evaluationIds.size} evaluation approval${evaluationIds.size === 1 ? "" : "s"} simulated locally; no emails were sent.`);
      return;
    }
    actionController.current?.abort();
    const controller = new AbortController();
    actionController.current = controller;
    setBusyLeadId("*");
    let approved = 0;
    try {
      for (const lead of live) {
        if (!mounted.current || controller.signal.aborted) break;
        const draft = await approveLeadOutreach(lead.id, lead.draft.id, controller.signal);
        if (draft.id !== lead.draft.id) throw new Error(`Draft changed for ${lead.person}; stopped bulk approval`);
        if (!mounted.current || controller.signal.aborted) break;
        replaceLead(lead.id, (current) => ({ ...current, status: "approved", draft: toDraft(draft) }));
        approved += 1;
      }
      if (mounted.current && !controller.signal.aborted) setNotice(`${approved} backend outreach approval${approved === 1 ? "" : "s"} logged; no email was sent. ${evaluationIds.size} evaluation approval${evaluationIds.size === 1 ? "" : "s"} stayed local.`);
    } catch (error) {
      if (mounted.current && !isAbort(error)) setNotice(error instanceof Error ? error.message : "Bulk approval stopped");
    } finally {
      if (mounted.current && actionController.current === controller) {
        setBusyLeadId(null);
        actionController.current = null;
      }
    }
  };

  const verifiedIcp = source === "live" && icp && leadProfileId === icp.id;
  const provenance = source === "live"
    ? leadProvider === "openrouter_demo" ? `fictional OpenRouter proof · scored from live ICP v${icp?.version ?? "?"}` : verifiedIcp ? `from verified live ICP v${icp.version}` : "stored backend leads · ICP version not verified"
    : `from the labelled ICP evaluation across ${WON_DEALS} won deals`;

  return (
    <>
      <TopBar
        searching={searching}
        disabled={busyLeadId !== null}
        onRunSearch={runSearch}
        brief={brief}
        onBriefChange={(value) => {
          setBrief(value);
          setNotice("Brief edited for local preview only. Live search uses the latest ICP brief stored by the backend.");
        }}
        integrations={{ supabase: integrations.supabase, openrouter: integrations.openrouter }}
      />
      <div className="flex min-h-0 flex-1 flex-col bg-legacy-background">
        <div role="status" aria-atomic="true" className="mx-[22px] mt-4 rounded-legacy-md border border-legacy-line bg-card px-4 py-3 text-sm text-legacy-ink">
          <span className="font-semibold">{source === "live" ? leadProvider === "openrouter_demo" ? "Live synthetic lead proof" : "Live Origami leads" : "Labelled evaluation leads"}</span>
          <span className="ml-2 text-muted-foreground">{notice}</span>
        </div>
        <div className="flex min-h-0 flex-1">
          {!filtersHidden && <FiltersPanel state={filters} onChange={setFilters} brief={brief} onHide={() => setFiltersHidden(true)} />}
          <div className="flex min-w-0 flex-1 flex-col">
            <ResultBar count={visible.length} total={leads.length} provenance={provenance} updatedAt={updatedAt} filtersHidden={filtersHidden} onShowFilters={() => setFiltersHidden(false)} />
            <div className="h-5 shrink-0" />
            <LeadTable
              leads={visible}
              busyLeadId={searching ? "*" : busyLeadId}
              onCreateDraft={createDraft}
              onApprove={approve}
              onChange={(next) => setLeads((current) => current.map((lead) => next.find((item) => item.id === lead.id) ?? lead))}
            />
          </div>
        </div>
        <ActionBar pending={busyLeadId || searching ? 0 : pending} onApproveAll={approveAll} leads={visible} />
      </div>
    </>
  );
}
