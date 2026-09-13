"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { talkRatioFromTurns } from "@/lib/adapters";
import type { CallRecord, Field } from "@/lib/types";
import { traceFor, type RunData, type StepId, type StepState } from "@/lib/useRun";
import { TraceStep } from "./run/TraceStep";
import { WorkingLine } from "./run/WorkingLine";
import { StreamingText, words } from "./run/StreamingText";
import { humanize, Button, Score, cn, mmss } from "./ui";

/** What a gate button says while its request is in flight. */
const WORKING: Record<string, string> = {
  "Approve & sync to CRM": "Syncing to CRM",
  "Approve follow-up": "Approving",
  "Approve reply": "Approving",
};

const LABELS: Record<StepId, { working: string; done: string }> = {
  transcribe: { working: "Transcribing", done: "Transcribed" },
  extract: { working: "Extracting fields", done: "Extracted fields" },
  score: { working: "Scoring the call", done: "Scored the call" },
  draft: { working: "Drafting the follow-up", done: "Follow-up drafted" },
  icp: { working: "Updating the ICP", done: "ICP updated" },
  search: { working: "Searching leads like the ones you closed", done: "Found leads like the ones you closed" },
  outreach: { working: "Drafting outreach", done: "Outreach drafted" },
};

/** A thread reads the same steps differently: nothing is transcribed, and the follow-up is a reply. */
const EMAIL_LABELS: Partial<Record<StepId, { working: string; done: string }>> = {
  transcribe: { working: "Reading the thread", done: "Read the thread" },
  extract: { working: "Filing the thread", done: "Filed to CRM" },
  draft: { working: "Drafting the reply", done: "Reply drafted" },
};

const fmtAud = (n: number | null | undefined, none = "None") => (n == null ? none : `$${n.toLocaleString("en-AU")}`);
const pct = (c: number) => `${Math.round(c * 100)}%`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** Every segment after a " · " starts with a capital. */
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const narrativeSections = (s: NonNullable<CallRecord["scorecard"]>): [string, string[]][] =>
  ([["Went well", s.wentWell], ["To improve", s.toImprove]] as [string, string[]][]).filter(([, lines]) => lines.length > 0);

export function RunTimeline({ call, data, steps, open, toggle, runId, draftBody, setDraftBody, onHighlight, onJump, onReveal, onExpandClick, onRetry, onSynced, onDraftApproved }: {
  call: CallRecord;
  data: RunData;
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
  onRetry: (id: StepId) => void;
  onSynced: () => void | Promise<void>;
  onDraftApproved: () => void | Promise<void>;
}) {
  const synced = data.synced;
  const approved = data.approved;
  // The draft body streams in the first time the step completes, then edits.
  const [draftStreamed, setDraftStreamed] = useState(false);
  /* The gate the user just pressed, until its request settles: the button
     shows what it is doing instead of sitting still on camera. */
  const [pendingGate, setPendingGate] = useState<string | null>(null);
  const [draftGen, setDraftGen] = useState(0);
  // Re-stream when the run restarts or the body is replaced from outside
  // (state adjusted during render). Edits in the textarea update `edited`.
  const [seen, setSeen] = useState({ runId, body: draftBody });
  if (seen.runId !== runId || seen.body !== draftBody) {
    setSeen({ runId, body: draftBody });
    setDraftStreamed(false);
    setDraftGen((g) => g + 1);
  }

  const skippedNote = steps.find((s) => s.status === "skipped" && s.note)?.note;
  const email = call.kind === "email";
  const messages = call.messages ?? [];
  const labels = (id: StepId) => (email && EMAIL_LABELS[id]) || LABELS[id];
  const trace = traceFor(call);
  const inbound = messages.filter((m) => m.direction === "inbound").length;

  const fieldRows: { label: string; value: ReactNode; field: Field<unknown> }[] = call.fields
    ? [
        { label: "Contact", value: [call.fields.contact.value, call.title].filter(Boolean).join(" · ") || "Not stated", field: call.fields.contact },
        { label: "Company", value: [call.fields.company.value, call.headcount ? `${call.headcount} staff` : null, call.location].filter(Boolean).join(" · ") || "Not stated", field: call.fields.company },
        { label: "Deal stage", value: call.fields.stage.value ? humanize(String(call.fields.stage.value)) : "Not stated", field: call.fields.stage },
        { label: "Value", value: fmtAud(call.fields.value.value, email ? "Not stated" : "None"), field: call.fields.value },
        { label: "Next step", value: call.fields.next_step.value ?? "None", field: call.fields.next_step },
        { label: "Promises", value: call.fields.promises.value.length ? call.fields.promises.value.map(cap).join(" · ") : "None", field: call.fields.promises },
      ]
    : [];
  const filled = fieldRows.filter((row) => {
    const value = row.field.value;
    return Array.isArray(value) ? value.length > 0 : value != null;
  }).length;
  const leads = data.leads ?? [];
  const drafted = leads.filter((lead) => lead.status !== "new" && lead.status !== "rejected").length;
  const wonDeals = data.wonDeals ?? 0;

  const summary = (st: StepState): ReactNode => {
    if (st.status === "error") return st.error;
    // A step that has not run yet says nothing, even when an earlier run left data behind.
    if (st.status === "pending" || st.status === "running") return "";
    switch (st.id) {
      case "transcribe": return email
        ? `${plural(messages.length, "message")} · ${inbound} inbound`
        : `${mmss(call.duration)} · ${plural(call.turns.length, "turn")} · Talk ratio ${pct(call.scorecard?.talkRatio ?? talkRatioFromTurns(call.turns))}`;
      case "extract":
        if (synced) return "Synced to CRM";
        return st.status === "waiting" ? "Waiting for your approval" : "";
      case "score": {
        const s = call.scorecard;
        if (!s) return "";
        return `${plural(s.discovery, "discovery question")} · ${s.nextStepSecured ? "Next step secured" : "No dated next step"} · Talk ratio ${pct(s.talkRatio)}`;
      }
      case "draft": return approved ? "Approved · Nothing is sent" : st.status === "waiting" ? "Waiting for your approval" : call.draft?.subject ?? "";
      case "icp": return data.icp ? `From ${plural(wonDeals, "won deal")}` : "";
      case "search": return st.status === "done" ? "Scored against the won deals" : "";
      case "outreach": return st.status === "done" ? `${plural(drafted, "draft")} ready` : "";
    }
  };

  const doneLabel = (st: StepState) => {
    const { id } = st;
    if (id === "extract" && !email) return `Extracted ${plural(filled, "field")}`;
    if (id === "search" && st.status === "done") return `Found ${plural(leads.length, "lead")} like the ones you closed`;
    return labels(id).done;
  };

  // The evidence column: a timestamp on a call, a message number on a thread.
  const ref = (f: { evidence_ms?: number | null; evidence_ref?: number | null }) =>
    email ? (f.evidence_ref != null ? `Msg ${f.evidence_ref + 1}` : "") : f.evidence_ms != null ? mmss(Math.round(f.evidence_ms / 1000)) : "";
  const field = (label: string, value: ReactNode, conf: number, span: number | null, evidence: string) => (
    <button
      key={label}
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

  const plainRow = (label: string, value: ReactNode) => (
    <div key={label} className="grid w-full grid-cols-[92px_minmax(0,1fr)] items-start gap-x-3 rounded-lg px-2 py-1.5 text-left">
      <span className="pt-px text-[14px] text-soft">{label}</span>
      <span className="min-w-0 text-[15px] text-ink">{value}</span>
    </div>
  );

  const gate = (label: string, doneLine: string, note: string | undefined, onClick: () => void | Promise<void>, isDone: boolean) => {
    const pending = pendingGate === label;
    const press = async () => {
      setPendingGate(label);
      try {
        await onClick();
      } finally {
        setPendingGate(null);
      }
    };
    return (
      <div className="mt-4">
        {isDone ? (
          <div style={{ animation: "fade-in 200ms ease-out both" }}>
            <p className="flex items-center gap-2 text-[14px] text-soft"><Check className="size-3.5 text-ink" strokeWidth={2.5} /> {doneLine}</p>
            {note && <p className="mt-1 text-[13.5px] text-faint">{note}</p>}
          </div>
        ) : (
          <Button variant="primary" disabled={pending} className="disabled:opacity-100" onClick={press}>
            {pending ? (
              <>
                <span aria-hidden className="inline-block size-3.5 shrink-0 rounded-full border-[1.5px] border-accent-ink/25 border-t-accent-ink" style={{ animation: "spin 700ms linear infinite" }} />
                {WORKING[label] ?? "Working"}
              </>
            ) : label}
          </Button>
        )}
      </div>
    );
  };

  const card = (st: StepState): ReactNode => {
    if (st.status === "error") {
      return (
        <div>
          <p className="text-[14px] text-soft">{st.error}</p>
          <div className="mt-3"><Button onClick={() => onRetry(st.id)}>Try again</Button></div>
        </div>
      );
    }
    switch (st.id) {
      case "transcribe":
        if (email) return <p className="text-[14px] text-soft">Read {plural(messages.length, "message")}, {inbound} from {call.contact.split(" ")[0]} and {messages.length - inbound} from {call.rep.split(" ")[0]}.{call.responseTime ? ` ${call.rep.split(" ")[0]} replied in ${call.responseTime}.` : ""}</p>;
        return <p className="text-[14px] text-soft">Diarised into {plural(call.turns.length, "turn")}. {call.rep} spoke {pct(call.scorecard?.talkRatio ?? talkRatioFromTurns(call.turns))} of the time.</p>;
      case "extract": {
        if (st.status !== "done" && st.status !== "waiting") return null;
        if (email) {
          const records = data.records ?? [];
          const first = records[0];
          return (
            <div>
              <div className="-mx-2 flex flex-col">
                {plainRow("Contact", call.contact)}
                {plainRow("Email", first?.contact_email ?? call.email ?? "Not stated")}
                {plainRow("Company", call.company)}
                {plainRow("Thread", first?.subject ?? call.turns[0]?.text.slice(0, 60) ?? "")}
                {plainRow("Messages", plural(records.length || messages.length, "message"))}
                {plainRow("CRM deal", first?.deal_external_id ?? "Not stated")}
              </div>
              {gate("Approve & sync to CRM", "Filed to CRM · The thread is on the deal", data.crmNote, onSynced, synced)}
            </div>
          );
        }
        if (!call.fields) return null;
        return (
          <div>
            <div className="-mx-2 flex flex-col">
              {fieldRows.map((row) => field(row.label, row.value, row.field.confidence, row.field.span, ref(row.field)))}
              {call.objections?.[0] && field(
                "Objection",
                `${call.objections[0].text} (${humanize(call.objections[0].handling)})`,
                0.9,
                call.scorecard?.spans.objection ?? null,
                ref(email
                  ? { evidence_ref: call.scorecard?.spans.objection ?? null }
                  : { evidence_ms: call.scorecard?.spans.objection != null ? call.turns[call.scorecard.spans.objection].t * 1000 : null }),
              )}
            </div>
            {gate("Approve & sync to CRM", `Synced to CRM · ${plural(filled, "field")} written`, data.crmNote, onSynced, synced)}
          </div>
        );
      }
      case "score": {
        if (st.status !== "done" || !call.scorecard) return null;
        const s = call.scorecard;
        const row = (label: string, value: string, span: number | null) => (
          <button key={label} type="button" className="grid w-full grid-cols-[minmax(0,1fr)_96px] items-center gap-x-3 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40" onMouseEnter={() => onHighlight(span)} onMouseLeave={() => onHighlight(null)} onClick={() => span != null && onJump(span)}>
            <span className="text-[14px] text-soft">{label}</span>
            <span className="text-right text-[15px] tabular-nums text-ink">{value}</span>
          </button>
        );
        return (
          <div className="-mx-2 flex flex-col">
            {row("Discovery questions before pricing", String(s.discovery), s.spans.discovery)}
            {row("Next step secured", s.nextStepSecured ? "Yes, dated" : "No", s.spans.nextStep)}
            {row("Objection handling", humanize(s.objection), s.spans.objection)}
            {row("Rep talk ratio", pct(s.talkRatio), null)}
            {s.summary && <p className="mt-3 px-2 text-[14px] leading-6 text-ink">{s.summary}</p>}
            {(s.wentWell.length > 0 || s.toImprove.length > 0) && (
              <div className="mt-2 grid gap-3 px-2 sm:grid-cols-2">
                {narrativeSections(s).map(([label, lines]) => (
                  <div key={label}>
                    <p className="text-[12px] font-medium uppercase tracking-wide text-soft">{label}</p>
                    <ul className="mt-1 flex flex-col gap-1 text-[14px] leading-5 text-ink">
                      {lines.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case "draft":
        if ((st.status !== "done" && st.status !== "waiting") || !call.draft) return null;
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
            {gate(email ? "Approve reply" : "Approve follow-up", "Approved · Nothing is sent from Slipstream", undefined, onDraftApproved, approved)}
          </div>
        );
      case "icp": {
        if (st.status !== "done" || !data.icp) return null;
        const profile = data.icp.profile;
        return (
          <div>
            <p className="text-[15px] text-ink">{profile.summary}</p>
            <p className="mt-1 text-[14px] text-soft">From {plural(wonDeals, "won deal")}{data.icpStatus ? ` · Profile ${data.icpStatus}` : ""}</p>
            <ul className="mt-4 flex flex-col gap-1.5">
              {[["Industry", profile.industries.join(", ")], ["Size", `${profile.headcount_band} staff`], ["Buyer", profile.roles.join(", ")], ["Trigger", profile.triggers[0] ?? "None"]].map(([k, v]) => (
                <li key={k} className="grid grid-cols-[20px_72px_minmax(0,1fr)] items-center gap-x-1 text-[14px]">
                  <Check className={cn("size-3.5", call.outcome === "won" ? "text-success" : "text-faint")} strokeWidth={2.25} />
                  <span className="text-soft">{k}</span>
                  <span className="text-ink">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      }
      case "search":
        if (st.status === "running") return <WorkingLine label="Ranking leads against the deals you won" startedAt={st.startedAt} />;
        if (st.status !== "done") return null;
        if (leads.length === 0) return <p className="text-[14px] text-soft">No leads on this profile yet. <Link href="/leads" className="text-ink underline-offset-2 hover:underline">Find some in Leads →</Link></p>;
        return (
          <div>
            <ul className="-mx-2 flex flex-col">
              {leads.slice(0, 5).map((lead) => (
                <li key={lead.id} className="grid h-9 grid-cols-[minmax(0,1fr)_44px] items-center gap-x-2.5 rounded-lg px-2 transition-colors duration-150 hover:bg-white">
                  <span className="min-w-0 truncate text-[15px] text-ink">{lead.company_name} <span className="text-soft">· {lead.title ?? "Unknown role"}</span></span>
                  <span className="text-right"><Score value={Math.round((lead.similarity_score ?? 0) * 100)} /></span>
                </li>
              ))}
            </ul>
            {!!data.leadsNeedRescore && (
              <p className="mt-3 text-[13.5px] text-faint">{plural(data.leadsNeedRescore, "lead")} still scored against an earlier version of the profile.</p>
            )}
            <Link href="/leads" className="mt-3 inline-block text-[14px] text-soft underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline">See all {leads.length} in Leads →</Link>
          </div>
        );
      case "outreach":
        if (st.status !== "done") return null;
        return <p className="text-[14px] text-soft">{drafted === 0 ? "No outreach drafted yet." : `${plural(drafted, "draft")} reuse the language from the calls you won.`} <Link href="/leads" className="text-ink underline-offset-2 hover:underline">Review in Leads →</Link></p>;
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
            doneLabel={st.status === "error" ? labels(st.id).working : doneLabel(st)}
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
