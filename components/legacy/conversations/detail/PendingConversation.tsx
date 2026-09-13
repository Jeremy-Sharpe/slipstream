"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { ConversationDetail } from "./ConversationDetail";
import { callById } from "@/lib/legacy/data/calls";
import { useConversations } from "@/lib/legacy/store/conversations";

type Other = { id: string; company: string; prospect: string };

// A conversation that only exists in the session store: a copy of a recorded
// call (render its record under the new id) or an upload still transcribing.
export function PendingConversation({ id, others }: { id: string; others: Other[] }) {
  const rows = useConversations();
  const row = rows.find((r) => r.id === id);
  const source = row?.sourceId ? callById(row.sourceId) : undefined;

  if (row && source) return <ConversationDetail call={{ ...source, id }} others={others} />;

  if (row) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-8 py-32 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">{row.company}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Transcribing the recording. The transcript, CRM fields and follow-up draft appear here when the pipeline finishes.
        </p>
        <Link href="/legacy" className="mt-2 text-sm font-medium text-primary hover:underline">Back to conversations</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-8 py-32 text-center">
      <h1 className="text-lg font-semibold text-foreground">That conversation isn&apos;t here.</h1>
      <p className="text-sm text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <Link href="/legacy" className="mt-2 text-sm font-medium text-primary hover:underline">Back to conversations</Link>
    </div>
  );
}
