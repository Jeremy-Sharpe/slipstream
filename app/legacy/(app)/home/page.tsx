"use client";

import { GetStarted } from "@/components/legacy/home/GetStarted";
import { RecentSection } from "@/components/legacy/home/RecentSection";
import { useAddCall } from "@/components/legacy/home/useAddCall";

export default function HomePage() {
  const addCall = useAddCall();
  return (
    <div className="flex flex-col pb-10">
      <GetStarted onAddCall={addCall.open} />
      <RecentSection onAddCall={addCall.open} />
      {addCall.mount}
    </div>
  );
}
