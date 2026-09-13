"use client";

// The conversations list: the fixture calls and demo threads the API can always
// produce, plus whatever this browser created. There is no list endpoint, so
// the three sources are merged here and the run page resolves each id itself.
import { useEffect, useState } from "react";
import { fixtureConversationId, isMachineId, titleFromFileName } from "@/lib/adapters";
import { getFixtures, type ApiFixture, type EmailIngestInput } from "@/lib/api/slipstream";
import { emailThreads, type DemoEmailThread } from "@/lib/data/emails";
import { useConversations, type ConversationEntry, type StoredRun } from "@/lib/store/conversations";

export type ConversationRow = ConversationEntry & { run?: StoredRun };

export const demoThread = (id: string): DemoEmailThread | undefined => emailThreads.find((thread) => thread.id === id);

export const demoThreadMessages = (thread: DemoEmailThread): EmailIngestInput[] => thread.messages;

function demoEntry(thread: DemoEmailThread): ConversationEntry {
  const last = thread.messages[thread.messages.length - 1];
  return {
    id: thread.id,
    kind: "email",
    subject: thread.subject,
    company: thread.company,
    contact: thread.contact,
    at: last.occurred_at,
    thread: {
      provider: thread.provider,
      mailbox_external_id: thread.mailboxExternalId,
      thread_external_id: thread.threadExternalId,
    },
  };
}

export function fixtureEntry(fixture: ApiFixture): ConversationEntry {
  return {
    id: fixtureConversationId(fixture.call_id),
    kind: "call",
    subject: `${fixture.company} — ${fixture.prospect}`,
    company: fixture.company,
    contact: fixture.prospect,
    at: fixture.scheduled_at,
    sourceExternalId: fixture.call_id,
  };
}

/** Entries saved before the API learned to name uploads carry its ids; show them as recordings. */
function tidy(entry: ConversationEntry): ConversationEntry {
  if (entry.kind !== "call") return entry;
  const title = titleFromFileName(entry.fileName) ?? "Recording";
  return {
    ...entry,
    company: isMachineId(entry.company) ? title : entry.company,
    subject: isMachineId(entry.subject) ? title : entry.subject,
    contact: entry.contact === "Unknown contact" ? "Unnamed contact" : entry.contact,
  };
}

export function useConversationList(): { rows: ConversationRow[]; loading: boolean; error: string | null; retry: () => void } {
  const { entries, runs } = useConversations();
  const [fixtures, setFixtures] = useState<ApiFixture[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setError(null);
    getFixtures(controller.signal)
      .then((result) => { if (live) setFixtures(result); })
      .catch((cause: unknown) => {
        if (!live || controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "The conversations could not be loaded");
      });
    return () => { live = false; controller.abort(); };
  }, [attempt]);

  const base = [...(fixtures ?? []).map(fixtureEntry), ...emailThreads.map(demoEntry)];
  const byId = new Map(base.map((entry) => [entry.id, entry]));
  for (const entry of entries) byId.set(entry.id, { ...byId.get(entry.id), ...tidy(entry) });

  const rows = [...byId.values()]
    .map((entry) => ({ ...entry, run: runs[entry.id] }))
    .sort((a, b) => b.at.localeCompare(a.at));

  return { rows, loading: fixtures === null && !error, error, retry: () => setAttempt((n) => n + 1) };
}
