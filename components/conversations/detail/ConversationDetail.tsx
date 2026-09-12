"use client";

import { AlertCircle, CheckCircle2, Loader2, Server } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  API_BASE_URL,
  approveDraft as approveLiveDraft,
  mergeLivePipeline,
  runFixturePipeline,
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
  const [approved, setApproved] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [activeCall, setActiveCall] = useState(call);
  const [draftId, setDraftId] = useState<string>();
  const [pipelineStatus, setPipelineStatus] = useState<"idle" | "live" | "error">("idle");
  const [pipelineError, setPipelineError] = useState<string>();
  const [highlight, setHighlight] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(call.timeline);

  const log = useCallback((title: string, meta: string, icon: TimelineEntry["icon"]) => {
    setTimeline((t) => [{ title, meta, at: new Date().toISOString(), icon }, ...t]);
  }, []);

  const runPipeline = useCallback(async () => {
    setRerunning(true);
    setPipelineError(undefined);
    try {
      const live = await runFixturePipeline(call.id);
      setActiveCall(mergeLivePipeline(call, live));
      setDraftId(live.draft.id);
      setPipelineStatus("live");
      log("Live pipeline completed", "API · transcript → CRM fields → draft", "sparkles");
      return live.draft.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The live pipeline did not complete";
      setPipelineError(message);
      setPipelineStatus("error");
      throw error;
    } finally {
      setRerunning(false);
    }
  }, [call, log]);

  const sync = async () => {
    if (pipelineStatus !== "live") {
      try {
        await runPipeline();
      } catch {
        return;
      }
    }
    setSynced(true);
    patchConversation(call.id, { status: "synced" });
    log("CRM fields approved", "Live Slipstream staging record", "check");
  };
  const approveDraft = async () => {
    if (rerunning) return;
    try {
      if (!draftId) {
        await runPipeline();
        return;
      }
      await approveLiveDraft(draftId);
      setApproved(true);
      if (!synced) patchConversation(call.id, { status: "action_ready" });
      log("Follow-up approved", "Live API activity · delivery simulated", "mail");
    } catch (error) {
      setPipelineError(
        error instanceof Error ? error.message : "The approval could not be recorded",
      );
    }
  };
  const markDone = () => { setSynced(true); patchConversation(call.id, { status: "synced" }); log("Marked done", "Maxim", "check"); };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-page">
      <DetailHeader call={activeCall} others={others} status={synced ? "synced" : status} onMarkDone={markDone} onRerun={() => void runPipeline()} rerunning={rerunning} />
      <div className="mx-6 mt-5 flex items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        {rerunning ? <Loader2 className="size-4 animate-spin text-primary" /> : pipelineError ? <AlertCircle className="size-4 text-destructive" /> : pipelineStatus === "live" ? <CheckCircle2 className="size-4 text-primary" /> : <Server className="size-4 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-ink">
            {rerunning ? "Running the live sales pipeline…" : pipelineError ? (pipelineStatus === "live" ? "Live API action needs attention" : "Live API unavailable — showing labelled demo data") : pipelineStatus === "live" ? "Live API result" : "Labelled demo data ready"}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            {pipelineError ?? (pipelineStatus === "live" ? "Live transcript, CRM extraction and draft. Scorecard remains labelled fixture data." : API_BASE_URL)}
          </p>
        </div>
        <Button variant="outline" className="h-9 rounded-md px-3 text-[13px]" onClick={() => void runPipeline()} disabled={rerunning}>
          {pipelineStatus === "live" ? "Run again" : "Run live pipeline"}
        </Button>
      </div>
      <div className="grid flex-1 grid-cols-[minmax(0,2fr)_minmax(360px,1fr)] gap-6 px-6 py-6">
        <div className="grid content-start gap-5">
          <AudioPlayer duration={activeCall.durationSeconds} />
          <Intelligence call={activeCall} />
          <Transcript call={activeCall} highlight={highlight} />
          <ScorecardCard call={activeCall} onHover={setHighlight} />
          <FollowUpDraft call={activeCall} approved={approved} onApprove={() => void approveDraft()} />
        </div>
        <div className="sticky top-6 self-start rounded-xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(17,24,39,0.06)]">
          <CrmPanel call={activeCall} synced={synced} onSync={() => void sync()} onHover={setHighlight} timeline={timeline} />
        </div>
      </div>
    </div>
  );
}
