"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { icp } from "@/lib/icp";
import { leads } from "@/lib/leads";
import { actions, useStore } from "@/lib/store";
import type { CallRecord } from "@/lib/types";
import { TRACE, type StepId, type StepState } from "@/lib/useRun";
import { CompanyTile } from "./Avatar";
import { TraceStep } from "./run/TraceStep";
import { WorkingLine } from "./run/WorkingLine";
import { StreamingText, words } from "./run/StreamingText";
import { shorterDraft } from "@/lib/summary";
import { Button, Score, cn, mmss } from "./ui";

const LABELS: Record<StepId, { working: string; done: string }> = {
  transcribe: { working: "Transcribing", done: "Transcribed" },
  extract: { working: "Extracting fields", done: "Extracted 6 fields" },
  score: { working: "Scoring the call", done: "Scored the call" },
  draft: { working: "Drafting the follow-up", done: "Follow-up drafted" },
  icp: { working: "Updating the ICP", done: "ICP updated" },
  search: { working: "Searching leads like the 5 you closed", done: "Found 10 leads like the 5 you closed" },
  outreach: { working: "Drafting outreach", done: "Outreach drafted" },
};

const fmtAud = (n: number | null | undefined) => (n == null ? "None" : `$${n.toLocaleString("en-AU")}`);
const pct = (c: number) => `${Math.round(c * 100)}%`;

export function RunTimeline({ call, steps, open, toggle, runId, onHighlight, onReveal }: {
  call: CallRecord;
  steps: StepState[];
  open: StepId | null;
  toggle: (id: StepId) => void;
  runId: number;
  onReveal?: (el: HTMLElement) => void;
  onHighlight: (i: number | null) => void;
}) {
  const store = useStore();
  const synced = !!store.synced[call.id];
  const approved = !!store.approved[call.id];
  const [body, setBody] = useState(call.draft.body);
  // The draft body streams in the first time the step completes, then edits.
  const [draftStreamed, setDraftStreamed] = useState(false);
  const [draftGen, setDraftGen] = useState(0);
  useEffect(() => { setDraftStreamed(false); setBody(call.draft.body); setDraftGen((g) => g + 1); }, [runId, call.draft.body]);
  useEffect(() => {
    const onShorter = () => { setBody(shorterDraft(call.draft.body)); setDraftStreamed(false); setDraftGen((g) => g + 1); };
    window.addEventListener("slipstream:shorter-draft", onShorter);
    return () => window.removeEventListener("slipstream:shorter-draft", onShorter);
  }, [call.draft.body]);
  const top = leads.slice(0, 5);
  const skippedNote = steps.find((s) => s.status === "skipped" && s.note)?.note;

  const summary = (st: StepState): ReactNode => {
    switch (st.id) {
      case "transcribe": return `${mmss(call.duration)} · ${call.turns.length} turns · Scribe`;
      case "extract": return synced ? "Synced to HubSpot" : "Waiting for your approval";
      case "score": return `${call.scorecard.discovery} discovery questions · ${call.scorecard.nextStepSecured ? "next step secured" : "no dated next step"} · talk ratio ${pct(call.scorecard.talkRatio)}`;
      case "draft": return approved ? "Approved · nothing is sent" : call.draft.subject;
      case "icp": return `${icp.sentence.split(" with ")[0]} · v${icp.version}`;
      case "search": return st.status === "done" ? "10 found · scored against the won deals" : "";
      case "outreach": return st.status === "done" ? "5 drafts ready" : "";
    }
  };

  const doneLabel = (id: StepId) => {
    if (id === "extract" && synced) return "Synced 6 fields to HubSpot";
    if (id === "draft" && approved) return "Follow-up approved";
    return LABELS[id].done;
  };

  const field = (label: string, value: ReactNode, conf: number, span: number | null) => (
    <div
      className="grid grid-cols-[92px_minmax(0,1fr)_40px] items-start gap-x-3 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white"
      onMouseEnter={() => onHighlight(span)}
      onMouseLeave={() => onHighlight(null)}
    >
      <p className="pt-px text-[14px] text-soft">{label}</p>
      <p className="min-w-0 text-[15px] text-ink">{value}</p>
      <span className="pt-px text-right text-[14px] tabular-nums text-soft">{pct(conf)}</span>
    </div>
  );

  const card = (st: StepState): ReactNode => {
    const f = call.fields;
    switch (st.id) {
      case "transcribe":
        return <p className="text-[14px] text-soft">Diarised into {call.turns.length} turns. {call.rep} spoke {pct(call.scorecard.talkRatio)} of the time.</p>;
      case "extract":
        if (st.status !== "done") return null;
        return (
          <div>
            <div className="-mx-2 flex flex-col">
              {field("Contact", `${f.contact.value} · ${call.title}`, f.contact.confidence, f.contact.span)}
              {field("Company", `${f.company.value} · ${call.headcount} staff · ${call.location}`, f.company.confidence, f.company.span)}
              {field("Deal stage", f.stage.value.replace("_", " "), f.stage.confidence, f.stage.span)}
              {field("Value", fmtAud(f.value.value), f.value.confidence, f.value.span)}
              {field("Next step", f.next_step.value ?? "None", f.next_step.confidence, f.next_step.span)}
              {field("Promises", f.promises.value.length ? f.promises.value.join(" · ") : "None", f.promises.confidence, f.promises.span)}
              {call.objections.length > 0 && field("Objection", `${call.objections[0].text} (${call.objections[0].handling.replace("_", " ")})`, 0.9, call.scorecard.spans.objection)}
            </div>
            <div className="mt-4">
              {synced ? <span className="text-[14px] text-soft">Synced to HubSpot</span> : <Button variant="primary" onClick={() => actions.sync(call.id)}>Approve &amp; sync</Button>}
            </div>
          </div>
        );
      case "score": {
        if (st.status !== "done") return null;
        const s = call.scorecard;
        const row = (label: string, value: string, span: number | null) => (
          <div className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-x-3 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white" onMouseEnter={() => onHighlight(span)} onMouseLeave={() => onHighlight(null)}>
            <span className="text-[14px] text-soft">{label}</span>
            <span className="text-right text-[15px] tabular-nums text-ink">{value}</span>
          </div>
        );
        return (
          <div className="-mx-2 flex flex-col">
            {row("Discovery questions before pricing", String(s.discovery), s.spans.discovery)}
            {row("Next step secured", s.nextStepSecured ? "Yes, dated" : "No", s.spans.nextStep)}
            {row("Objection handling", s.objection.replace("_", " "), s.spans.objection)}
            {row("Rep talk ratio", pct(s.talkRatio), null)}
          </div>
        );
      }
      case "draft":
        if (st.status !== "done") return null;
        return (
          <div>
            <p className="text-[15px] font-medium text-ink">{call.draft.subject}</p>
            {draftStreamed ? (
              <textarea
                autoFocus={false}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                readOnly={approved}
                className="mt-2 w-full resize-none rounded-lg bg-white px-3 py-2 text-[15px] leading-6 text-text outline-none transition-shadow duration-150 focus:ring-2 focus:ring-accent/30"
                rows={Math.min(12, body.split("\n").length + 1)}
              />
            ) : (
              <div className="mt-2 rounded-lg bg-white px-3 py-2 whitespace-pre-line">
                <StreamingText key={draftGen} size="lg" tokens={words(body.replace(/\n/g, " ⏎ ")).map((t) => ({ text: t.text === "⏎" ? "\n" : t.text }))} onDone={() => setDraftStreamed(true)} />
              </div>
            )}
            <div className="mt-4">
              {approved ? <span className="text-[14px] text-soft">Approved · nothing is sent</span> : <Button variant="primary" onClick={() => actions.approveDraft(call.id)}>Approve</Button>}
            </div>
          </div>
        );
      case "icp":
        if (st.status !== "done") return null;
        return (
          <div>
            <p className="text-[15px] text-ink">{icp.sentence}</p>
            <p className="mt-1 text-[14px] text-soft">From {icp.wonDeals} won deals · v{icp.version}</p>
            {call.icp && (
              <ul className="mt-4 flex flex-col gap-1.5">
                {[["Industry", call.icp.industry], ["Size", call.icp.headcount_band + " staff"], ["Buyer", call.icp.role], ["Trigger", call.icp.trigger ?? "none"]].map(([k, v]) => (
                  <li key={k} className="grid grid-cols-[20px_72px_minmax(0,1fr)] items-center gap-x-1 text-[14px]">
                    <Check className={cn("size-3.5", call.outcome === "won" ? "text-success" : "text-faint")} strokeWidth={2.25} />
                    <span className="text-soft">{k}</span>
                    <span className="text-ink">{v}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      case "search":
        if (st.status === "running") {
          return <WorkingLine label="Searching Victoria for firms like the 5 you closed" startedAt={st.startedAt} detail={`${st.progress ?? 0} of 10`} />;
        }
        if (st.status !== "done") return null;
        return (
          <div>
            <ul className="-mx-2 flex flex-col">
              {top.map((l) => (
                <li key={l.id} className="grid h-9 grid-cols-[24px_minmax(0,1fr)_44px] items-center gap-x-2.5 rounded-lg px-2 transition-colors duration-150 hover:bg-white">
                  <CompanyTile name={l.company} size={24} />
                  <span className="min-w-0 truncate text-[15px] text-ink">{l.company} <span className="text-soft">· {l.title}</span></span>
                  <span className="text-right"><Score value={l.similarity} /></span>
                </li>
              ))}
            </ul>
            <Link href="/leads" className="mt-3 inline-block text-[14px] text-soft underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline">See all 10 in Leads →</Link>
          </div>
        );
      case "outreach":
        if (st.status !== "done") return null;
        return <p className="text-[14px] text-soft">Five drafts reuse the language from the calls you won. <Link href="/leads" className="text-ink underline-offset-2 hover:underline">Review in Leads →</Link></p>;
    }
  };

  const visibleSteps = steps.filter((s) => s.status !== "skipped" || s.note);

  return (
    <ol>
      {visibleSteps.map((st, i) => {
        const last = i === visibleSteps.length - 1;
        if (st.status === "skipped") {
          return (
            <li key={st.id} className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line" />
              <p className="pt-1 text-[14px] text-faint">{st.note}</p>
            </li>
          );
        }
        const rows = TRACE[st.id];
        return (
          <TraceStep
            key={st.id}
            status={st.status}
            workingLabel={LABELS[st.id].working}
            doneLabel={doneLabel(st.id)}
            summary={summary(st)}
            rows={st.status === "running" ? rows : []}
            rowsDone={st.progress ?? 0}
            startedAt={st.startedAt}
            elapsedMs={st.elapsedMs}
            expanded={open === st.id && st.status !== "pending"}
            onToggle={() => toggle(st.id)}
            last={last && !skippedNote}
            loader={st.id === "search" ? "grid" : "spinner"}
            onReveal={onReveal}
          >
            {card(st)}
          </TraceStep>
        );
      })}
    </ol>
  );
}
