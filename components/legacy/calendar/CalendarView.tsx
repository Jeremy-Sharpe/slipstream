"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Headphones, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { calendarEvents } from "@/lib/legacy/data/calendar";
import type { CalendarEvent } from "@/lib/legacy/types/calendar";
import { cn } from "@/lib/legacy/utils";
import { addDays, dayKey, hourOffset, labelForDay, mondayOf, timeOf, weekDays, weekLabel } from "./calendarUtils";
import { PreCallPanel } from "./PreCallPanel";
import { ScheduleCallDialog } from "./ScheduleCallDialog";

const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 8:00–17:00 rows, grid ends 18:00
const HOUR_PX = 44;
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const colLabel = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short" });
const colDay = (key: string) => Number(key.slice(8, 10));

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>(calendarEvents);
  const [today, setToday] = useState<string>("2026-09-14");
  const [monday, setMonday] = useState<string>(mondayOf("2026-09-14"));
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  // The real date only matters for Today/Tomorrow labels and the column tint;
  // read it after mount so the server and client render the same markup.
  useEffect(() => {
    const t = dayKey(new Date());
    setToday(t);
    if (events.some((e) => dayKey(new Date(e.startsAt)) >= t)) return;
    setMonday(mondayOf(t));
  }, [events]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") setMonday((m) => addDays(m, -7));
      if (e.key === "ArrowRight") setMonday((m) => addDays(m, 7));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const days = useMemo(() => weekDays(monday), [monday]);
  const q = query.trim().toLowerCase();
  const matches = (e: CalendarEvent) => !q || `${e.contact} ${e.company} ${e.rep}`.toLowerCase().includes(q);

  const upcoming = useMemo(() => {
    const sorted = [...events].filter(matches).filter((e) => dayKey(new Date(e.startsAt)) >= today).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const groups = new Map<string, CalendarEvent[]>();
    for (const e of sorted) { const k = dayKey(new Date(e.startsAt)); groups.set(k, [...(groups.get(k) ?? []), e]); }
    return [...groups.entries()];
  }, [events, today, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const inWeek = (key: string) => events.filter(matches).filter((e) => dayKey(new Date(e.startsAt)) === key);
  const current = events.find((e) => e.id === selected) ?? null;

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between px-11 pt-[34px] pb-7">
        <div className="flex items-center gap-4">
          <span className="flex size-[46px] items-center justify-center rounded-legacy-lg bg-icon-well text-foreground"><CalendarDays className="size-[22px]" strokeWidth={1.75} /></span>
          <h1 className="text-[26px] leading-none font-bold tracking-[-0.02em] text-foreground">Calendar</h1>
          <span className="ml-2 text-[16px] text-muted-foreground">{weekLabel(monday)}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="flex h-10 w-[273px] items-center gap-2.5 rounded-legacy-md border border-border bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-primary">
            <Search className="size-4" strokeWidth={1.75} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search calls" className="w-full bg-transparent text-[16px] text-foreground outline-none" />
          </label>
          <button type="button" onClick={() => setMonday(mondayOf(today))} className="h-10 rounded-legacy-md border border-border px-4 text-[16px] font-medium text-foreground hover:bg-legacy-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">Today</button>
          <div className="flex h-10 items-center rounded-legacy-md border border-border">
            <button type="button" aria-label="Previous week" onClick={() => setMonday((m) => addDays(m, -7))} className="flex h-full w-10 items-center justify-center rounded-l-[5px] text-muted-foreground hover:bg-legacy-muted hover:text-foreground"><ChevronLeft className="size-4" strokeWidth={2} /></button>
            <span className="h-full w-px bg-border" />
            <button type="button" aria-label="Next week" onClick={() => setMonday((m) => addDays(m, 7))} className="flex h-full w-10 items-center justify-center rounded-r-[5px] text-muted-foreground hover:bg-legacy-muted hover:text-foreground"><ChevronRight className="size-4" strokeWidth={2} /></button>
          </div>
          <ScheduleCallDialog defaultDay={today} onAdd={(e) => { setEvents((cur) => [...cur, e]); setMonday(mondayOf(dayKey(new Date(e.startsAt)))); }} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 border-t border-border">
        <aside className="flex w-[360px] shrink-0 flex-col border-r border-border">
          <h2 className="px-6 pt-6 pb-3 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">Upcoming calls</h2>
          <div className="min-h-0 flex-1 overflow-y-auto pb-6">
            {upcoming.length === 0 && <p className="px-6 text-[15px] text-muted-foreground">{events.length === 0 ? "Nothing scheduled. Add a call to see its pre-call context here." : "Nothing matches."}</p>}
            {upcoming.map(([key, list]) => (
              <section key={key} className="mb-3">
                <p className="px-6 py-2 text-[15px] font-semibold text-foreground">{labelForDay(key, today)}</p>
                {list.map((e) => (
                  <button key={e.id} type="button" onClick={() => setSelected(e.id)} className={cn("flex w-full items-center gap-3 px-6 py-3 text-left hover:bg-legacy-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:outline-none", selected === e.id && "bg-legacy-muted")}>
                    <span className="w-12 shrink-0 text-[15px] tabular-nums text-muted-foreground">{timeOf(e.startsAt)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-medium text-foreground">{e.contact} <span className="font-normal text-muted-foreground">· {e.company}</span></span>
                      {e.coach && <span className="mt-1 inline-flex items-center gap-1 rounded-legacy-md border border-primary/40 bg-primary-soft px-1.5 py-px text-[11px] font-medium text-primary-foreground"><Headphones className="size-3 text-primary" strokeWidth={2} />Coach</span>}
                    </span>
                    <span title={e.rep} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-avatar text-[12px] font-medium text-foreground">{initials(e.rep)}</span>
                  </button>
                ))}
              </section>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-auto">
          <div className="grid min-w-[760px] grid-cols-[56px_repeat(7,1fr)]">
            <div className="sticky top-0 z-10 h-12 border-b border-border bg-card" />
            {days.map((key) => (
              <div key={key} className={cn("sticky top-0 z-10 flex h-12 items-baseline gap-1.5 border-b border-l border-border bg-card px-3 text-[15px]", key === today && "bg-page")}>
                <span className="text-muted-foreground">{colLabel.format(new Date(`${key}T00:00:00Z`))}</span>
                <span className={cn("font-semibold text-foreground", key === today && "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground")}>{colDay(key)}</span>
              </div>
            ))}

            <div className="relative" style={{ height: HOURS.length * HOUR_PX }}>
              {HOURS.filter((h) => h > 8).map((h) => <div key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground" style={{ top: (h - 8) * HOUR_PX }}>{h}:00</div>)}
            </div>
            {days.map((key) => (
              <div key={key} className={cn("relative border-l border-border", key === today && "bg-page")} style={{ height: HOURS.length * HOUR_PX }}>
                {HOURS.map((h) => <div key={h} className="absolute inset-x-0 border-t border-border" style={{ top: (h - 8) * HOUR_PX }} />)}
                {inWeek(key).map((e) => {
                  const top = hourOffset(e.startsAt) * HOUR_PX;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelected(e.id)}
                      className={cn("absolute inset-x-1 flex flex-col overflow-hidden rounded-legacy-md border border-border bg-card px-2 py-1 text-left shadow-xs hover:bg-legacy-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", key === today && "border-l-[3px] border-l-primary", selected === e.id && "ring-2 ring-primary")}
                      style={{ top, height: Math.max(40, (e.durationMin / 60) * HOUR_PX) }}
                    >
                      <span className="truncate text-[13px] font-medium text-foreground">{e.company}</span>
                      <span className="truncate text-[12px] text-muted-foreground">{timeOf(e.startsAt)} · {e.contact.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {current && <PreCallPanel event={current} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}
