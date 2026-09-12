"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { ConversationDetail } from "./ConversationDetail";
import { callById } from "@/lib/data/calls";
import { useConversations } from "@/lib/store/conversations";

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
      <div className="flex flex-col items-center gap-3 px-8 pt-[120px] text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-[16px] text-muted-foreground">Transcribing {row.company}. Fields and the follow-up appear here when it finishes.</p>
        <Link href="/" className="text-[15px] text-foreground underline underline-offset-4 transition-colors duration-150 hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">Back to conversations</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 px-8 pt-[120px] text-center">
      <p className="text-[16px] text-muted-foreground">That conversation isn&apos;t here. It may have been deleted, or the link is wrong.</p>
      <Link href="/" className="text-[15px] text-foreground underline underline-offset-4 transition-colors duration-150 hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">Back to conversations</Link>
    </div>
  );
}
