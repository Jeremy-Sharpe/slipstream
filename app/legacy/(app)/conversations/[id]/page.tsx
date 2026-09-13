import { ConversationDetail } from "@/components/legacy/conversations/detail/ConversationDetail";
import { EmailConversationDetail } from "@/components/legacy/conversations/email/EmailConversationDetail";
import { PendingConversation } from "@/components/legacy/conversations/detail/PendingConversation";
import { callById, calls } from "@/lib/legacy/data/calls";
import { emailById, emailThreads } from "@/lib/legacy/data/emails";

export function generateStaticParams() {
  return [...calls.map((c) => ({ id: c.id })), ...emailThreads.map((thread) => ({ id: thread.id }))];
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const others = calls.map((c) => ({ id: c.id, company: c.company, prospect: c.prospect }));
  const call = callById(id);
  if (call) return <ConversationDetail key={call.id} call={call} others={others} />;
  const email = emailById(id);
  if (email) return <EmailConversationDetail key={email.id} thread={email} />;
  // Not a fixture: it may be a call added in this session (client store only).
  return <PendingConversation id={id} others={others} />;
}
