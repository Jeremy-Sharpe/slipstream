export type TeamRole = "Admin" | "Senior AE" | "AE" | "Viewer";
export type TeamMember = { id: string; name: string; email: string; role: TeamRole; status: "active" | "pending" };

export type IntegrationId = "origami" | "elevenlabs" | "supabase" | "anthropic";
export type Integration = { id: IntegrationId; name: string; purpose: string; kind: "key" | "connection" };

export type ApiKey = { id: string; name: string; last4: string; createdAt: string };

export type Workspace = { name: string; timezone: string; currency: string };
