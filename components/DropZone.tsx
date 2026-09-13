"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { actions } from "@/lib/store";
import { FileTiles } from "./home/FileTiles";
import { Recorder } from "./home/Recorder";
import { Segmented } from "./home/Segmented";
import { TypedPlaceholder } from "./home/TypedPlaceholder";
import { Button, cn } from "./ui";

type Mode = "upload" | "record" | "paste";
type Phase = { kind: "idle" } | { kind: "error"; message: string };

const MEDIA = /\.(mp3|m4a|wav|mp4|mov|webm|ogg|aac|flac|m4v)$/i;
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
  const [leaving, setLeaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const attach = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const isMedia = (f: File) => f.type.startsWith("audio/") || f.type.startsWith("video/") || MEDIA.test(f.name);

  const submitFile = (f: File) => {
    if (!isMedia(f)) {
      setPhase({ kind: "error", message: "That file type isn't supported" });
      timers.current.push(window.setTimeout(() => setPhase({ kind: "idle" }), 1600));
      return;
    }
    handoff(() => actions.addUpload(f.name));
  };

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) submitFile(f);
  };

  // Straight to the run: Home fades out and rises, the run stages its entrance.
  const handoff = (make: () => { id: string }) => {
    setLeaving(true);
    timers.current.push(window.setTimeout(() => {
      const c = make();
      router.push(`/calls/${c.id}?from=home`);
    }, 250));
  };

  const useRecording = () => {
    const d = new Date();
    handoff(() => actions.addUpload(`Recording ${d.getDate()} ${d.toLocaleString("en-AU", { month: "short" })} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}.m4a`));
  };

  // The "+" in Paste: media starts transcribing; a text transcript loads in.
  const onAttach = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (/\.(txt|vtt|srt)$/i.test(f.name) || f.type.startsWith("text/")) setText(await f.text());
    else submitFile(f);
  };

  const run = () => {
    if (!text.trim()) return;
    handoff(() => actions.addTranscript(text));
  };

  return (
    <div className="text-center motion-safe:transition-[opacity,transform] motion-safe:duration-250" style={{ opacity: leaving ? 0 : 1, transform: leaving ? "translateY(-8px)" : "none", transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}>
      <h1 className="text-[22px] font-semibold text-ink">What happened on the call?</h1>
      <p className="mx-auto mt-2 max-w-[520px] text-[13.5px] text-soft">Drop the recording. Slipstream files it, drafts the follow-up, and goes and finds companies like the one you just spoke to.</p>
      <div className="mt-7 mb-5"><Segmented value={mode} options={MODES} onChange={setMode} /></div>

      {phase.kind === "error" ? (
        <div key="error" className={CARD}>
          <p className="text-[14px] font-medium text-soft" style={{ animation: "fade-in 200ms ease-out both" }}>{phase.message}</p>
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
          className={cn(CARD, "cursor-pointer outline-none transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2", over && "shadow-[inset_0_0_0_1px_#181925]")}
        >
          <FileTiles lifted={over} />
          <p className="mt-4 text-[15px] font-semibold text-ink">Drop a call recording or video</p>
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
