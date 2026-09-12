"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { actions } from "@/lib/store";
import { Button, cn, mmss } from "./ui";

type Phase = { kind: "idle" } | { kind: "paste" } | { kind: "transcribing"; name: string; at: number; total: number };

const DEMO_DURATION = 425; // the demo recording's length, so the counter is honest

export function DropZone() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [over, setOver] = useState(false);
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Transcription is simulated: the counter runs over ~3s, then the run
  // opens with step 1 already done. The API will stream the same progress.
  const transcribe = (name: string) => {
    setPhase({ kind: "transcribing", name, at: 0, total: DEMO_DURATION });
    const ticks = 30;
    for (let i = 1; i <= ticks; i++) {
      timers.current.push(window.setTimeout(() => setPhase({ kind: "transcribing", name, at: Math.round((DEMO_DURATION * i) / ticks), total: DEMO_DURATION }), (3000 / ticks) * i));
    }
    timers.current.push(window.setTimeout(() => {
      const c = actions.addUpload(name);
      router.push(`/calls/${c.id}`);
    }, 3200));
  };

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) transcribe(f.name);
  };

  const run = () => {
    if (!text.trim()) return;
    const c = actions.addTranscript(text);
    router.push(`/calls/${c.id}`);
  };

  if (phase.kind === "transcribing") {
    const pct = Math.min(100, Math.round((phase.at / phase.total) * 100));
    return (
      <div className="rounded-2xl bg-surface-2 p-6">
        <p className="truncate text-[15px] font-semibold text-ink">{phase.name}</p>
        <p className="mt-1 text-[13px] text-soft">
          Transcribing… <span className="tabular-nums text-ink">{mmss(phase.at)} / {mmss(phase.total)}</span>
        </p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ink transition-[width] duration-100 ease-linear" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (phase.kind === "paste") {
    return (
      <div>
        <div className="rounded-2xl bg-surface-2 p-5">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the transcript…"
            rows={8}
            className="w-full resize-none bg-transparent text-[15px] leading-6 text-ink outline-none placeholder:text-faint"
          />
          <div className="mt-3 flex justify-end">
            <Button variant="primary" onClick={run} disabled={!text.trim()}>Run</Button>
          </div>
        </div>
        <button type="button" onClick={() => setPhase({ kind: "idle" })} className="mt-3 text-[13px] text-soft underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline">
          or drop a recording instead
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a call recording or choose a file"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-surface-2 px-6 py-12 text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          over ? "border-ink border-solid" : "border-line hover:border-[#d4d4d4]",
        )}
      >
        <Upload className="size-6 text-ink" strokeWidth={1.5} />
        <p className="mt-3 text-[15px] font-semibold text-ink">Drop a call recording</p>
        <p className="mt-1 text-[13px] text-soft">Audio or video · MP3, M4A, WAV, MP4</p>
        <Button className="mt-5 bg-white shadow-[inset_0_0_0_1px_#e8e8e8] hover:bg-surface-2" onClick={(e) => { e.stopPropagation(); input.current?.click(); }}>
          Choose file
        </Button>
        <input ref={input} type="file" accept="audio/*,video/*" className="sr-only" tabIndex={-1} onChange={(e) => onFiles(e.target.files)} />
      </div>
      <button type="button" onClick={() => setPhase({ kind: "paste" })} className="mt-3 text-[13px] text-soft underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline">
        or paste a transcript
      </button>
    </div>
  );
}
