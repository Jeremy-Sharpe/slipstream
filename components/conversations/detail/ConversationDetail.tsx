"use client";

import { AlertCircle, CheckCircle2, Loader2, Server } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  API_BASE_URL,
  approveDraft as approveLiveDraft,
  mergeLivePipeline,
  mergeLiveScorecard,
  runFixturePipeline,
  scoreCall,
  type ApiCall,
} from "@/lib/api/slipstream";
import { patchConversation, useConversations } from "@/lib/store/conversations";
import type { ConversationStatus } from "@/lib/types";
import type { CallRecord, TimelineEntry } from "@/lib/types/calls";
import { CrmPanel } from "./CrmPanel";
import { DetailHeader } from "./DetailHeader";
import { FollowUpDraft, Intelligence, ScorecardCard } from "./Insights";
import { AudioPlayer, Transcript } from "./Transcript";

type Other = { id: string; company: string; prospect: string };

export function ConversationDetail({ call, others }: { call: CallRecord; others: Other[] }) {
  const conversations = useConversations();
  const row = conversations.find((c) => c.id === call.id);
  const status: ConversationStatus = row?.status ?? "needs_review";
  const [synced, setSynced] = useState(status === "synced");
  const [approvedDraftId, setApprovedDraftId] = useState<string>();
  const [approving, setApproving] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [activeCall, setActiveCall] = useState(call);
  const [draftId, setDraftId] = useState<string>();
  const [pipelineStatus, setPipelineStatus] = useState<"idle" | "live" | "error">("idle");
  const [pipelineRevision, setPipelineRevision] = useState(0);
  const [pipelineError, setPipelineError] = useState<string>();
  const [scoreTarget, setScoreTarget] = useState<ApiCall>();
  const [scorecardState, setScorecardState] = useState<{
    source: "evaluation" | "live";
    model?: string;
    scoring: boolean;
    error?: string;
  }>({ source: "evaluation", scoring: false });
  const [highlight, setHighlight] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(call.timeline);
  const pipelineInFlight = useRef(false);
  const approvalInFlight = useRef(false);
  const draftIdRef = useRef<string | undefined>(undefined);
  const syncedRef = useRef(status === "synced");
  const scoreGenerationRef = useRef(0);
  const scoreControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    scoreGenerationRef.current += 1;
    scoreControllerRef.current?.abort();
  }, []);

  const log = useCallback((title: string, meta: string, icon: TimelineEntry["icon"]) => {
    setTimeline((t) => [{ title, meta, at: new Date().toISOString(), icon }, ...t]);
  }, []);

  const runPipeline = useCallback(async () => {
    if (pipelineInFlight.current || approvalInFlight.current) {
      throw new Error("Another live action is still running");
    }
    pipelineInFlight.current = true;
    scoreGenerationRef.current += 1;
    scoreControllerRef.current?.abort();
    setScoreTarget(undefined);
    setScorecardState((current) => ({ ...current, scoring: false }));
    setRerunning(true);
    setPipelineError(undefined);
    try {
      const live = await runFixturePipeline(call.id);
      const merged = mergeLivePipeline(call, live);
      setActiveCall(merged);
      scoreControllerRef.current?.abort();
      scoreGenerationRef.current += 1;
      setScoreTarget(live.call);
      setScorecardState({ source: "evaluation", scoring: false });
      setPipelineRevision((revision) => revision + 1);
      setDraftId(live.draft.id);
      draftIdRef.current = live.draft.id;
      setApprovedDraftId(["approved", "sent"].includes(live.draft.status) ? live.draft.id : undefined);
      setPipelineStatus("live");
      log("Live pipeline completed", "API · transcript → CRM fields → draft", "sparkles");

      return live.draft.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The live pipeline did not complete";
      setPipelineError(message);
      setPipelineStatus("error");
      throw error;
    } finally {
      pipelineInFlight.current = false;
      setRerunning(false);
    }
  }, [call, log]);

  const runScorecard = async () => {
    if (!scoreTarget || scorecardState.scoring || pipelineInFlight.current) return;
    scoreControllerRef.current?.abort();
    const controller = new AbortController();
    scoreControllerRef.current = controller;
    const generation = ++scoreGenerationRef.current;
    setScorecardState((current) => ({ ...current, scoring: true, error: undefined }));
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const scorecard = await scoreCall(scoreTarget, call.outcome, controller.signal);
      if (scoreGenerationRef.current !== generation || controller.signal.aborted) return;
      setActiveCall((current) => mergeLiveScorecard(current, scorecard));
      setScorecardState({ source: "live", model: scorecard.model, scoring: false });
      log("Call scored", `${scorecard.model} · ${scorecard.rubric_version}`, "gauge");
    } catch (error) {
      if (scoreGenerationRef.current !== generation) return;
      setScorecardState((current) => ({
        ...current,
        scoring: false,
        error: controller.signal.aborted ? "Scoring timed out" : error instanceof Error ? error.message : "Live scorecard unavailable",
      }));
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const sync = async () => {
    if (pipelineStatus !== "live") {
      try {
        await runPipeline();
      } catch {
        return;
      }
    }
    syncedRef.current = true;
    setSynced(true);
    patchConversation(call.id, { status: "synced" });
    log("CRM fields approved", "Live Slipstream staging record", "check");
  };
  const approveDraft = async () => {
    if (pipelineInFlight.current || approvalInFlight.current) return;
    try {
      if (!draftId) {
        await runPipeline();
        return;
      }
      approvalInFlight.current = true;
      setApproving(true);
      await approveLiveDraft(draftId);
      if (draftIdRef.current === draftId) {
        setApprovedDraftId(draftId);
        if (!syncedRef.current) patchConversation(call.id, { status: "action_ready" });
        log("Follow-up approved", "Live API activity · not sent", "mail");
      }
    } catch (error) {
      setPipelineError(
        error instanceof Error ? error.message : "The approval could not be recorded",
      );
    } finally {
      approvalInFlight.current = false;
      setApproving(false);
    }
  };
  const markDone = () => { syncedRef.current = true; setSynced(true); patchConversation(call.id, { status: "synced" }); log("Marked done", "Maxim", "check"); };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-page">
      <DetailHeader call={activeCall} others={others} status={synced ? "synced" : status} onMarkDone={markDone} onRerun={() => void runPipeline().catch(() => undefined)} rerunning={rerunning || approving} />
      <div className="mx-6 mt-5 flex items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        {rerunning ? <Loader2 className="size-4 animate-spin text-primary" /> : pipelineError ? <AlertCircle className="size-4 text-destructive" /> : pipelineStatus === "live" ? <CheckCircle2 className="size-4 text-primary" /> : <Server className="size-4 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-ink">
            {rerunning ? "Running the live sales pipeline…" : pipelineError ? (pipelineStatus === "live" ? "Live API action needs attention" : "Live API unavailable — showing labelled demo data") : pipelineStatus === "live" ? "Live API result" : "Labelled demo data ready"}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            {pipelineError ?? (pipelineStatus === "live"
              ? scorecardState.source === "live"
                ? `Live transcript, CRM extraction, draft and ${scorecardState.model} scorecard.`
                : scorecardState.scoring
                  ? "Live transcript, CRM extraction and draft · scoring against the rubric…"
                  : scorecardState.error
                    ? `Live transcript, CRM extraction and draft · labelled evaluation scorecard (${scorecardState.error}).`
                    : "Live transcript, CRM extraction and draft · labelled evaluation scorecard."
              : API_BASE_URL)}
          </p>
        </div>
        <Button variant="outline" className="h-9 rounded-md px-3 text-[13px]" onClick={() => void runPipeline().catch(() => undefined)} disabled={rerunning || approving}>
          {pipelineStatus === "live" ? "Run again" : "Run live pipeline"}
        </Button>
      </div>
      <div className="grid flex-1 grid-cols-[minmax(0,2fr)_minmax(360px,1fr)] gap-6 px-6 py-6">
        <div className="grid content-start gap-5">
          <AudioPlayer duration={activeCall.durationSeconds} />
          <Intelligence call={activeCall} />
          <Transcript call={activeCall} highlight={highlight} />
          <ScorecardCard call={activeCall} onHover={setHighlight} source={scorecardState.source === "live" ? `Live · ${scorecardState.model}` : "Labelled evaluation"} canGenerate={scoreTarget != null && !rerunning} generating={scorecardState.scoring} error={scorecardState.error} onGenerate={() => void runScorecard()} />
          <FollowUpDraft key={`${draftId ?? "fixture"}:${pipelineRevision}`} call={activeCall} approved={approvedDraftId === draftId && draftId != null} locked={draftId != null} busy={approving} onApprove={() => void approveDraft()} />
        </div>
        <div className="sticky top-6 self-start rounded-xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(17,24,39,0.06)]">
          <CrmPanel key={`${draftId ?? "fixture"}:${pipelineRevision}`} call={activeCall} synced={synced} onSync={() => void sync()} onHover={setHighlight} timeline={timeline} />
        </div>
      </div>
    </div>
  );
}
