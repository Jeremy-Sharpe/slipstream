"use client";

import { GetStarted } from "@/components/home/GetStarted";
import { RecentSection } from "@/components/home/RecentSection";
import { useAddCall } from "@/components/home/useAddCall";

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
