import type { Integration, TeamMember, Workspace } from "@/lib/types/settings";

export const workspace: Workspace = { name: "Harbourline IT", timezone: "Australia/Melbourne", currency: "AUD" };

export const team: TeamMember[] = [
  { id: "sam", name: "Sam Whitfield", email: "sam@harbourline.example", role: "Senior AE", status: "active" },
  { id: "jordan", name: "Jordan Lee", email: "jordan@harbourline.example", role: "AE", status: "active" },
  { id: "maxim", name: "Maxim Durand", email: "maxim@harbourline.example", role: "Admin", status: "active" },
];

export const integrations: Integration[] = [
  { id: "origami", name: "Origami", purpose: "Lead discovery from the ICP brief", kind: "key" },
  { id: "elevenlabs", name: "ElevenLabs", purpose: "Transcription (Scribe) and the live coach", kind: "key" },
  { id: "supabase", name: "Supabase", purpose: "The CRM tables behind every screen", kind: "connection" },
  { id: "anthropic", name: "Anthropic", purpose: "Extraction, scorecards, drafts", kind: "connection" },
];

export const hubspot = { portalId: "48213977", lastSyncMinutesAgo: 2, objects: ["Contacts", "Companies", "Deals", "Calls", "Notes", "Tasks"] };
