import { notFound } from "next/navigation";
import { ConversationDetail } from "@/components/conversations/detail/ConversationDetail";
import { callById, calls } from "@/lib/data/calls";

export function generateStaticParams() {
  return calls.map((c) => ({ id: c.id }));
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = callById(id);
  if (!call) notFound();
  const others = calls.map((c) => ({ id: c.id, company: c.company, prospect: c.prospect }));
  return <ConversationDetail call={call} others={others} />;
}
