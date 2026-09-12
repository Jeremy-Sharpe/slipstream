"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { actions } from "@/lib/store";
import { FileTiles } from "./home/FileTiles";
import { Recorder } from "./home/Recorder";
import { Segmented } from "./home/Segmented";
import { TypedPlaceholder } from "./home/TypedPlaceholder";
import { Button, cn, mmss } from "./ui";

type Mode = "upload" | "record" | "paste";
type Phase = { kind: "idle" } | { kind: "transcribing"; name: string; at: number; total: number };

const DEMO_DURATION = 425; // the demo recording's length, so the counter is honest
const MODES: { key: Mode; label: string }[] = [
  { key: "upload", label: "Upload file" },
  { key: "record", label: "Record" },
  { key: "paste", label: "Paste transcript" },
];

// One card, one size: 300px tall in every state so switching never moves the page.
const CARD = "relative mx-auto flex h-[220px] w-full max-w-[560px] flex-col items-center justify-center rounded-2xl bg-surface motion-safe:animate-[fade-up_200ms_cubic-bezier(0.23,1,0.32,1)_both]";

export function DropZone() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("upload");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [over, setOver] = useState(false);
  const [text, setText] = useState("");
  const [pasteFocused, setPasteFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const attach = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Transcription is simulated: the counter runs over ~3s, then the run opens
  // with step 1 already done. The API will stream the same progress.
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

  const useRecording = () => {
    const d = new Date();
    transcribe(`Recording ${d.getDate()} ${d.toLocaleString("en-AU", { month: "short" })} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}.m4a`);
  };

  // The "+" in Paste: media starts transcribing; a text transcript loads in.
  const onAttach = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (/\.(txt|vtt|srt)$/i.test(f.name) || f.type.startsWith("text/")) setText(await f.text());
    else transcribe(f.name);
  };

  const run = () => {
    if (!text.trim()) return;
    const c = actions.addTranscript(text);
    router.push(`/calls/${c.id}`);
  };

  return (
    <div className="text-center">
      <div className="mb-5"><Segmented value={mode} options={MODES} onChange={setMode} /></div>

      {phase.kind === "transcribing" ? (
        <div key="transcribing" className={cn(CARD, "px-8 text-left")}>
          <div className="w-full max-w-[400px]">
            <p className="truncate text-[15px] font-semibold text-ink">{phase.name}</p>
            <p className="mt-1 text-[13px] text-soft">
              Transcribing… <span className="tabular-nums text-ink">{mmss(phase.at)} / {mmss(phase.total)}</span>
            </p>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-ink transition-[width] duration-100 ease-linear" style={{ width: `${Math.min(100, Math.round((phase.at / phase.total) * 100))}%` }} />
            </div>
          </div>
        </div>
      ) : mode === "upload" ? (
        <div
          key="upload"
          role="button"
          tabIndex={0}
          aria-label="Drop a call recording or choose a file"
          onClick={() => input.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}
          className={cn(CARD, "cursor-pointer border border-dashed outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2", over ? "border-solid border-ink" : "border-line hover:border-[#d4d4d4]")}
        >
          <FileTiles lifted={over} />
          <p className="mt-4 text-[15px] font-semibold text-ink">Drop a call recording</p>
          <Button className="mt-3 h-8 bg-white px-3.5 text-[13px] shadow-[inset_0_0_0_1px_#e8e8e8] hover:bg-surface-2" onClick={(e) => { e.stopPropagation(); input.current?.click(); }}>
            Choose file
          </Button>
          <input ref={input} type="file" accept="audio/*,video/*" className="sr-only" tabIndex={-1} onChange={(e) => onFiles(e.target.files)} />
        </div>
      ) : mode === "record" ? (
        <div key="record" className={cn(CARD, "px-8")}>
          <Recorder key={mode} onUse={useRecording} />
        </div>
      ) : (
        <div key="paste" className={cn(CARD, "items-stretch justify-start p-5 text-left")}>
          <TypedPlaceholder active={!pasteFocused && text.length === 0} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setPasteFocused(true)}
            onBlur={() => setPasteFocused(false)}
            aria-label="Paste the transcript"
            className="relative min-h-0 w-full flex-1 resize-none bg-transparent pb-10 text-[15px] leading-6 text-ink outline-none"
          />
          <button
            type="button"
            aria-label="Attach a recording or transcript"
            onClick={() => attach.current?.click()}
            className="absolute bottom-3 left-3 flex size-7 items-center justify-center rounded-full bg-white text-ink shadow-[inset_0_0_0_1px_#e8e8e8] outline-none transition-colors duration-150 hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <Plus className="size-3.5" strokeWidth={2} />
          </button>
          <input ref={attach} type="file" accept="audio/*,video/*,.txt,.vtt,.srt" className="sr-only" tabIndex={-1} onChange={(e) => onAttach(e.target.files)} />
          <button
            type="button"
            onClick={run}
            disabled={!text.trim()}
            className={cn(
              "absolute right-3 bottom-3 inline-flex h-7 items-center rounded-full px-3.5 text-[12.5px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
              text.trim() ? "bg-accent text-accent-ink hover:bg-[#ff7d61]" : "cursor-default bg-line text-faint",
            )}
          >
            Run
          </button>
        </div>
      )}
    </div>
  );
}
