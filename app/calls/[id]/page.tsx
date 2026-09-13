"use client";

import { notFound, useParams } from "next/navigation";
import { RunView } from "@/components/RunView";
import { useStore } from "@/lib/store";

export default function CallPage() {
  const { id } = useParams<{ id: string }>();
  const { calls } = useStore();
  const call = calls.find((c) => c.id === id);
  if (!call) notFound();
  return <RunView key={call.id} call={call} />;
}
