"use client";

import { useCallback, useState } from "react";
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
  const [highlight, setHighlight] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(call.timeline);

  const log = useCallback((title: string, meta: string, icon: TimelineEntry["icon"]) => {
    setTimeline((t) => [{ title, meta, at: new Date().toISOString(), icon }, ...t]);
  }, []);

  const sync = () => {
    setSynced(true);
    patchConversation(call.id, { status: "synced" });
    log("Fields synced to HubSpot", "Approved by Maxim", "check");
  };
  const approveDraft = () => {
    setApproved(true);
    if (!synced) patchConversation(call.id, { status: "action_ready" });
    log("Follow-up approved", "Logged as an activity · nothing sent", "mail");
  };
  const markDone = () => { setSynced(true); patchConversation(call.id, { status: "synced" }); log("Marked done", "Maxim", "check"); };
  const rerun = () => {
    setRerunning(true);
    window.setTimeout(() => { setRerunning(false); log("Extraction re-run", "Claude · same result", "sparkles"); }, 1500);
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-page">
      <DetailHeader call={call} others={others} status={synced ? "synced" : status} onMarkDone={markDone} onRerun={rerun} rerunning={rerunning} />
      <div className="grid flex-1 grid-cols-[minmax(0,2fr)_minmax(360px,1fr)] gap-6 px-6 py-6">
        <div className="grid content-start gap-5">
          <AudioPlayer duration={call.durationSeconds} />
          <Intelligence call={call} />
          <Transcript call={call} highlight={highlight} />
          <ScorecardCard call={call} onHover={setHighlight} />
          <FollowUpDraft call={call} approved={approved} onApprove={approveDraft} />
        </div>
        <div className="sticky top-6 self-start rounded-xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(17,24,39,0.06)]">
          <CrmPanel call={call} synced={synced} onSync={sync} onHover={setHighlight} timeline={timeline} />
        </div>
      </div>
    </div>
  );
}
