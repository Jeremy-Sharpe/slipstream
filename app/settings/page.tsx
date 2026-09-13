import type { Metadata } from "next";
import { Frame } from "@/components/Frame";
import { SettingsView } from "@/components/SettingsView";

export const metadata: Metadata = { title: "Settings · Slipstream" };

export default function SettingsPage() {
  return (
    <Frame>
      <SettingsView />
    </Frame>
  );
}
