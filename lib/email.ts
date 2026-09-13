// Turns a pasted or forwarded email into a 1–3 message thread: "From:/To:/
// Subject:/Date:" headers on top, quoted replies ("On … wrote:" or "> " lines)
// underneath, newest first the way mail clients paste them.
import type { EmailMessage, EmailParty, EmailRecipient } from "./types";

const REPS = ["Sam Whitfield", "Jordan Lee"];
const OUR_DOMAIN = "eleno";
const HEADER = /^(From|To|Cc|Subject|Date|Sent):\s*(.*)$/i;
// "On Sat, 12 Sept 2026 at 11:20, Sam Whitfield <sam@…> wrote:": the sender follows the last comma.
const WROTE = /^On (.+),\s*(.+?)\s+wrote:\s*$/;
const FORWARD = /^-{2,}\s*(Forwarded|Original) message\s*-{2,}$/i;

/** "Name <addr>" | "addr" | "Name" → a party. */
export function party(s: string): EmailParty {
  const t = s.trim().replace(/^"|"$/g, "");
  const m = t.match(/^"?([^"<]*?)"?\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  if (t.includes("@")) return { name: null, email: t.toLowerCase() };
  return { name: t || null, email: `${t.toLowerCase().replace(/[^a-z]+/g, ".")}@unknown.example` };
}

export const isRep = (p: EmailParty) => p.email.includes(OUR_DOMAIN) || (!!p.name && REPS.some((r) => r.toLowerCase() === p.name!.toLowerCase()));
export const displayName = (p: EmailParty) => p.name ?? p.email;
const stripRe = (s: string) => s.replace(/^(\s*(re|fwd?|fw)\s*:\s*)+/i, "").trim();

type Raw = { from?: EmailParty; to: EmailRecipient[]; subject?: string; date?: Date; body: string };

/** Header lines at the top of a block, then the body. */
function headersOf(lines: string[]): { raw: Raw; rest: string[] } {
  const raw: Raw = { to: [], body: "" };
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  while (i < lines.length && FORWARD.test(lines[i].trim())) i++;
  for (; i < lines.length; i++) {
    const m = lines[i].match(HEADER);
    if (!m) break;
    const key = m[1].toLowerCase(), v = m[2].trim();
    if (key === "from") raw.from = party(v);
    else if (key === "to" || key === "cc") raw.to.push(...v.split(/[,;]/).filter((s) => s.trim()).map((s) => ({ ...party(s), kind: key as "to" | "cc" })));
    else if (key === "subject") raw.subject = v;
    else if (key === "date" || key === "sent") { const d = new Date(v.replace(/^[A-Za-z]+,?\s+/, "")); if (!isNaN(d.getTime())) raw.date = d; }
  }
  return { raw, rest: lines.slice(i) };
}

/** Splits a body at the first quoted reply; returns the quote with its "> " stripped. */
function splitQuote(lines: string[]): { body: string[]; quote: string[] | null; wrote: RegExpMatchArray | null } {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    const w = l.match(WROTE);
    if (w) return { body: lines.slice(0, i), quote: lines.slice(i + 1).map((q) => q.replace(/^\s*>+\s?/, "")), wrote: w };
    if (l.startsWith(">")) return { body: lines.slice(0, i), quote: lines.slice(i).map((q) => q.replace(/^\s*>+\s?/, "")), wrote: null };
  }
  return { body: lines, quote: null, wrote: null };
}

const clean = (lines: string[]) => lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

/** Parses the paste into messages, oldest first. Empty input gives one inbound message. */
export function parseEmail(text: string): EmailMessage[] {
  const raws: Raw[] = [];
  let lines = text.replace(/\r/g, "").split("\n");
  let inherited: Partial<Raw> = {};
  for (let n = 0; n < 3 && lines.length; n++) {
    const { raw, rest } = headersOf(lines);
    const { body, quote, wrote } = splitQuote(rest);
    if (inherited.from && !raw.from) raw.from = inherited.from;
    if (inherited.date && !raw.date) raw.date = inherited.date;
    raws.push({ ...raw, body: clean(body) });
    if (!quote) break;
    // "On Fri, 11 Sept 2026 at 09:12, Hannah Lee <hannah@…> wrote:" names the quoted message's sender and date.
    inherited = wrote ? { from: party(wrote[2]), date: (() => { const d = new Date(wrote[1].replace(/\s+at\s+/, " ")); return isNaN(d.getTime()) ? undefined : d; })() } : {};
    lines = quote;
  }
  const ordered = raws.filter((r) => r.body).reverse();
  if (ordered.length === 0) ordered.push({ to: [], body: text.trim() || "(empty)" });
  const subject = stripRe(raws.find((r) => r.subject)?.subject ?? "") || "No subject";
  const now = Date.now();
  const inbound = ordered.find((r) => r.from && !isRep(r.from))?.from ?? ordered[0].from;
  const rep = ordered.find((r) => r.from && isRep(r.from))?.from ?? { name: "Sam Whitfield", email: "sam@eleno.example" };
  const contact = inbound && !isRep(inbound) ? inbound : { name: "Prospect", email: "prospect@unknown.example" };
  return ordered.map((r, i) => {
    const sender = r.from ?? (i % 2 === 0 ? contact : rep);
    const outbound = isRep(sender);
    const to: EmailRecipient[] = r.to.length ? r.to : [{ ...(outbound ? contact : rep), kind: "to" }];
    return {
      i,
      direction: outbound ? "outbound" : "inbound",
      sender,
      recipients: to,
      subject: i === 0 ? subject : `Re: ${subject}`,
      body: r.body,
      occurred_at: (r.date ?? new Date(now - (ordered.length - 1 - i) * 3_600_000 * 20)).toISOString(),
    };
  });
}

/** "4h 28m", "2d 3h", "18m": the gap from the first inbound message to the reply after it. */
export function responseTime(messages: EmailMessage[]): string | undefined {
  const first = messages.findIndex((m) => m.direction === "inbound");
  const reply = first < 0 ? -1 : messages.findIndex((m, i) => i > first && m.direction === "outbound");
  if (reply < 0) return undefined;
  return fmtGap(new Date(messages[reply].occurred_at).getTime() - new Date(messages[first].occurred_at).getTime());
}

export function fmtGap(ms: number) {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, "0")}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
