"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { icp } from "@/lib/icp";
import { leads } from "@/lib/leads";
import { actions, useStore } from "@/lib/store";
import type { CallRecord } from "@/lib/types";
import { traceFor, type StepId, type StepState } from "@/lib/useRun";
import { TraceStep } from "./run/TraceStep";
import { WorkingLine } from "./run/WorkingLine";
import { StreamingText, words } from "./run/StreamingText";
import { humanize, Button, Score, cn, mmss } from "./ui";

const LABELS: Record<StepId, { working: string; done: string }> = {
  transcribe: { working: "Transcribing", done: "Transcribed" },
  extract: { working: "Extracting fields", done: "Extracted 6 fields" },
  score: { working: "Scoring the call", done: "Scored the call" },
  draft: { working: "Drafting the follow-up", done: "Follow-up drafted" },
  icp: { working: "Updating the ICP", done: "ICP updated" },
  search: { working: "Searching leads like the 5 you closed", done: "Found 10 leads like the 5 you closed" },
  outreach: { working: "Drafting outreach", done: "Outreach drafted" },
};

/** A thread reads the same steps differently: nothing is transcribed, and the follow-up is a reply. */
const EMAIL_LABELS: Partial<Record<StepId, { working: string; done: string }>> = {
  transcribe: { working: "Reading the thread", done: "Read the thread" },
  score: { working: "Scoring the thread", done: "Scored the thread" },
  draft: { working: "Drafting the reply", done: "Reply drafted" },
};

const fmtAud = (n: number | null | undefined, none = "None") => (n == null ? none : `$${n.toLocaleString("en-AU")}`);
const pct = (c: number) => `${Math.round(c * 100)}%`;

export function RunTimeline({ call, steps, open, toggle, runId, draftBody, setDraftBody, onHighlight, onJump, onReveal, onExpandClick, onSynced, onDraftApproved }: {
  call: CallRecord;
  steps: StepState[];
  open: StepId | null;
  toggle: (id: StepId) => void;
  runId: number;
  draftBody: string;
  setDraftBody: (b: string) => void;
  onHighlight: (i: number | null) => void;
  onJump: (i: number) => void;
  onReveal?: (el: HTMLElement) => void;
  onExpandClick?: (el: HTMLElement, bodyHeight: number) => void;
  onSynced: () => void;
  onDraftApproved: () => void;
}) {
  const store = useStore();
  const synced = !!store.synced[call.id];
  const approved = !!store.approved[call.id];
  // The draft body streams in the first time the step completes, then edits.
  const [draftStreamed, setDraftStreamed] = useState(false);
  const [draftGen, setDraftGen] = useState(0);
  // Re-stream when the run restarts or the body is replaced from outside
  // (state adjusted during render). Edits in the textarea update `edited`.
  const [seen, setSeen] = useState({ runId, body: draftBody });
  if (seen.runId !== runId || seen.body !== draftBody) {
    setSeen({ runId, body: draftBody });
    setDraftStreamed(false);
    setDraftGen((g) => g + 1);
  }
  const top = leads.slice(0, 5);
  const skippedNote = steps.find((s) => s.status === "skipped" && s.note)?.note;
  const email = call.kind === "email";
  const messages = call.messages ?? [];
  const labels = (id: StepId) => (email && EMAIL_LABELS[id]) || LABELS[id];
  const trace = traceFor(call);
  const inbound = messages.filter((m) => m.direction === "inbound").length;

  const summary = (st: StepState): ReactNode => {
    switch (st.id) {
      case "transcribe": return email ? `${messages.length} messages · ${inbound} inbound` : `${mmss(call.duration)} · ${call.turns.length} turns · Scribe`;
      case "extract": return synced ? "6 fields written to CRM" : "Waiting for your approval";
      case "score": return email
        ? `${call.scorecard.askedRightQuestions ? "asked the right questions" : "quoted before asking"} · ${call.scorecard.nextStepSecured ? "next step secured" : "no dated next step"}${call.scorecard.responseTime ? ` · replied in ${call.scorecard.responseTime}` : ""}`
        : `${call.scorecard.discovery} discovery questions · ${call.scorecard.nextStepSecured ? "next step secured" : "no dated next step"} · talk ratio ${pct(call.scorecard.talkRatio)}`;
      case "draft": return approved ? `${email ? "Reply" : "Follow-up"} approved · nothing is sent` : st.status === "waiting" ? "Waiting for your approval" : call.draft.subject;
      case "icp": return `From ${icp.wonDeals} won deals`;
      case "search": return st.status === "done" ? "10 found · scored against the won deals" : "";
      case "outreach": return st.status === "done" ? "5 drafts ready" : "";
    }
  };

  const doneLabel = (id: StepId) => {
    if (id === "extract" && synced) return "Extracted 6 fields · Synced";
    return labels(id).done;
  };

  // The evidence column: a timestamp on a call, a message number on a thread.
  const ref = (f: { evidence_ms?: number | null; evidence_ref?: number | null }) => (email ? (f.evidence_ref != null ? `Msg ${f.evidence_ref + 1}` : "") : f.evidence_ms != null ? mmss(Math.round(f.evidence_ms / 1000)) : "");
  const field = (label: string, value: ReactNode, conf: number, span: number | null, evidence: string) => (
    <button
      type="button"
      className="grid w-full grid-cols-[92px_minmax(0,1fr)_44px_40px] items-start gap-x-3 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      onMouseEnter={() => onHighlight(span)}
      onMouseLeave={() => onHighlight(null)}
      onClick={() => span != null && onJump(span)}
    >
      <span className="pt-px text-[14px] text-soft">{label}</span>
      <span className="min-w-0 text-[15px] text-ink">{value}</span>
      <span className="pt-px text-right text-[13px] tabular-nums text-faint">{evidence}</span>
      <span className="pt-px text-right text-[14px] tabular-nums text-soft">{pct(conf)}</span>
    </button>
  );

  const card = (st: StepState): ReactNode => {
    const f = call.fields;
    switch (st.id) {
      case "transcribe":
        if (email) return <p className="text-[14px] text-soft">Read {messages.length} messages, {inbound} from {call.contact.split(" ")[0]} and {messages.length - inbound} from {call.rep.split(" ")[0]}.{call.scorecard.responseTime ? ` ${call.rep.split(" ")[0]} replied in ${call.scorecard.responseTime}.` : ""}</p>;
        return <p className="text-[14px] text-soft">Diarised into {call.turns.length} turns. {call.rep} spoke {pct(call.scorecard.talkRatio)} of the time.</p>;
      case "extract":
        if (st.status !== "done" && st.status !== "waiting") return null;
        return (
          <div>
            <div className="-mx-2 flex flex-col">
              {field("Contact", `${f.contact.value} · ${call.title}`, f.contact.confidence, f.contact.span, ref(f.contact))}
              {field("Company", `${f.company.value} · ${call.headcount} staff · ${call.location}`, f.company.confidence, f.company.span, ref(f.company))}
              {field("Deal stage", humanize(f.stage.value), f.stage.confidence, f.stage.span, ref(f.stage))}
              {field("Value", fmtAud(f.value.value, email ? "Not stated" : "None"), f.value.confidence, f.value.span, ref(f.value))}
              {field("Next step", f.next_step.value ?? "None", f.next_step.confidence, f.next_step.span, ref(f.next_step))}
              {field("Promises", f.promises.value.length ? f.promises.value.join(" · ") : "None", f.promises.confidence, f.promises.span, ref(f.promises))}
              {call.objections.length > 0 && field("Objection", `${call.objections[0].text} (${humanize(call.objections[0].handling)})`, 0.9, call.scorecard.spans.objection, ref(email ? { evidence_ref: call.scorecard.spans.objection } : { evidence_ms: call.scorecard.spans.objection != null ? call.turns[call.scorecard.spans.objection].t * 1000 : null }))}
            </div>
            <div className="mt-4">
              {synced ? (
                <p className="flex items-center gap-2 text-[14px] text-soft" style={{ animation: "fade-in 200ms ease-out both" }}><Check className="size-3.5 text-ink" strokeWidth={2.5} /> Synced to CRM · 6 fields written</p>
              ) : (
                <Button variant="primary" onClick={() => { actions.sync(call.id); onSynced(); }}>Approve &amp; sync to CRM</Button>
              )}
            </div>
          </div>
        );
      case "score": {
        if (st.status !== "done") return null;
        const s = call.scorecard;
        const row = (label: string, value: string, span: number | null) => (
          <button type="button" className="grid w-full grid-cols-[minmax(0,1fr)_96px] items-center gap-x-3 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40" onMouseEnter={() => onHighlight(span)} onMouseLeave={() => onHighlight(null)} onClick={() => span != null && onJump(span)}>
            <span className="text-[14px] text-soft">{label}</span>
            <span className="text-right text-[15px] tabular-nums text-ink">{value}</span>
          </button>
        );
        return (
          <div className="-mx-2 flex flex-col">
            {email ? row("Asked the right questions", s.askedRightQuestions ? "Yes" : "No", s.spans.discovery) : row("Discovery questions before pricing", String(s.discovery), s.spans.discovery)}
            {row("Next step secured", s.nextStepSecured ? "Yes, dated" : "No", s.spans.nextStep)}
            {row("Objection handling", s.objection.replace("_", " "), s.spans.objection)}
            {email ? row("Response time", s.responseTime ?? "No reply yet", s.spans.nextStep) : row("Rep talk ratio", pct(s.talkRatio), null)}
          </div>
        );
      }
      case "draft":
        if (st.status !== "done" && st.status !== "waiting") return null;
        return (
          <div>
            <p className="text-[15px] font-medium text-ink">{call.draft.subject}</p>
            {draftStreamed ? (
              <textarea
                value={draftBody}
                onChange={(e) => { setSeen({ runId, body: e.target.value }); setDraftBody(e.target.value); }}
                readOnly={approved}
                className="mt-2 w-full resize-none rounded-lg bg-white px-3 py-2 text-[15px] leading-6 text-text outline-none transition-shadow duration-150 focus:ring-2 focus:ring-accent/30"
                rows={Math.min(12, draftBody.split("\n").length + 1)}
              />
            ) : (
              <div className="mt-2 rounded-lg bg-white px-3 py-2 whitespace-pre-line">
                <StreamingText key={draftGen} size="lg" tokens={words(draftBody.replace(/\n/g, " ⏎ ")).map((t) => ({ text: t.text === "⏎" ? "\n" : t.text }))} onDone={() => setDraftStreamed(true)} />
              </div>
            )}
            <div className="mt-4">
              {approved ? (
                <p className="flex items-center gap-2 text-[14px] text-soft" style={{ animation: "fade-in 200ms ease-out both" }}><Check className="size-3.5 text-ink" strokeWidth={2.5} /> Approved · nothing is sent from Slipstream</p>
              ) : (
                <Button variant="primary" onClick={() => { actions.approveDraft(call.id); onDraftApproved(); }}>{email ? "Approve reply" : "Approve follow-up"}</Button>
              )}
            </div>
          </div>
        );
      case "icp":
        if (st.status !== "done") return null;
        return (
          <div>
            <p className="text-[15px] text-ink">{icp.sentence}</p>
            <p className="mt-1 text-[14px] text-soft">From {icp.wonDeals} won deals</p>
            {call.icp && (
              <ul className="mt-4 flex flex-col gap-1.5">
                {[["Industry", call.icp.industry], ["Size", call.icp.headcount_band + " staff"], ["Buyer", call.icp.role], ["Trigger", call.icp.trigger ?? "None"]].map(([k, v]) => (
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
                <li key={l.id} className="grid h-9 grid-cols-[minmax(0,1fr)_44px] items-center gap-x-2.5 rounded-lg px-2 transition-colors duration-150 hover:bg-white">
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
            <li key={st.id} className="flex gap-4" style={{ animation: "fade-up 200ms ease-out both" }}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line" />
              <p className="pt-1 text-[14px] text-faint">{st.note}</p>
            </li>
          );
        }
        return (
          <TraceStep
            key={st.id}
            status={st.status}
            workingLabel={labels(st.id).working}
            doneLabel={doneLabel(st.id)}
            summary={summary(st)}
            rows={st.status === "running" ? trace[st.id] : []}
            rowsDone={st.progress ?? 0}
            startedAt={st.startedAt}
            elapsedMs={st.elapsedMs}
            expanded={open === st.id && st.status !== "pending"}
            onToggle={() => toggle(st.id)}
            last={last && !skippedNote}
            shimmer={st.id === "transcribe"}
            onReveal={onReveal}
            onExpandClick={onExpandClick}
          >
            {card(st)}
          </TraceStep>
        );
      })}
    </ol>
  );
}
