// Mirrors `public_session` in api/app/services/coach_store.py.

export type CoachSuggestionStatus =
  | "queued"
  | "shown"
  | "asked"
  | "answered"
  | "mentioned"
  | "done"
  | "dismissed"
  | "superseded";

export type CoachSuggestion = {
  id: string;
  intent: string;
  kind: "ask" | "mention";
  text: string;
  reason: string;
  evidence_ids: string[];
  status: CoachSuggestionStatus;
  priority: number;
  quote?: string;
};

export type CoachTurn = {
  sequence: number;
  role: "rep" | "prospect" | "unknown";
  text: string;
  start_ms: number;
  end_ms: number;
};

export type CoachFact = { topic: string; text: string; sequence: number; quote: string };

export type CoachSession = {
  id: string;
  status: "ready" | "live" | "paused" | "ended";
  created_at: string;
  updated_at: string;
  audio_mode: "both" | "system" | "mic";
  context: {
    customer: { name?: string; company?: string; role?: string };
    brief: string;
    sources: { id: string; kind: string; label: string; text: string }[];
  };
  state: {
    suggestions: CoachSuggestion[];
    turns: CoachTurn[];
    commitments: CoachFact[];
    analysis_status: "waiting" | "ready" | "unavailable";
  };
  conversation_id: string | null;
  recording_status: "not_uploaded" | "stored" | "transcribed_local";
  model: string | null;
  last_analysis_ms: number | null;
};

export type CoachLaunch = { session: CoachSession; handoff_token: string };
