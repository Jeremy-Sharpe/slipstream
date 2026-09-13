"use client";

import { Copy, ExternalLink, Headphones } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { coachRequest, launchLink } from "@/lib/coach/api";
import type { CoachLaunch, CoachSession } from "@/lib/coach/types";
import { cn } from "@/lib/utils";

const SOURCES: { key: CoachSession["audio_mode"]; label: string; detail: string }[] = [
  { key: "both", label: "Call and mic", detail: "Hears the call app and your microphone separately, so it knows who said what. Wear headphones." },
  { key: "system", label: "Call only", detail: "Hears only the call app. It cannot tell speakers apart, so use Done or Skip when a card is covered." },
  { key: "mic", label: "Speakerphone", detail: "Hears the room through your microphone. It cannot tell speakers apart." },
];

const TEXTAREA =
  "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={<Button variant="outline" className="h-9 rounded-md px-3.5 text-[16px] font-medium" />}>
        <Headphones className="size-[18px]" strokeWidth={2} /> Start call with coach
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ready ? `Coach ready for ${ready.session.context.customer.name}` : "Start call with coach"}</DialogTitle>
          <DialogDescription>
            {ready
              ? "Open the desktop coach, then press Start listening when your call begins."
              : "Run the call in the app you already use. The coach sits beside it and suggests what to ask next, from what you tell it here and what is said on the call."}
          </DialogDescription>
        </DialogHeader>

        {ready ? (
          <div className="flex flex-col gap-3">
            <a
              href={ready.url}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <ExternalLink className="size-4" strokeWidth={1.75} /> Open desktop coach
            </a>
            <Button variant="outline" onClick={() => copy(ready.url)}>
              <Copy className="size-4" strokeWidth={1.75} /> {copied ? "Link copied" : "Copy link to paste into the coach"}
            </Button>
            <p className="text-xs text-muted-foreground">
              The link works once and expires in 10 minutes. Audio only starts when you press Start listening in the coach.
            </p>
            <Link
              href={`/coach/${ready.session.id}`}
              onClick={() => changeOpen(false)}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Follow this call in Slipstream
            </Link>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">No desktop coach yet?</summary>
              <p className="mt-2">
                It runs on macOS 14.2 or later. Download the latest build from the Coach installers workflow on GitHub. When running it from the repository (<code>cd coach && npm install && npm start</code>), use Copy link and paste it into the coach.
              </p>
            </details>
          </div>
        ) : (
          <form id="start-coach" onSubmit={prepare} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Who are you calling?
                <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="Emily Chen" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Company
                <Input value={company} onChange={(e) => setCompany(e.target.value)} required maxLength={100} placeholder="Fitzroy Planning Group" />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              What do you know so far? (optional)
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                className={TEXTAREA}
                placeholder="Their situation, the goal of this call, anything they have already told you."
              />
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs font-medium text-muted-foreground">What should the coach listen to?</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SOURCES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={source === s.key}
                    onClick={() => setSource(s.key)}
                    className={cn(
                      "h-8 rounded-md border px-3 text-[13px] transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                      source === s.key ? "border-primary/50 bg-primary-soft font-medium text-foreground" : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{detail}</p>
            </fieldset>
            <p className="text-xs text-muted-foreground">Only start once everyone on the call has agreed to transcription.</p>
          </form>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {!ready && (
          <DialogFooter>
            <Button variant="outline" onClick={() => changeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="start-coach" disabled={busy}>
              {busy ? "Preparing coach…" : "Prepare coach"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
