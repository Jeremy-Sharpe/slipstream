"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RunView } from "@/components/RunView";
import { Button } from "@/components/ui";
import Loading from "./loading";
import { fixtureConversationId } from "@/lib/adapters";
import {
  ApiError,
  getCall,
  getDraft,
  getEmailThread,
  getExtraction,
  getFixtures,
  getScorecard,
  ingestFixtureCall,
  type ApiCall,
} from "@/lib/api/slipstream";
import { demoThread, demoThreadMessages } from "@/lib/conversations";
import { entryForCall, ingestEmailThread } from "@/lib/ingest";
import { getEntry, getRun, registerConversation, useConversations } from "@/lib/store/conversations";
import type { RunSource } from "@/lib/useRun";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type State = { status: "loading" } | { status: "error"; message: string } | { status: "missing" } | { status: "ready"; source: RunSource };

export default function CallPage() {
  const { id } = useParams<{ id: string }>();
  // Subscribing keeps the page honest about entries this browser created.
  useConversations();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async (): Promise<State> => {
    const entry = getEntry(id);
    const stored = getRun(id);
    const demo = demoThread(id);

    if (entry?.kind === "email" || demo) {
      const thread = entry?.thread ?? (demo
        ? { provider: demo.provider, mailbox_external_id: demo.mailboxExternalId, thread_external_id: demo.threadExternalId }
        : undefined);
      if (!thread) return { status: "missing" };
      let records = await getEmailThread(thread.provider, thread.mailbox_external_id, thread.thread_external_id);
      if (records.length === 0 && demo) {
        // The demo threads are real ingest payloads, sent the first time one is opened.
        const ingested = await ingestEmailThread(demoThreadMessages(demo), {
          id: demo.id,
          subject: demo.subject,
          company: demo.company,
          contact: demo.contact,
        });
        records = ingested.records;
        registerConversation(ingested.entry);
      }
      if (records.length === 0) return { status: "missing" };
      const draft = stored?.draftId ? await getDraft(stored.draftId) : null;
      return {
        status: "ready",
        source: {
          id,
          kind: "email",
          thread,
          records,
          company: entry?.company ?? demo?.company,
          draft: draft ?? undefined,
          synced: stored?.synced,
          approved: stored?.approved,
        },
      };
    }

    let call: ApiCall;
    try {
      // The API answers 422 for an id that is not a UUID, so skip the request.
      if (!UUID.test(id)) throw new ApiError("Not a call id", 422);
      call = await getCall(id);
    } catch (error) {
      // 404 is unknown; 400/422 is an id the API will not even parse.
      if (!(error instanceof ApiError) || ![400, 404, 422].includes(error.status)) throw error;
      // A fixture the browser has never opened is not ingested yet.
      const fixture = (await getFixtures()).find((item) => fixtureConversationId(item.call_id) === id);
      if (!fixture) return { status: "missing" };
      call = await ingestFixtureCall(fixture.call_id);
      registerConversation(entryForCall(call, { company: fixture.company, contact: fixture.prospect }));
    }

    const [extraction, draft] = await Promise.all([
      getExtraction(call.id),
      stored?.draftId ? getDraft(stored.draftId) : Promise.resolve(null),
    ]);
    const scorecard = await getScorecard(call.source_external_id);

    return {
      status: "ready",
      source: {
        id: call.id,
        kind: "call",
        call,
        extraction: extraction ?? undefined,
        scorecard: scorecard ?? undefined,
        draft: draft ?? undefined,
        extracted: !!extraction,
        synced: stored?.synced,
        approved: stored?.approved,
      },
    };
  }, [id]);

  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    load()
      .then((next) => { if (live) setState(next); })
      .catch((error: unknown) => {
        if (!live) return;
        const message = error instanceof Error && error.message && !error.message.startsWith("[object") ? error.message : "The conversation could not be loaded";
        setState({ status: "error", message });
      });
    return () => { live = false; };
  }, [load, attempt]);

  if (state.status === "loading") return <Loading />;

  if (state.status === "missing") {
    return (
      <div className="pt-24 text-center text-[14px] text-faint">
        That conversation isn&apos;t here. <Link href="/conversations" className="text-ink underline-offset-2 hover:underline">Back to Conversations</Link>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="pt-24 text-center">
        <p className="text-[14px] text-soft">{state.message}</p>
        <Button className="mt-4" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
      </div>
    );
  }

  return <RunView key={state.source.id} source={state.source} />;
}
