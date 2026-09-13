"use client";

// The run is a stream of step events. Every step is a request to the API: it is
// `running` while the request is in flight, `done` when it resolves, `error`
// when it rejects, and `waiting` at a gate. The sub-step ticker and the elapsed
// timer are the only things still on a timer, and they stop when the promise
// settles.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  approveDraft as approveDraftRequest,
  bootstrapDemo,
  deriveIcp,
  draftEmailReply,
  draftFromCall,
  draftLeadOutreach,
  extractCall,
  getExtraction,
  getEmailThread,
  getIcpFreshness,
  getLatestIcp,
  getLeads,
  getReadiness,
  getScorecard,
  loadIcpHistory,
  scoreCall,
  syncCallToCrm,
  type ApiCall,
  type ApiDraft,
  type ApiEmailRecord,
  type ApiExtraction,
  type ApiIcpProfile,
  type ApiLead,
  type ApiScorecard,
} from "@/lib/api/slipstream";
import { outcomeFrom, toCallRecord, toEmailRecord } from "@/lib/adapters";
import { responseTime } from "@/lib/email";
import { getRun, setRun, resetRun, type ThreadRef } from "@/lib/store/conversations";
import type { CallRecord } from "./types";

export type StepId = "transcribe" | "extract" | "score" | "draft" | "icp" | "search" | "outreach";
export type StepStatus = "pending" | "running" | "waiting" | "done" | "skipped" | "error";
export type StepState = { id: StepId; status: StepStatus; progress?: number; note?: string; error?: string; startedAt?: number; elapsedMs?: number };

export const PHASE1: StepId[] = ["transcribe", "extract"];
export const PHASE2: StepId[] = ["score", "draft"];
export const PHASE3: StepId[] = ["icp", "search", "outreach"];

/** Sub-items ticked off while each step works. */
export const TRACE: Record<StepId, string[]> = {
  transcribe: ["Diarising speakers", "Aligning timestamps"],
  extract: ["Reading the transcript", "Finding contact and company", "Deal stage, value and next step"],
  score: ["Counting discovery questions", "Checking for a dated next step", "Reading the objection"],
  draft: ["Pulling what was promised", "Writing the follow-up"],
  icp: ["Comparing with the won deals", "Updating the profile"],
  search: ["Reading the profile", "Scoring against won deals", "Ranking by similarity"],
  outreach: ["Matching each lead to a won call", "Counting the drafts"],
};

/** The same steps read a thread instead of a recording. */
export function traceFor(call: CallRecord): Record<StepId, string[]> {
  if (call.kind !== "email") return TRACE;
  const n = call.messages?.length ?? call.turns.length;
  return {
    ...TRACE,
    transcribe: [`Reading ${n} message${n === 1 ? "" : "s"}`, "Working out who wrote what"],
    extract: ["Reading the thread", "Finding contact and company", "Filing it in the CRM"],
    draft: ["Pulling what was promised", "Writing the reply"],
  };
}

/** Minimum visible duration per step, even when the work is instant. */
const DURATION: Record<StepId, number> = { transcribe: 3000, extract: 4000, score: 3000, draft: 3500, icp: 3000, search: 4500, outreach: 3000 };
/** Each sub-item stays visible at least this long before its check. */
const SUB_MIN = 900;
/** Settle after a step completes before the next one expands. */
const SETTLE = 500;

const NO_SHOW_NOTE = "No conversation to extract. Reschedule note drafted";
const LOST_NOTE = "Not a fit for the ICP. No leads searched";
const CRM_NOTE = "CRM record written; external webhook not configured on this deployment";
/** Outreach is drafted for the best-matching new leads only; each draft is a model call. */
const OUTREACH_LEADS = 3;

export type RunSource = {
  id: string;
  kind: "call" | "email";
  call?: ApiCall;
  thread?: ThreadRef;
  records?: ApiEmailRecord[];
  extraction?: ApiExtraction;
  scorecard?: ApiScorecard;
  draft?: ApiDraft;
  company?: string;
  extracted?: boolean;
  synced?: boolean;
  approved?: boolean;
};

export type RunData = {
  records?: ApiEmailRecord[];
  extraction?: ApiExtraction;
  scorecard?: ApiScorecard;
  draft?: ApiDraft;
  icp?: ApiIcpProfile;
  wonDeals?: number;
  icpStatus?: string;
  leads?: ApiLead[];
  /** Leads still scored against an earlier version of the profile, as the API counts them. */
  leadsNeedRescore?: number;
  crmNote?: string;
  synced: boolean;
  approved: boolean;
};

const message = (error: unknown) =>
  error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Something went wrong";

export function useRun(source: RunSource, opts: { instant?: boolean; startDelay?: number } = {}) {
  const instant = !!opts.instant;
  const [steps, setSteps] = useState<StepState[]>([]);
  const [open, setOpen] = useState<StepId | null>(null);
  const [runId, setRunId] = useState(0);
  const [data, setData] = useState<RunData>({
    records: source.records,
    extraction: source.extraction,
    scorecard: source.scorecard,
    draft: source.draft,
    synced: !!source.synced,
    approved: !!source.approved,
  });

  const generation = useRef(0);
  const tickers = useRef<number[]>([]);
  const email = source.kind === "email";

  const call = useMemo<CallRecord>(() => {
    if (email) {
      const records = data.records ?? source.records ?? [];
      return toEmailRecord(source.id, records, {
        extraction: data.extraction,
        draft: data.draft,
        company: source.company,
        responseTime: responseTime(
          records
            .slice()
            .sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at))
            .map((record, i) => ({
              i,
              direction: record.direction,
              sender: record.sender,
              recipients: record.recipients,
              subject: record.subject,
              body: record.body,
              occurred_at: record.occurred_at,
            })),
        ),
      });
    }
    return toCallRecord(source.call as ApiCall, { extraction: data.extraction, scorecard: data.scorecard, draft: data.draft });
  }, [email, source.id, source.call, source.records, source.company, data.records, data.extraction, data.scorecard, data.draft]);

  const set = useCallback((id: StepId, patch: Partial<StepState>) => {
    setSteps((all) => all.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  }, []);

  const clearTickers = useCallback(() => {
    tickers.current.forEach((id) => window.clearInterval(id));
    tickers.current = [];
  }, []);

  /** Cosmetic only: the sub-items tick over while the request is in flight and never reach the last one on their own. */
  const startTicker = useCallback((id: StepId, ticks: number) => {
    if (instant) return;
    let at = 0;
    const handle = window.setInterval(() => {
      at += 1;
      setSteps((all) => all.map((step) => (step.id === id ? { ...step, progress: Math.min(at, ticks - 1) } : step)));
    }, SUB_MIN);
    tickers.current.push(handle);
    return handle;
  }, [instant]);

  const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, Math.max(0, ms)));

  const exec = useCallback(async <T,>(gen: number, id: StepId, ticks: number, work: () => Promise<T>): Promise<T> => {
    const startedAt = Date.now();
    set(id, { status: "running", progress: 0, startedAt, error: undefined, elapsedMs: undefined });
    setOpen(id);
    const handle = startTicker(id, ticks);
    try {
      const value = await work();
      if (handle) window.clearInterval(handle);
      if (gen !== generation.current) throw new Error("cancelled");
      if (!instant) await wait(DURATION[id] - (Date.now() - startedAt));
      if (gen !== generation.current) throw new Error("cancelled");
      set(id, { status: "done", progress: ticks, elapsedMs: instant ? 0 : Date.now() - startedAt });
      return value;
    } catch (error) {
      if (handle) window.clearInterval(handle);
      if (gen === generation.current && message(error) !== "cancelled") {
        set(id, { status: "error", error: message(error), elapsedMs: Date.now() - startedAt });
        setOpen(id);
      }
      throw error;
    }
  }, [instant, set, startTicker]);

  const skip = useCallback((ids: StepId[], note: string) => {
    setSteps((all) => all.map((step) => (
      ids.includes(step.id)
        ? { ...step, status: "skipped" as StepStatus, note: step.id === ids[0] ? note : undefined, error: undefined }
        : step
    )));
  }, []);

  /* Phase 1: the conversation is already loaded, so "transcribe" reports what
     came back and "extract" is the model call that writes the CRM record. */
  const startPhase1 = useCallback(async (reset = false) => {
    clearTickers();
    generation.current += 1;
    const gen = generation.current;
    setSteps(PHASE1.map((id) => ({ id, status: "pending" })));
    setOpen(null);
    setRunId((n) => n + 1);
    // Opening a finished conversation replays the timeline over what the API
    // already holds; only "Re-run" puts the stored run back to the start.
    if (reset) {
      resetRun(source.id);
      setRun(source.id, { state: "running" });
    }
    setData((current) => ({ ...current, synced: false, approved: false }));

    if (!instant) await wait(opts.startDelay ?? 200);
    if (gen !== generation.current) return;

    try {
      await exec(gen, "transcribe", TRACE.transcribe.length, async () => undefined);
    } catch {
      return;
    }

    // A no-show has nothing to extract, and that is only known once a scorecard exists.
    if (source.scorecard?.outcome === "no_show") {
      skip(["extract"], NO_SHOW_NOTE);
      setOpen(null);
      setRun(source.id, { state: "done", outcome: "no_show" });
      return;
    }

    try {
      if (!instant) await wait(SETTLE);
      const extraction = await exec(gen, "extract", TRACE.extract.length, async () => {
        if (email) {
          const thread = source.thread;
          if (!thread) throw new Error("This thread has no mailbox on record");
          const records = await getEmailThread(thread.provider, thread.mailbox_external_id, thread.thread_external_id);
          setData((current) => ({ ...current, records }));
          return undefined;
        }
        if (source.extracted || data.extraction) {
          const existing = await getExtraction(source.id);
          if (existing) return existing;
        }
        return extractCall(source.id);
      });
      if (gen !== generation.current) return;
      if (extraction) setData((current) => ({ ...current, extraction }));
      set("extract", { status: "waiting" });
      setOpen("extract");
      setRun(source.id, {
        state: getRun(source.id)?.state === "done" ? "done" : "review",
        extracted: !email,
        outcome: outcomeFrom(undefined, extraction),
      });
    } catch {
      // The step carries the message and a retry.
    }
  }, [clearTickers, data.extraction, email, exec, instant, opts.startDelay, set, skip, source.extracted, source.id, source.scorecard]);

  /** Scoring is a call-only step and the draft does not depend on it. */
  const runScore = useCallback(async (): Promise<ApiScorecard | undefined> => {
    const gen = generation.current;
    try {
      const scorecard = await exec(gen, "score", TRACE.score.length, async () => {
        const apiCall = source.call as ApiCall;
        const existing = await getScorecard(apiCall.source_external_id);
        if (existing) return existing;
        return scoreCall(apiCall, outcomeFrom(undefined, data.extraction));
      });
      if (gen !== generation.current) return undefined;
      setData((current) => ({ ...current, scorecard }));
      setRun(source.id, { outcome: scorecard.outcome ?? "open" });
      return scorecard;
    } catch {
      // The step carries the message and a retry.
      return undefined;
    }
  }, [data.extraction, exec, source.call, source.id]);

  const runDraft = useCallback(async () => {
    const gen = generation.current;
    try {
      const draft = await exec(gen, "draft", TRACE.draft.length, async () => {
        if (email) {
          const thread = source.thread;
          if (!thread) throw new Error("This thread has no mailbox on record");
          return draftEmailReply(thread.provider, thread.mailbox_external_id, thread.thread_external_id);
        }
        return draftFromCall(source.id);
      });
      if (gen !== generation.current) return;
      setData((current) => ({ ...current, draft }));
      setRun(source.id, { draftId: draft.id });
      set("draft", { status: "waiting" });
      setOpen("draft");
    } catch {
      // The step carries the message and a retry.
    }
  }, [email, exec, set, source.id, source.thread]);

  /* Phase 2: after the fields are approved. Calls are scored, threads are not. */
  const startPhase2 = useCallback(async () => {
    const gen = generation.current;
    set("extract", { status: "done" });
    setOpen(null);
    setSteps((all) => (all.some((step) => step.id === "score") ? all : [...all, ...PHASE2.map((id) => ({ id, status: "pending" as StepStatus }))]));

    let scorecard: ApiScorecard | undefined;
    if (email) {
      skip(["score"], call.responseTime ? `Threads are not scored · replied in ${call.responseTime}` : "Threads are not scored · no reply yet");
    } else {
      if (!instant) await wait(SETTLE);
      scorecard = await runScore();
      if (gen !== generation.current) return;
      if (scorecard?.outcome === "no_show") {
        skip(["draft"], NO_SHOW_NOTE);
        setRun(source.id, { state: "done", outcome: "no_show" });
        return;
      }
    }

    if (!instant) await wait(SETTLE);
    await runDraft();
  }, [call.responseTime, email, instant, runDraft, runScore, set, skip, source.id]);

  /* Phase 3: after the follow-up is approved. The profile and the leads are shared, not per call. */
  const startPhase3 = useCallback(async () => {
    const gen = generation.current;
    set("draft", { status: "done" });
    setOpen(null);
    setSteps((all) => (all.some((step) => step.id === "icp") ? all : [...all, ...PHASE3.map((id) => ({ id, status: "pending" as StepStatus }))]));

    let profile: ApiIcpProfile;
    let needRescore = 0;
    try {
      if (!instant) await wait(SETTLE);
      const result = await exec(gen, "icp", TRACE.icp.length, async () => {
        const [freshness, latest] = await Promise.all([getIcpFreshness(), getLatestIcp()]);
        if (latest && freshness?.status !== "stale") return { profile: latest, freshness };
        // The approved call changed the won-deal cohort (or there is no profile yet):
        // relearn before searching. Without Origami the demo bootstrap relearns and
        // sources the fictional leads for the new version in one request.
        let profile: ApiIcpProfile;
        if ((await getReadiness()).integrations.origami) {
          if (!latest) await loadIcpHistory();
          profile = await deriveIcp();
        } else {
          profile = (await bootstrapDemo()).icp;
        }
        return { profile, freshness: await getIcpFreshness() };
      });
      if (gen !== generation.current) return;
      profile = result.profile;
      needRescore = result.freshness?.leads_needing_rescore ?? 0;
      setData((current) => ({
        ...current,
        icp: result.profile,
        icpStatus: result.freshness?.status,
        wonDeals: result.profile.source_deals?.length ?? 0,
      }));
    } catch {
      return;
    }

    if (outcomeFrom(data.scorecard, data.extraction) === "lost") {
      skip(["search", "outreach"], LOST_NOTE);
      setRun(source.id, { state: "done", outcome: "lost" });
      return;
    }

    let found: { leads: ApiLead[]; stale: boolean };
    try {
      if (!instant) await wait(SETTLE);
      found = await exec(gen, "search", TRACE.search.length, async () => {
        const onProfile = await getLeads(profile.id);
        // Leads outlive a profile version: the API counts the ones still to be
        // rescored, and they are the same rows until that happens.
        const rows = onProfile.length || !needRescore ? onProfile : await getLeads();
        return {
          leads: rows.slice().sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0)),
          stale: onProfile.length === 0 && needRescore > 0,
        };
      });
      if (gen !== generation.current) return;
      setData((current) => ({ ...current, leads: found.leads, leadsNeedRescore: found.stale ? needRescore : 0 }));
    } catch {
      return;
    }

    try {
      if (!instant) await wait(SETTLE);
      await exec(gen, "outreach", TRACE.outreach.length, async () => {
        const fresh = found.leads.filter((lead) => lead.status === "new").slice(0, OUTREACH_LEADS);
        for (const lead of fresh) await draftLeadOutreach(lead.id);
        if (!fresh.length || gen !== generation.current) return;
        const drafted = new Set(fresh.map((lead) => lead.id));
        setData((current) => ({
          ...current,
          leads: (current.leads ?? []).map((lead) => (drafted.has(lead.id) ? { ...lead, status: "reviewed" } : lead)),
        }));
      });
      if (gen !== generation.current) return;
      setRun(source.id, { state: "done" });
    } catch {
      // The step carries the message and a retry.
    }
  }, [data.extraction, data.scorecard, exec, instant, set, skip, source.id]);

  /** Gate 1. The extraction is the CRM write of record; the webhook is a second, optional hop. */
  const approveExtraction = useCallback(async () => {
    let note: string | undefined;
    if (!email) {
      try {
        await syncCallToCrm(source.id);
      } catch {
        note = CRM_NOTE;
      }
    } else {
      note = CRM_NOTE;
    }
    setData((current) => ({ ...current, synced: true, crmNote: note }));
    setRun(source.id, { synced: true });
    void startPhase2();
  }, [email, source.id, startPhase2]);

  /** Gate 2. */
  const approveFollowUp = useCallback(async () => {
    const draftId = data.draft?.id;
    if (draftId) {
      try {
        const approved = await approveDraftRequest(draftId);
        setData((current) => ({ ...current, draft: approved, approved: true }));
      } catch {
        setData((current) => ({ ...current, approved: true }));
      }
    }
    setRun(source.id, { approved: true });
    void startPhase3();
  }, [data.draft?.id, source.id, startPhase3]);

  /** Retry the failed step only, so a retry never re-spends on a step that worked. */
  const retry = useCallback((id: StepId) => {
    if (PHASE1.includes(id)) void startPhase1();
    else if (id === "score") void runScore();
    else if (id === "draft") void runDraft();
    else void startPhase3();
  }, [runDraft, runScore, startPhase1, startPhase3]);

  const rerun = useCallback(() => {
    void startPhase1(true);
  }, [startPhase1]);

  useEffect(() => {
    void startPhase1();
    return () => {
      generation.current += 1;
      clearTickers();
    };
    // The run starts once per conversation; `startPhase1` changes identity as data lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id]);

  const toggle = (id: StepId) => setOpen((current) => (current === id ? null : id));

  return { call, data, steps, open, toggle, setOpen, runId, rerun, retry, approveExtraction, approveFollowUp };
}
