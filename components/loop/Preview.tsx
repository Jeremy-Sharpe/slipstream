import { Avatar } from "@/components/Avatar";
import { humanize, mmss } from "@/components/ui";
import { calls } from "@/lib/calls";
import { icpRows, patterns, provenance, tiles } from "@/lib/intelligence";
import { leads } from "@/lib/leads";
import { DEMO_CALL } from "@/lib/loop";
import { cn } from "@/components/ui";

/* A small artefact preview inside each beat's card: the thing the beat
   produced, flat white, 13.5px, no colour beyond the score green. */

const demo = calls.find((c) => c.id === DEMO_CALL) ?? calls[0];
const money = (n: number) => `$${n.toLocaleString("en-AU")}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

function Box({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl bg-white p-3.5 text-[13.5px] leading-5 text-ink", className)}>{children}</div>;
}

export function Preview({ n }: { n: string }) {
  switch (n) {
    case "01": {
      const turns = demo.turns.slice(0, 2);
      return (
        <Box className="flex flex-col gap-2.5">
          {turns.map((t) => (
            <div key={t.i} className="flex items-start gap-2.5">
              <Avatar name={t.name} size={20} className="mt-0.5" />
              <p className="min-w-0"><span className="font-medium">{t.name}</span> <span className="tabular-nums text-faint">{mmss(t.t)}</span><br /><span className="line-clamp-1 text-text">{t.text}</span></p>
            </div>
          ))}
        </Box>
      );
    }
    case "02": {
      const rows: [string, string, number][] = [
        ["Contact", `${demo.fields.contact.value} · ${demo.title}`, demo.fields.contact.confidence],
        ["Deal stage", humanize(demo.fields.stage.value), demo.fields.stage.confidence],
        ["Value", demo.fields.value.value == null ? "None" : money(demo.fields.value.value), demo.fields.value.confidence],
      ];
      return (
        <Box className="grid grid-cols-[88px_minmax(0,1fr)_44px] gap-x-3 gap-y-1.5">
          {rows.map(([k, v, c]) => (
            <div key={k} className="contents">
              <span className="text-soft">{k}</span>
              <span className="truncate">{v}</span>
              <span className="text-right tabular-nums text-soft">{pct(c)}</span>
            </div>
          ))}
        </Box>
      );
    }
    case "03": {
      const lines = demo.draft.body.split("\n").filter(Boolean).slice(0, 2);
      return (
        <Box>
          <p className="font-medium">{demo.draft.subject}</p>
          {lines.map((l, i) => <p key={i} className={cn("text-text", i === 0 && "mt-1.5")}>{l}</p>)}
        </Box>
      );
    }
    case "04":
      return (
        <Box className="grid grid-cols-3 gap-3">
          {[tiles[0], { label: "Won deals", value: String(provenance.won_deals), line: "" }, { label: "Patterns", value: String(patterns.length), line: "" }].map((t) => (
            <div key={t.label}>
              <p className="text-[12px] text-soft">{t.label}</p>
              <p className="text-[18px] font-semibold leading-6 tracking-[-0.02em] tabular-nums">{t.value}</p>
            </div>
          ))}
        </Box>
      );
    case "05": {
      const chips = icpRows[0].calls.slice(0, 3);
      return (
        <Box>
          <p className="text-text">{provenance.won_deals} won deals → {icpRows.map((r) => r.value.toLowerCase()).slice(0, 3).join(" · ")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={c.id} className="inline-flex h-7 items-center rounded-full bg-surface-2 px-3 text-[13px] leading-none">{c.company}</span>
            ))}
          </div>
        </Box>
      );
    }
    case "06": {
      const top = [...leads].sort((a, b) => b.similarity - a.similarity).slice(0, 3);
      return (
        <Box className="grid grid-cols-[minmax(0,1fr)_44px_32px] items-center gap-x-3 gap-y-1.5">
          {top.map((l) => (
            <div key={l.id} className="contents">
              <span className="truncate">{l.company}</span>
              <span className="relative block h-1 w-11 overflow-hidden rounded-full bg-line"><span className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${l.similarity}%` }} /></span>
              <span className={cn("text-right text-[13px] font-medium tabular-nums", l.similarity >= 80 ? "text-success" : "text-ink")}>{l.similarity}</span>
            </div>
          ))}
        </Box>
      );
    }
    case "07":
      return (
        <Box className="flex items-center justify-between gap-3">
          <span className="tabular-nums">1 campaign · 10 queued · 0 sent</span>
          <span className="inline-flex h-6 items-center rounded-full bg-surface px-2.5 text-[12px] font-medium leading-none text-soft">Paused for approval</span>
        </Box>
      );
    default:
      return null;
  }
}
