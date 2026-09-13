"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { coachRequest } from "@/lib/coach/api";
import type { CoachSession, CoachSuggestionStatus } from "@/lib/coach/types";

const SESSION_STATUS: Record<CoachSession["status"], string> = {
  ready: "Waiting for the desktop coach",
  live: "Live now",
  paused: "Paused",
  ended: "Call finished",
};

const SUGGESTION_STATUS: Record<CoachSuggestionStatus, string> = {
  queued: "Up next",
  shown: "On screen",
  asked: "Asked",
  answered: "Answered",
  mentioned: "Mentioned",
  done: "Marked done",
  dismissed: "Skipped",
  superseded: "Replaced",
};

const SPEAKER = { rep: "Rep", prospect: "Customer", unknown: "Speaker" } as const;

const RECORDING: Record<CoachSession["recording_status"], string> = {
  stored: "The recording was uploaded and transcribed.",
  transcribed_local: "The recording was transcribed; the audio stays on the rep's computer.",
  not_uploaded: "Saved from the live transcript; no recording was uploaded.",
};

export function CoachReview({ id }: { id: string }) {
  const [session, setSession] = useState<CoachSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const next = await coachRequest<CoachSession>(`sessions/${id}`, { signal: controller.signal });
        setSession(next);
        setError(null);
        // Keep following the call until it ends; the desktop coach writes to the same session.
        if (next.status !== "ended") timer = setTimeout(load, 3000);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load this call.");
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, attempt]);

  if (!session) {
    return (
      <div role={error ? "alert" : "status"} className="flex items-center gap-3 text-[14px] text-soft">
        {error ?? "Loading the coached call…"}
        {error && (
          <Button size="sm" onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  const { state, context } = session;
  const customer = [context.customer.name, context.customer.company].filter(Boolean).join(" · ");
  const stats: [string, number][] = [
    ["Suggestions", state.suggestions.length],
    ["Covered", state.suggestions.filter((s) => ["asked", "answered", "mentioned", "done"].includes(s.status)).length],
    ["Turns", state.turns.length],
    ["Commitments", state.commitments.length],
  ];

  return (
    <div className="flex flex-col gap-8 pb-16">
      <section>
        <p className="text-[12px] font-medium tracking-wide text-faint uppercase">{SESSION_STATUS[session.status]}</p>
        <h2 className="mt-1 text-[18px] font-semibold text-ink">{customer || "Coached call"}</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-text">{context.brief}</p>
        {session.model && (
          <p className="mt-2 text-[12.5px] text-soft">
            Advice from {session.model}
            {session.last_analysis_ms != null && ` · last analysis took ${(session.last_analysis_ms / 1000).toFixed(1)} s`}
          </p>
        )}
        {state.analysis_status === "unavailable" && session.status !== "ended" && (
          <p role="status" className="mt-2 text-[14px] text-danger">The last analysis failed. The transcript is still being saved.</p>
        )}
      </section>

      {error && (
        <p role="alert" className="text-[14px] text-danger">
          {error}{" "}
          <button type="button" className="underline" onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </button>
        </p>
      )}

      <dl className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white shadow-[var(--shadow-card)] p-4">
            <dt className="text-[12.5px] text-soft">{label}</dt>
            <dd className="mt-1 text-[20px] font-semibold tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {session.status === "ended" && (
        <p className="text-[14px] text-text">
          {session.conversation_id ? `Saved to Slipstream as a call. ${RECORDING[session.recording_status]}` : "No speech was captured, so no call was saved."}
        </p>
      )}

      <section>
        <h3 className="text-[12px] font-medium tracking-wide text-faint uppercase">What the coach suggested</h3>
        {state.suggestions.length ? (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {state.suggestions.map((s) => (
              <li key={s.id} className="rounded-2xl bg-white shadow-[var(--shadow-card)] p-4">
                <div className="flex items-center justify-between text-[12.5px] text-soft">
                  <span>{s.kind === "ask" ? "Ask" : "Mention"}</span>
                  <span>{SUGGESTION_STATUS[s.status]}</span>
                </div>
                <p className="mt-2 text-[14px] font-medium text-ink">{s.text}</p>
                <p className="mt-2 text-[12.5px] text-soft">{s.reason}</p>
                {s.quote && <blockquote className="mt-3 border-l-2 border-line pl-3 text-[12.5px] text-text">“{s.quote}”</blockquote>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[14px] text-soft">
            {session.status === "ready" ? "Suggestions appear once the rep starts listening." : "The coach has not suggested anything yet."}
          </p>
        )}
      </section>

      {state.commitments.length > 0 && (
        <section>
          <h3 className="text-[12px] font-medium tracking-wide text-faint uppercase">Commitments heard on the call</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {state.commitments.map((c) => (
              <li key={c.topic} className="text-[14px] text-ink">
                {c.text}
                <p className="mt-0.5 text-[12.5px] text-soft">“{c.quote}”</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-[12px] font-medium tracking-wide text-faint uppercase">Live transcript</h3>
        {state.turns.length ? (
          <div className="mt-3 flex max-w-3xl flex-col gap-2.5">
            {state.turns.map((t) => (
              <p key={t.sequence} className="text-[14px] leading-relaxed text-text">
                <span className="mr-2 font-medium text-ink">{SPEAKER[t.role]}</span>
                {t.text}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[14px] text-soft">No speech captured yet.</p>
        )}
      </section>
    </div>
  );
}
