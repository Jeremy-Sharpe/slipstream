"use client";

import { Headphones, MapPin, Phone, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { conversations } from "@/lib/legacy/data/conversations";
import type { CalendarEvent } from "@/lib/legacy/types/calendar";
import { timeOf } from "./calendarUtils";

const OUTCOME: Record<string, string> = { won: "Won", stalled: "Stalled", lost: "Lost", no_show: "No-show", open: "Open" };
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export function PreCallPanel({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const router = useRouter();
  const [coachNote, setCoachNote] = useState(false);
  const last = event.conversationId ? conversations.find((c) => c.id === event.conversationId) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="flex w-[440px] shrink-0 flex-col border-l border-border bg-card" aria-label="Pre-call context">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <span className="text-[15px] font-semibold text-foreground">Pre-call context</span>
        <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-legacy-md text-muted-foreground hover:bg-legacy-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"><X className="size-4" strokeWidth={1.75} /></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-avatar text-xs font-medium text-foreground">{initials(event.contact)}</span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-foreground">{event.contact}</p>
            <p className="truncate text-sm text-muted-foreground">{event.company}</p>
          </div>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">{timeOf(event.startsAt)} · {event.durationMin} min</span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Headcount</dt><dd className="mt-0.5 flex items-center gap-1.5 text-foreground"><Users className="size-3.5 text-muted-foreground" strokeWidth={1.75} />{event.headcount ?? last?.headcount ?? "—"} staff</dd></div>
          <div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Location</dt><dd className="mt-0.5 flex items-center gap-1.5 text-foreground"><MapPin className="size-3.5 text-muted-foreground" strokeWidth={1.75} />{event.location ?? last?.location ?? "—"}</dd></div>
          <div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Rep</dt><dd className="mt-0.5 text-foreground">{event.rep}</dd></div>
          <div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Coach</dt><dd className="mt-0.5 text-foreground">{event.coach ? "Armed" : "Off"}</dd></div>
        </dl>

        <section className="mt-6">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Last conversation</h3>
          {last ? (
            <button type="button" onClick={() => router.push(`/legacy/conversations/${last.id}`)} className="mt-2 w-full rounded-legacy-lg border border-border p-3 text-left hover:bg-legacy-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                <span className="font-medium text-foreground">{last.title}</span>
                <span className="ml-auto rounded-legacy-md border border-border px-2 py-0.5 text-xs text-foreground/80">{OUTCOME[last.outcome]}</span>
              </div>
              <p className="mt-2 text-sm text-ink-2">“{last.preview}”</p>
              {last.trigger && <p className="mt-2 text-xs text-muted-foreground">Trigger · {last.trigger}</p>}
            </button>
          ) : (
            <p className="mt-2 rounded-legacy-lg border border-dashed border-border p-3 text-sm text-muted-foreground">No conversation yet. This is a first call from the outreach sequence.</p>
          )}
        </section>

        <section className="mt-6">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Open promises</h3>
          {event.promises.length ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {event.promises.map((p) => <li key={p} className="flex gap-2 text-sm text-foreground"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />{p}</li>)}
            </ul>
          ) : <p className="mt-2 text-sm text-muted-foreground">Nothing outstanding.</p>}
          {event.nextStep && <p className="mt-3 text-sm text-ink-2"><span className="font-medium text-foreground">Next step · </span>{event.nextStep}</p>}
        </section>

        <section className="mt-6">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">ICP fit</h3>
          <p className="mt-2 text-sm text-ink-2">{event.icpFit}</p>
        </section>

        {coachNote && (
          <p className="mt-6 rounded-legacy-lg border border-border bg-page p-3 text-sm text-ink-2" role="status">
            <Headphones className="mr-1.5 inline size-3.5 text-primary" strokeWidth={1.75} />Coach overlay opens when the call starts (desktop app).
          </p>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-3">
        <button type="button" onClick={() => router.push("/legacy/settings")} className="flex h-9 items-center rounded-legacy-lg border border-border px-3.5 text-sm text-foreground hover:bg-legacy-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">Open in HubSpot</button>
        <button type="button" onClick={() => setCoachNote(true)} className="flex h-9 items-center gap-1.5 rounded-legacy-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"><Headphones className="size-4" strokeWidth={1.75} />Join with coach</button>
      </footer>
    </aside>
  );
}
