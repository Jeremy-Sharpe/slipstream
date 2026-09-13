import type { Integration, TeamMember, Workspace } from "@/lib/types/settings";

export const workspace: Workspace = { name: "Eleno", timezone: "Australia/Melbourne", currency: "AUD" };

export const team: TeamMember[] = [
  { id: "sam", name: "Sam Whitfield", email: "sam@eleno.example", role: "Senior AE", status: "active" },
  { id: "jordan", name: "Jordan Lee", email: "jordan@eleno.example", role: "AE", status: "active" },
  { id: "maxim", name: "Maxim Durand", email: "maxim@eleno.example", role: "Admin", status: "active" },
];

export const integrations: Integration[] = [
  { id: "origami", name: "Origami", purpose: "Lead discovery from the ICP brief", kind: "key" },
  { id: "elevenlabs", name: "ElevenLabs", purpose: "Transcription (Scribe) and the live coach", kind: "key" },
  { id: "supabase", name: "Supabase", purpose: "The CRM tables behind every screen", kind: "connection" },
  { id: "anthropic", name: "Anthropic", purpose: "Extraction, scorecards, drafts", kind: "connection" },
];

// The CRM surface is our own Supabase tables plus an optional outbound
// webhook. Both states come from the API's /ready integration flags, so the
// panel never claims a connection that is not configured.
export const crmIntegrations: { id: string; name: string; initials: string; purpose: string }[] = [
  { id: "supabase", name: "CRM tables", initials: "Db", purpose: "Contacts, companies, deals, calls, notes, tasks and emails, stored in Supabase." },
  { id: "crm_webhook", name: "CRM write-back webhook", initials: "Wh", purpose: "Posts approved calls, notes, tasks and drafts to an external CRM." },
];

export const crmObjects = ["Contacts", "Companies", "Deals", "Calls", "Notes", "Tasks", "Emails"];
