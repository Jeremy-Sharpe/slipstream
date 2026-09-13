"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/legacy/ui/dialog";
import { Input } from "@/components/legacy/ui/input";
import type { CalendarEvent } from "@/lib/legacy/types/calendar";

const field = "flex flex-col gap-1.5 text-sm";
const label = "text-xs font-medium text-muted-foreground";

export function ScheduleCallDialog({ defaultDay, onAdd }: { defaultDay: string; onAdd: (e: CalendarEvent) => void }) {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [company, setCompany] = useState("");
  const [date, setDate] = useState(defaultDay);
  const [time, setTime] = useState("10:00");
  const [rep, setRep] = useState<CalendarEvent["rep"]>("Sam Whitfield");
  const [coach, setCoach] = useState(true);
  const valid = contact.trim() && company.trim() && date && time;

  const submit = () => {
    if (!valid) return;
    onAdd({ id: `ev-${Date.now().toString(36)}`, contact: contact.trim(), company: company.trim(), rep, startsAt: `${date}T${time}:00+10:00`, durationMin: 30, coach, icpFit: "Not scored yet. The ICP fit is computed after the first call.", promises: [] });
    setContact(""); setCompany(""); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" className="flex h-10 items-center gap-1.5 rounded-legacy-md bg-primary px-3.5 text-[16px] font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none" />}>
        <Plus className="size-[18px]" strokeWidth={2.25} /> Schedule call
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a call</DialogTitle>
          <DialogDescription>It goes on the calendar with the pre-call context ready before you dial.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="grid grid-cols-2 gap-3">
            <label className={field}><span className={label}>Contact</span><Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Grace Kim" autoFocus /></label>
            <label className={field}><span className={label}>Company</span><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Banksia Architects" /></label>
            <label className={field}><span className={label}>Date</span><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className={field}><span className={label}>Time</span><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label className={field}><span className={label}>Rep</span>
              <select value={rep} onChange={(e) => setRep(e.target.value as CalendarEvent["rep"])} className="h-9 rounded-legacy-md border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <option>Sam Whitfield</option><option>Jordan Lee</option>
              </select>
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm text-foreground"><input type="checkbox" checked={coach} onChange={(e) => setCoach(e.target.checked)} className="size-4 accent-[var(--primary)]" />Arm the coach</label>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-legacy-lg border border-border px-3.5 text-sm text-foreground hover:bg-legacy-muted">Cancel</button>
            <button type="submit" disabled={!valid} className="h-9 rounded-legacy-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/85 disabled:opacity-50">Add to calendar</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
