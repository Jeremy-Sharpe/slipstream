const TZ = "Australia/Melbourne";

/** Calendar date parts of an instant in Melbourne time. */
export function parts(d: Date) {
  const f = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour === "24" ? 0 : p.hour), min: Number(p.minute), weekday: p.weekday };
}

/** "2026-09-14" for an instant, in Melbourne time. */
export const dayKey = (d: Date) => { const p = parts(d); return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`; };

/** Monday of the week containing the given day key. */
export function mondayOf(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // Monday = 0
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

const dayLabel = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
export function labelForDay(key: string, todayKey: string): string {
  if (key === todayKey) return "Today";
  if (key === addDays(todayKey, 1)) return "Tomorrow";
  const [y, m, d] = key.split("-").map(Number);
  return dayLabel.format(new Date(Date.UTC(y, m - 1, d)));
}

const timeFmt = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
export const timeOf = (iso: string) => timeFmt.format(new Date(iso));

const rangeFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", day: "numeric", month: "short" });
export function weekLabel(monday: string): string {
  const [y, m, d] = monday.split("-").map(Number);
  const a = new Date(Date.UTC(y, m - 1, d));
  const b = new Date(Date.UTC(y, m - 1, d + 6));
  return `${rangeFmt.format(a)} – ${rangeFmt.format(b)} ${b.getUTCFullYear()}`;
}

/** Fraction of the working day (8:00–18:00) an instant sits at, for grid placement. */
export function hourOffset(iso: string): number {
  const p = parts(new Date(iso));
  return p.h + p.min / 60 - 8;
}
