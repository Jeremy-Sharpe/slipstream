"use client";

import { Copy, ExternalLink, Headphones, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Segmented } from "@/components/home/Segmented";
import { Button } from "@/components/ui";
import { coachRequest, launchLink } from "@/lib/coach/api";
import type { CoachLaunch, CoachSession } from "@/lib/coach/types";

const SOURCES: { key: CoachSession["audio_mode"]; label: string; detail: string }[] = [
  { key: "both", label: "Call and mic", detail: "Hears the call app and your microphone separately, so it knows who said what. Wear headphones." },
  { key: "system", label: "Call only", detail: "Hears only the call app. It cannot tell speakers apart, so use Done or Skip when a card is covered." },
  { key: "mic", label: "Speakerphone", detail: "Hears the room through your microphone. It cannot tell speakers apart." },
];

const FIELD =
  "w-full rounded-xl bg-surface px-3.5 text-[13.5px] text-ink outline-none placeholder:text-faint transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-accent/40";
const LABEL = "flex flex-col gap-1.5 text-[12px] font-medium tracking-wide text-faint uppercase";

type Ready = { session: CoachSession; url: string };

export function StartCoachDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<CoachSession["audio_mode"]>("both");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [copied, setCopied] = useState(false);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => setPortal(document.getElementById("portal") ?? document.body), []);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next && ready) {
      setReady(null);
      setName("");
      setCompany("");
      setNotes("");
      setCopied(false);
    }
    if (!next) setError(null);
  }

  useEffect(() => {
    if (!open) return;
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") changeOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // changeOpen only reads state setters and `ready`; re-binding on `ready` keeps it current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ready]);

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await coachRequest<CoachLaunch>("sessions", {
        method: "POST",
        body: JSON.stringify({
          audio_mode: source,
          new_customer: { name: name.trim(), company: company.trim(), context: notes.trim() },
        }),
      });
      setReady({ session: data.session, url: launchLink(data, window.location.origin) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare the coach. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Your browser blocked the clipboard. Use Open desktop coach instead.");
    }
  }

  const detail = SOURCES.find((s) => s.key === source)?.detail;
  const title = ready ? `Coach ready for ${ready.session.context.customer.name}` : "Start call with coach";

  const dialog = (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(24,25,37,0.24)] px-4" onMouseDown={(e) => e.target === e.currentTarget && changeOpen(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="start-coach-title" className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="start-coach-title" className="text-[18px] font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-[13.5px] text-soft">
              {ready
                ? "Open the desktop coach, then press Start listening when your call begins."
                : "Run the call in the app you already use. The coach sits beside it and suggests what to ask next, from what you tell it here and what is said on the call."}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={() => changeOpen(false)} className="grid size-8 shrink-0 place-items-center rounded-full text-soft transition-colors duration-150 hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        {ready ? (
          <div className="mt-5 flex flex-col gap-3">
            <a
              href={ready.url}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-[13.5px] font-medium text-accent-ink transition-colors duration-150 hover:bg-[#ff7d61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <ExternalLink className="size-4" strokeWidth={1.75} /> Open desktop coach
            </a>
            <Button onClick={() => copy(ready.url)}>
              <Copy className="size-4" strokeWidth={1.75} /> {copied ? "Link copied" : "Copy link to paste into the coach"}
            </Button>
            <p className="text-[12.5px] text-soft">The link works once and expires in 10 minutes. Audio only starts when you press Start listening in the coach.</p>
            <Link href={`/coach/${ready.session.id}`} onClick={() => changeOpen(false)} className="text-[13.5px] font-medium text-ink underline-offset-4 hover:underline">
              Follow this call in Slipstream
            </Link>
            <details className="text-[12.5px] text-soft">
              <summary className="cursor-pointer">No desktop coach yet?</summary>
              <p className="mt-2">
                It runs on macOS 14.2 or later. Download the latest build from the Coach installers workflow on GitHub. When running it from the repository (<code>cd coach && npm install && npm start</code>), use Copy link and paste it into the coach.
              </p>
            </details>
          </div>
        ) : (
          <form id="start-coach" onSubmit={prepare} className="mt-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <label className={LABEL}>
                Who are you calling?
                <input ref={firstField} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="Emily Chen" className={`${FIELD} h-9 normal-case tracking-normal`} />
              </label>
              <label className={LABEL}>
                Company
                <input value={company} onChange={(e) => setCompany(e.target.value)} required maxLength={100} placeholder="Fitzroy Planning Group" className={`${FIELD} h-9 normal-case tracking-normal`} />
              </label>
            </div>
            <label className={LABEL}>
              What do you know so far? (optional)
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                className={`${FIELD} min-h-20 py-2 normal-case tracking-normal`}
                placeholder="Their situation, the goal of this call, anything they have already told you."
              />
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-[12px] font-medium tracking-wide text-faint uppercase">What should the coach listen to?</legend>
              <div className="mt-1.5">
                <Segmented value={source} options={SOURCES} onChange={setSource} />
              </div>
              <p className="text-[12.5px] text-soft">{detail}</p>
            </fieldset>
            <p className="text-[12.5px] text-soft">Only start once everyone on the call has agreed to transcription.</p>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-danger-tint px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}

        {!ready && (
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => changeOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="start-coach" disabled={busy}>
              {busy ? "Preparing coach…" : "Prepare coach"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => changeOpen(true)}
        className="flex h-9 w-full items-center gap-2.5 rounded-full bg-surface px-3 text-[13.5px] font-medium text-ink transition-colors duration-150 hover:bg-[#ececec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <Headphones className="size-[17px]" strokeWidth={1.75} /> Start call with coach
      </button>
      {open && portal && createPortal(dialog, portal)}
    </>
  );
}
