"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { ApiError, getFixtures, type ApiCall, type ApiFixture } from "@/lib/api/slipstream";
import { parseEmail } from "@/lib/email";
import { ingestFixture, ingestPastedEmail, ingestRecording, ingestTranscript, parseTranscript } from "@/lib/ingest";
import { registerConversation, setRun, type ConversationEntry } from "@/lib/store/conversations";
import { CallRecording, recordingFor } from "./CallRecording";
import { FileTiles } from "./home/FileTiles";
import { Recorder } from "./home/Recorder";
import { Segmented } from "./home/Segmented";
import { TypedPlaceholder } from "./home/TypedPlaceholder";
import { Submitting, type Source } from "./home/Submitting";
import { Button, cn, mmss, humanize } from "./ui";

type Mode = "pick" | "upload" | "record" | "paste" | "email";
type Phase = { kind: "idle" } | { kind: "submitting"; source: Source; error?: string; done?: string };

const MEDIA = /\.(mp3|m4a|wav|mp4|mov|webm|ogg|aac|flac|m4v)$/i;
const MODES: { key: Mode; label: string }[] = [
  { key: "upload", label: "Upload file" },
  { key: "pick", label: "Pick a call" },
  { key: "record", label: "Record" },
  { key: "paste", label: "Paste transcript" },
  { key: "email", label: "Paste an email" },
];

// One card, one size: switching never moves the page.
const CARD = "relative mx-auto flex h-[220px] w-full max-w-[560px] flex-col items-center justify-center rounded-2xl bg-surface motion-safe:animate-[fade-up_200ms_cubic-bezier(0.23,1,0.32,1)_both]";

const dayFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" });

export function DropZone() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("upload");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [over, setOver] = useState(false);
  const [text, setText] = useState("");
  const [emailText, setEmailText] = useState("");
  const [pasteFocused, setPasteFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [fixtures, setFixtures] = useState<ApiFixture[] | null>(null);
  const [fixtureError, setFixtureError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const attach = useRef<HTMLInputElement>(null);
  const next = useRef<string | null>(null);
  const attachEmail = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    getFixtures(controller.signal)
      .then((result) => { if (live) setFixtures(result); })
      .catch((error: unknown) => {
        if (!live || controller.signal.aborted) return;
        setFixtureError(error instanceof Error ? error.message : "The calls could not be loaded");
      });
    return () => { live = false; controller.abort(); };
  }, []);

  const isMedia = (f: File) => f.type.startsWith("audio/") || f.type.startsWith("video/") || MEDIA.test(f.name);

  const fail = useCallback((source: Source, error: unknown) => {
    const detail = error instanceof ApiError && error.status === 503
      ? "Transcription is not configured on this deployment"
      : error instanceof Error ? error.message : "That did not work";
    setPhase({ kind: "submitting", source, error: detail });
  }, []);

  /** The ingest is the work: the card shows it running, then Home hands over to the run. */
  const submit = useCallback(async (source: Source, work: () => Promise<{ entry: ConversationEntry; done: string }>) => {
    setPhase({ kind: "submitting", source });
    try {
      const { entry, done } = await work();
      registerConversation(entry);
      setRun(entry.id, { state: "running" });
      next.current = entry.id;
      setPhase({ kind: "submitting", source, done });
    } catch (error) {
      fail(source, error);
    }
  }, [fail]);

  // Home fades out and rises, then the run stages its entrance.
  const handoff = useCallback(() => {
    const id = next.current;
    if (!id) return;
    setLeaving(true);
    timers.current.push(window.setTimeout(() => router.push(`/calls/${id}?from=home`), 250));
  }, [router]);

  const callDone = (call: ApiCall) => `Transcribed · ${call.segments.length} turns · ${mmss(call.duration_seconds ?? 0)}`;

  const pickFixture = (fixture: ApiFixture) =>
    submit({ kind: "fixture", company: fixture.company, prospect: fixture.prospect }, async () => {
      const { call, entry } = await ingestFixture(fixture.call_id);
      return { entry: { ...entry, company: fixture.company, contact: fixture.prospect }, done: callDone(call) };
    });

  const submitFile = (file: File) => {
    if (!isMedia(file)) {
      setPhase({ kind: "submitting", source: { kind: "file", name: file.name, bytes: file.size }, error: "That file type isn't supported" });
      return;
    }
    void submit({ kind: "file", name: file.name, bytes: file.size }, async () => {
      const { call, entry } = await ingestRecording(file);
      return { entry, done: callDone(call) };
    });
  };

  const submitRecording = (clip: Blob) => {
    const now = new Date();
    const name = `Recording ${now.getDate()} ${now.toLocaleString("en-AU", { month: "short" })} ${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.webm`;
    void submit({ kind: "recording", bytes: clip.size }, async () => {
      const { call, entry } = await ingestRecording(new File([clip], name, { type: clip.type || "audio/webm" }));
      return { entry, done: callDone(call) };
    });
  };

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) submitFile(file);
  };

  // The "+" in Paste: media starts transcribing; a text transcript loads in.
  const onAttach = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (/\.(txt|vtt|srt)$/i.test(file.name) || file.type.startsWith("text/")) setText(await file.text());
    else submitFile(file);
  };

  const runPaste = () => {
    if (!text.trim()) return;
    const lines = text.split(/\n/).filter((line) => line.trim()).length;
    void submit({ kind: "paste", lines }, async () => {
      const { call, entry } = await ingestTranscript(text);
      return { entry, done: `Saved · ${call.segments.length} turns` };
    });
  };

  const onAttachEmail = async (files: FileList | null) => {
    const f = files?.[0];
    if (f) setEmailText(await f.text());
  };

  // A forwarded email: headers and quoted replies become the thread.
  const runEmail = () => {
    if (!emailText.trim()) return;
    void submit({ kind: "email", messages: parseEmail(emailText).length }, async () => {
      const { records, entry } = await ingestPastedEmail(emailText);
      return { entry, done: `Read the thread · ${records.length} message${records.length === 1 ? "" : "s"}` };
    });
  };

  const runPill = (enabled: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={cn(
        "absolute right-3 bottom-3 inline-flex h-7 items-center rounded-full px-3.5 text-[12.5px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        enabled ? "bg-accent text-accent-ink hover:bg-[#ff7d61]" : "cursor-default bg-line text-faint",
      )}
    >
      Run
    </button>
  );

  const transcriptUnavailable = phase.kind === "submitting" && phase.error === "Transcription is not configured on this deployment";

  return (
    <div className="text-center motion-safe:transition-[opacity,transform] motion-safe:duration-250" style={{ opacity: leaving ? 0 : 1, transform: leaving ? "translateY(-8px)" : "none", transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}>
      <h1 className="text-[22px] font-semibold text-ink">What happened on the call?</h1>
      <p className="mx-auto mt-2 max-w-[520px] text-[13.5px] text-soft">Drop the recording. Slipstream files it, drafts the follow-up, and goes and finds companies like the one you just spoke to.</p>
      <div className={cn("mt-7 mb-5 transition-opacity duration-200", phase.kind === "submitting" && "pointer-events-none opacity-40")}><Segmented value={mode} options={MODES} onChange={setMode} /></div>

      {phase.kind === "submitting" && phase.source.kind !== "recording" ? (
        <div key="submitting" className={CARD}>
          <Submitting source={phase.source} error={phase.error} done={phase.done} onDone={handoff} onReset={() => setPhase({ kind: "idle" })} />
          {transcriptUnavailable && (
            <Button className="mt-4" onClick={() => { setPhase({ kind: "idle" }); setMode("paste"); }}>Paste the transcript instead</Button>
          )}
        </div>
      ) : mode === "pick" ? (
        <div key="pick" className={cn(CARD, "items-stretch justify-start p-3 text-left")}>
          {fixtureError ? (
            <p className="m-auto text-[14px] text-soft">{fixtureError}</p>
          ) : !fixtures ? (
            <div aria-busy className="flex flex-col gap-1 p-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 rounded-lg bg-surface-2" style={{ opacity: 1 - i * 0.2 }} />)}
            </div>
          ) : (
            <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {/* Calls with a playable recording lead, so judges find them without scrolling. */}
              {[...fixtures].sort((a, b) => Number(!!recordingFor(b.call_id)) - Number(!!recordingFor(a.call_id))).map((fixture) => {
                const recording = recordingFor(fixture.call_id);
                return (
                  <li key={fixture.call_id} className="flex items-center gap-1">
                    <span className="flex w-8 shrink-0 justify-center">
                      {recording && <CallRecording compact recording={recording} label={`${fixture.company} with ${fixture.prospect}`} />}
                    </span>
                    <button
                      type="button"
                      onClick={() => void pickFixture(fixture)}
                      title={recording ? `Run this recording (${mmss(Math.round(recording.seconds))})` : undefined}
                      className="grid h-9 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_96px_64px] items-center gap-x-3 rounded-lg px-2 text-left transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <span className="min-w-0 truncate text-[14px] text-ink">{fixture.company} <span className="text-soft">· {fixture.prospect}</span></span>
                      <span className="truncate text-[13px] text-soft">{humanize(fixture.outcome.replace("_", " "))}</span>
                      <span className="text-right text-[13px] tabular-nums text-faint">{dayFmt.format(new Date(fixture.scheduled_at))}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
          <Recorder
            key={mode}
            onUse={submitRecording}
            submitting={phase.kind === "submitting" && phase.source.kind === "recording"
              ? <Submitting source={phase.source} error={phase.error} done={phase.done} onDone={handoff} onReset={() => setPhase({ kind: "idle" })} variant="bar" />
              : null}
          />
        </div>
      ) : mode === "email" ? (
        <div key="email" className={cn(CARD, "items-stretch justify-start p-5 text-left")}>
          <TypedPlaceholder variant="email" active={!emailFocused && emailText.length === 0} />
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            aria-label="Paste the email"
            className="relative mb-5 min-h-0 w-full flex-1 resize-none bg-transparent text-[15px] leading-6 text-ink outline-none"
          />
          <button
            type="button"
            aria-label="Attach an email file"
            onClick={() => attachEmail.current?.click()}
            className="absolute bottom-3 left-3 flex size-7 items-center justify-center rounded-full bg-white text-ink shadow-[inset_0_0_0_1px_#e8e8e8] outline-none transition-colors duration-150 hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <Plus className="size-3.5" strokeWidth={2} />
          </button>
          <input ref={attachEmail} type="file" accept=".eml,.txt,message/rfc822,text/plain" className="sr-only" tabIndex={-1} onChange={(e) => onAttachEmail(e.target.files)} />
          {runPill(!!emailText.trim(), runEmail)}
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
            className="relative mb-5 min-h-0 w-full flex-1 resize-none bg-transparent text-[15px] leading-6 text-ink outline-none"
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
          {runPill(!!text.trim() && parseTranscript(text).turns.length > 0, runPaste)}
        </div>
      )}
    </div>
  );
}
