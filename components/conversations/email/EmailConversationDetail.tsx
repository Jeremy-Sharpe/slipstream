"use client";

import { ArrowLeft, Check, Loader2, Mail, Server, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  API_BASE_URL,
  ApiError,
  approveDraft,
  draftEmailReply,
  getEmailThread,
  ingestEmail,
  type ApiDraft,
  type ApiEmailRecord,
} from "@/lib/api/slipstream";
import type { DemoEmailThread } from "@/lib/data/emails";

const when = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Melbourne",
  dateStyle: "medium",
  timeStyle: "short",
});

function senderLabel(message: ApiEmailRecord | DemoEmailThread["messages"][number]) {
  return message.sender.name || message.sender.email;
}

export function EmailConversationDetail({ thread }: { thread: DemoEmailThread }) {
  const [messages, setMessages] = useState<Array<ApiEmailRecord | DemoEmailThread["messages"][number]>>(thread.messages);
  const [draft, setDraft] = useState<ApiDraft>();
  const [phase, setPhase] = useState<"evaluation" | "running" | "live" | "approving" | "approved" | "sent" | "error">("evaluation");
  const [error, setError] = useState<string>();
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);

  useEffect(() => () => controller.current?.abort(), []);

  const runPipeline = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    controller.current?.abort();
    controller.current = new AbortController();
    const signal = controller.current.signal;
    setMessages(thread.messages);
    setDraft(undefined);
    setPhase("running");
    setError(undefined);
    try {
      for (const message of thread.messages) await ingestEmail(message, signal);
      const liveMessages = await getEmailThread(
        thread.provider,
        thread.mailboxExternalId,
        thread.threadExternalId,
        signal,
      );
      const liveDraft = await draftEmailReply(
        thread.provider,
        thread.mailboxExternalId,
        thread.threadExternalId,
        signal,
      );
      if (signal.aborted) return;
      setMessages(liveMessages);
      setDraft(liveDraft);
      setPhase(liveDraft.status === "sent" ? "sent" : liveDraft.status === "approved" ? "approved" : "live");
    } catch (caught) {
      if (signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "The live email pipeline did not complete");
      setPhase("error");
    } finally {
      inFlight.current = false;
    }
  };

  const approve = async () => {
    if (!draft || inFlight.current) return;
    inFlight.current = true;
    setPhase("approving");
    setError(undefined);
    try {
      const approved = await approveDraft(draft.id);
      setDraft(approved);
      setPhase(approved.status === "sent" ? "sent" : "approved");
    } catch (caught) {
      const message = caught instanceof ApiError && caught.status === 409
        ? "This draft changed before approval. Run the email pipeline again to review the latest version."
        : caught instanceof Error ? caught.message : "The approval could not be recorded";
      setError(message);
      setPhase("error");
    } finally {
      inFlight.current = false;
    }
  };

  const isBusy = phase === "running" || phase === "approving";
  const isLive = phase === "live" || phase === "approving" || phase === "approved" || phase === "sent";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-page">
      <header className="border-b border-line bg-card px-6 py-5">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-ink">
          <ArrowLeft className="size-4" /> Conversations
        </Link>
        <div className="flex items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-page">
              <Mail className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email thread</span>
                <span className="text-[12px] text-muted-foreground">{messages.length} messages</span>
              </div>
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{thread.subject}</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">{thread.contact} · {thread.company}</p>
            </div>
          </div>
          <Button onClick={() => void runPipeline()} disabled={isBusy} className="h-9 shrink-0 rounded-md px-4 text-[13px]">
            {phase === "running" ? <Loader2 className="size-4 animate-spin" /> : <Server className="size-4" />}
            {isLive ? "Run again" : "Run live email pipeline"}
          </Button>
        </div>
      </header>

      <div className="mx-6 mt-5 flex items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        {isBusy ? <Loader2 className="size-4 animate-spin text-primary" /> : isLive ? <Check className="size-4 text-primary" /> : <Server className="size-4 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-ink">
            {phase === "running" ? "Ingesting the thread and drafting from its history…" : phase === "approved" ? "Reply approved · not sent" : phase === "sent" ? "Reply sent · provider delivery recorded" : isLive ? "Live API email thread" : phase === "error" ? "Live API needs attention" : "Labelled email example ready"}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">{error ?? (isLive ? "Provider-scoped history and grounded reply returned by the deployed API" : API_BASE_URL)}</p>
        </div>
      </div>

      <main className="grid grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)] gap-6 p-6">
        <section className="space-y-4">
          {messages.map((message) => (
            <article key={"id" in message ? message.id : message.source_external_id} className={`rounded-xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] ${message.direction === "outbound" ? "ml-10" : "mr-10"}`}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[14px] font-semibold text-ink">{senderLabel(message)}</p>
                  <p className="text-[12px] text-muted-foreground">{message.sender.email} → {message.recipients.filter((recipient) => recipient.kind === "to").map((recipient) => recipient.email).join(", ")}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{message.direction}</span>
                  <p className="mt-1 text-[11px] text-muted-foreground">{when.format(new Date(message.occurred_at))}</p>
                </div>
              </div>
              <p className="mb-3 text-[13px] font-medium text-ink">{message.subject}</p>
              <p className="whitespace-pre-wrap text-[14px] leading-6 text-foreground">{message.body}</p>
            </article>
          ))}
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(17,24,39,0.05)]">
            <div className="mb-4 flex items-center gap-2"><Sparkles className="size-4 text-primary" /><h2 className="text-[14px] font-semibold text-ink">CRM-shaped mapping</h2></div>
            <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-3 text-[13px]">
              <dt className="text-muted-foreground">Contact</dt><dd className="font-medium text-ink">{thread.contact}</dd>
              <dt className="text-muted-foreground">Email</dt><dd className="break-all text-ink">{thread.messages[0].sender.email}</dd>
              <dt className="text-muted-foreground">Company</dt><dd className="text-ink">{thread.company}</dd>
              <dt className="text-muted-foreground">Role</dt><dd className="text-ink">{thread.title}</dd>
              <dt className="text-muted-foreground">Deal activity</dt><dd className="text-ink">{messages.length} emails captured</dd>
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-[11px] text-muted-foreground">{isLive ? "Live API confirmed the provider-scoped email records and primary contact email. Company and role are labelled demo account context." : "Labelled demo account context; run live to persist the email records and primary contact mapping."}</p>
          </section>

          <section className="rounded-xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(17,24,39,0.05)]">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-[14px] font-semibold text-ink">Grounded reply draft</h2>{draft && <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">Live</span>}</div>
            {draft ? (
              <div className="space-y-3">
                <div className="rounded-md border border-line bg-page px-3 py-2 text-[13px] font-medium text-ink">{draft.subject}</div>
                <div className="whitespace-pre-wrap rounded-md border border-line bg-page px-3 py-3 text-[13px] leading-5 text-foreground">{draft.body}</div>
                <p className="text-[11px] text-muted-foreground">Drafted only from this thread. Approval records an activity but does not send.</p>
                <Button onClick={() => void approve()} disabled={phase !== "live" || draft.status !== "draft"} className="w-full">
                  {phase === "approving" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {phase === "sent" ? "Sent · delivered" : phase === "approved" ? "Approved · not sent" : "Approve reply"}
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted-foreground">Run the live email pipeline to draft a reply from the complete thread.</div>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}
