"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import recordings from "@/lib/data/recordings.json";
import { cn, mmss } from "./ui";

export type Recording = { src: string; seconds: number; voices: string };

const RECORDINGS: Record<string, Recording> = recordings;

/** The published recording for a fixture call id, if one ships with the web app. */
export function recordingFor(callId: string | undefined): Recording | undefined {
  return callId ? RECORDINGS[callId] : undefined;
}

// One recording plays at a time across the page.
let current: HTMLAudioElement | null = null;

/** Play/pause with a scrubber. `compact` is the icon-only button for list rows. */
export function CallRecording({ recording, label, compact = false, className }: { recording: Recording; label: string; compact?: boolean; className?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = audio.current;
    return () => { el?.pause(); if (current === el) current = null; };
  }, []);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (!el.paused) { el.pause(); return; }
    if (current && current !== el) current.pause();
    current = el;
    el.play().catch(() => setFailed(true));
  };

  const icon = playing ? <Pause className="size-3.5" strokeWidth={2} /> : <Play className="size-3.5 translate-x-px" strokeWidth={2} />;
  const button = (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      aria-label={`${playing ? "Pause" : "Play"} the recording of ${label}`}
      title={failed ? "The recording could not be played" : `${playing ? "Pause" : "Play"} the recording`}
      disabled={failed}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        playing ? "bg-accent text-accent-ink" : "bg-white text-ink shadow-[inset_0_0_0_1px_#e8e8e8] hover:bg-surface-2",
        failed && "cursor-default opacity-40",
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <audio
        ref={audio}
        src={recording.src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setAt(0); }}
        onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
        onError={() => { setPlaying(false); setFailed(true); }}
      />
      {button}
      {!compact && (
        <>
          <input
            type="range"
            min={0}
            max={recording.seconds}
            step={1}
            value={Math.floor(at)}
            aria-label={`Position in the recording of ${label}`}
            onChange={(e) => {
              const el = audio.current;
              if (el) el.currentTime = Number(e.target.value);
              setAt(Number(e.target.value));
            }}
            className="h-1 w-40 cursor-pointer accent-accent"
          />
          <span className="text-[12.5px] tabular-nums text-soft">
            {mmss(Math.floor(at))} / {mmss(Math.round(recording.seconds))}
          </span>
        </>
      )}
    </div>
  );
}
