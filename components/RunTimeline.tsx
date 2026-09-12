"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { icp } from "@/lib/icp";
import { leads } from "@/lib/leads";
import { actions, useStore } from "@/lib/store";
import type { CallRecord } from "@/lib/types";
import type { StepId, StepState } from "@/lib/useRun";
import { CompanyTile } from "./Avatar";
import { Button, Score, cn, mmss } from "./ui";

const TITLES: Record<StepId, string> = {
  transcribe: "Transcribed",
  extract: "Extracted 6 fields",
  score: "Scored the call",
  draft: "Follow-up drafted",
  icp: "ICP updated",
  search: "Searching leads like the 5 you closed",
  outreach: "Outreach drafted",
};

function Glyph({ status }: { status: StepState["status"] }) {
  if (status === "done") return <span className="flex size-5 items-center justify-center rounded-full bg-ink text-white"><Check className="size-3" strokeWidth={2.5} /></span>;
  if (status === "running") return <span className="flex size-5 items-center justify-center"><span className="pulse-dot size-2.5 rounded-full bg-accent" /></span>;
  if (status === "skipped") return <span className="flex size-5 items-center justify-center"><span className="size-2.5 rounded-full border border-line" /></span>;
  return <span className="flex size-5 items-center justify-center"><span className="size-2.5 rounded-full border-[1.5px] border-line" /></span>;
}

const fmtAud = (n: number | null | undefined) => (n == null ? "—" : `$${n.toLocaleString("en-AU")}`);
const pct = (c: number) => `${Math.round(c * 100)}%`;

export function RunTimeline({ call, steps, open, toggle, finished, onHighlight }: {
  call: CallRecord;
  steps: StepState[];
  open: StepId | null;
  toggle: (id: StepId) => void;
  finished: boolean;
  onHighlight: (i: number | null) => void;
}) {
  const store = useStore();
  const synced = !!store.synced[call.id];
  const approved = !!store.approved[call.id];
  const [body, setBody] = useState(call.draft.body);
  const top = leads.slice(0, 5);
  const search = steps.find((s) => s.id === "search")!;
  const skippedNote = steps.find((s) => s.status === "skipped" && s.note)?.note;

  const summary = (id: StepId, st: StepState): ReactNode => {
    switch (id) {
      case "transcribe": return `${mmss(call.duration)} · ${call.turns.length} turns · Scribe`;
      case "extract": return synced ? "Synced to HubSpot" : "Waiting for your approval";
      case "score": return `${call.scorecard.discovery} discovery questions · ${call.scorecard.nextStepSecured ? "next step secured" : "no dated next step"} · talk ratio ${pct(call.scorecard.talkRatio)}`;
      case "draft": return approved ? "Approved · nothing is sent" : call.draft.subject;
      case "icp": return `${icp.sentence.split(" with ")[0]} · v${icp.version}`;
      case "search": return st.status === "running" ? `${st.progress ?? 0} of 10 found` : st.status === "done" ? "10 leads found" : "";
      case "outreach": return st.status === "done" ? "5 drafts ready" : "";
    }
  };

  const title = (id: StepId) => {
    if (id === "extract" && synced) return "Synced 6 fields to HubSpot";
    if (id === "draft" && approved) return "Follow-up approved";
    if (id === "search" && steps.find((s) => s.id === "search")?.status === "done") return "Found 10 leads like the 5 you closed";
    return TITLES[id];
  };

  const field = (label: string, value: ReactNode, conf: number, span: number | null) => (
    <div
      className="grid grid-cols-[96px_minmax(0,1fr)_40px] items-start gap-x-3 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white"
      onMouseEnter={() => onHighlight(span)}
      onMouseLeave={() => onHighlight(null)}
    >
      <p className="pt-px text-[13.5px] text-soft">{label}</p>
      <p className="min-w-0 text-[14px] text-ink">{value}</p>
      <span className="pt-px text-right text-[13.5px] tabular-nums text-soft">{pct(conf)}</span>
    </div>
  );

  const body_ = (id: StepId): ReactNode => {
    const f = call.fields;
    switch (id) {
      case "transcribe":
        return <p className="text-[13px] text-soft">Diarised into {call.turns.length} turns. {call.rep} spoke {pct(call.scorecard.talkRatio)} of the time.</p>;
      case "extract":
        return (
          <div>
            <div className="-mx-2 flex flex-col">
              {field("Contact", `${f.contact.value} · ${call.title}`, f.contact.confidence, f.contact.span)}
              {field("Company", `${f.company.value} · ${call.headcount} staff · ${call.location}`, f.company.confidence, f.company.span)}
              {field("Deal stage", f.stage.value, f.stage.confidence, f.stage.span)}
              {field("Value", fmtAud(f.value.value), f.value.confidence, f.value.span)}
              {field("Next step", f.next_step.value ?? "—", f.next_step.confidence, f.next_step.span)}
              {field("Promises", f.promises.value.length ? f.promises.value.join(" · ") : "—", f.promises.confidence, f.promises.span)}
              {call.objections.length > 0 && field("Objection", `${call.objections[0].text} (${call.objections[0].handling})`, 0.9, call.scorecard.spans.objection)}
            </div>
            <div className="mt-3 flex items-center gap-3">
              {synced ? <span className="text-[13px] text-soft">Synced to HubSpot</span> : <Button variant="primary" size="sm" onClick={() => actions.sync(call.id)}>Approve &amp; sync</Button>}
            </div>
          </div>
        );
      case "score": {
        const s = call.scorecard;
        const row = (label: string, value: string, span: number | null) => (
          <div className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-x-3 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white" onMouseEnter={() => onHighlight(span)} onMouseLeave={() => onHighlight(null)}>
            <span className="text-[13.5px] text-soft">{label}</span>
            <span className="text-right text-[14px] tabular-nums text-ink">{value}</span>
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
        return (
          <div>
            <p className="text-[13.5px] font-medium text-ink">{call.draft.subject}</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              readOnly={approved}
              className="mt-2 w-full resize-none rounded-lg bg-white/70 px-3 py-2 text-[14px] leading-6 text-text outline-none transition-shadow duration-150 focus:ring-2 focus:ring-accent/30"
              rows={Math.min(12, body.split("\n").length + 1)}
            />
            <div className="mt-2">
              {approved ? <span className="text-[13px] text-soft">Approved · nothing is sent</span> : <Button variant="primary" size="sm" onClick={() => actions.approveDraft(call.id)}>Approve</Button>}
            </div>
          </div>
        );
      case "icp":
        return (
          <div>
            <p className="text-[13.5px] text-ink">{icp.sentence}</p>
            <p className="mt-1 text-[13.5px] text-soft">From {icp.wonDeals} won deals · v{icp.version}</p>
            {call.icp && (
              <ul className="mt-3 flex flex-col gap-1">
                {[["Industry", call.icp.industry], ["Size", call.icp.headcount_band + " staff"], ["Buyer", call.icp.role], ["Trigger", call.icp.trigger ?? "none"]].map(([k, v]) => (
                  <li key={k} className="flex items-center gap-2 text-[13px]">
                    <Check className={cn("size-3.5", call.outcome === "won" ? "text-success" : "text-faint")} strokeWidth={2.25} />
                    <span className="w-14 text-soft">{k}</span>
                    <span className="text-ink">{v}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      case "search":
        if (search.status === "running") {
          return <p className="text-[13px] text-soft">Origami is searching Victoria for {icp.sentence.split(" with ")[0].toLowerCase()} · <span className="tabular-nums text-ink">{search.progress ?? 0} of 10</span></p>;
        }
        return (
          <div>
            <ul className="flex flex-col">
              {top.map((l) => (
                <li key={l.id} className="grid h-9 grid-cols-[24px_minmax(0,1fr)_40px] items-center gap-x-2.5 rounded-lg px-2 transition-colors duration-150 hover:bg-white">
                  <CompanyTile name={l.company} size={24} />
                  <span className="min-w-0 truncate text-[14px] text-ink">{l.company} <span className="text-soft">· {l.title}</span></span>
                  <span className="text-right"><Score value={l.similarity} /></span>
                </li>
              ))}
            </ul>
            <Link href="/leads" className="mt-2 inline-block text-[13px] text-soft underline-offset-2 hover:text-ink hover:underline">See all 10 in Leads →</Link>
          </div>
        );
      case "outreach":
        return <p className="text-[13px] text-soft">Five drafts reuse the language from the calls you won. <Link href="/leads" className="text-ink underline-offset-2 hover:underline">Review in Leads →</Link></p>;
    }
  };

  return (
    <ol className="relative">
      {steps.map((st, i) => {
        const isOpen = open === st.id && (st.status === "done" || st.status === "running");
        const last = i === steps.length - 1;
        const muted = st.status === "pending" || st.status === "skipped";
        return (
          <li key={st.id} className="relative flex gap-3 pb-1">
            <div className="flex flex-col items-center">
              <Glyph status={st.status} />
              {!last && <span className="mt-1 w-px flex-1 bg-line" />}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <button
                type="button"
                disabled={muted}
                onClick={() => toggle(st.id)}
                className="-mx-1 flex w-[calc(100%+8px)] items-baseline gap-2 rounded-md px-1 text-left transition-colors duration-150 enabled:hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <span className={cn("text-[14px] font-medium", muted ? "text-faint" : "text-ink")}>{title(st.id)}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] tabular-nums text-soft">{st.status === "skipped" ? st.note : summary(st.id, st)}</span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-200 ease-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="mt-2 rounded-xl bg-surface-2 p-3">{body_(st.id)}</div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
      {finished && skippedNote && <li className="pl-8 text-[12.5px] text-faint">{skippedNote}</li>}
    </ol>
  );
}
