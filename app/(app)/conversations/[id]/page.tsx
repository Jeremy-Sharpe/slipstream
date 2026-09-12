import { ConversationDetail } from "@/components/conversations/detail/ConversationDetail";
import { PendingConversation } from "@/components/conversations/detail/PendingConversation";
import { callById, calls } from "@/lib/data/calls";

export function generateStaticParams() {
  return calls.map((c) => ({ id: c.id }));
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const others = calls.map((c) => ({ id: c.id, company: c.company, prospect: c.prospect }));
  const call = callById(id);
  if (call) return <ConversationDetail call={call} others={others} />;
  // Not a fixture: it may be a call added in this session (client store only).
  return <PendingConversation id={id} others={others} />;
}
