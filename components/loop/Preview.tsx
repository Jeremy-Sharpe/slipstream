import { Avatar } from "@/components/Avatar";
import { cn, mmss } from "@/components/ui";
import type { BeatPreview } from "@/lib/loop";

/* A small artefact preview inside each beat's card: the thing the beat
   produced, flat white, 13.5px, no colour beyond the score green. Every value
   comes from the API through lib/loop; a beat with nothing derived says so. */

function Box({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl bg-white p-3.5 text-[13.5px] leading-5 text-ink", className)}>{children}</div>;
}

export function Preview({ preview }: { preview: BeatPreview | null }) {
  if (!preview) return <p className="text-[13.5px] text-faint">Not yet derived.</p>;
  switch (preview.kind) {
    case "turns":
      return (
        <Box className="flex flex-col gap-2.5">
          {preview.turns.map((t) => (
            <div key={t.key} className="flex items-start gap-2.5">
              <Avatar name={t.name} size={20} className="mt-0.5" />
              <p className="min-w-0"><span className="font-medium">{t.name}</span> <span className="tabular-nums text-faint">{mmss(t.t)}</span><br /><span className="line-clamp-1 text-text">{t.text}</span></p>
            </div>
          ))}
        </Box>
      );
    case "fields":
      return (
        <Box className="grid grid-cols-[88px_minmax(0,1fr)_44px] gap-x-3 gap-y-1.5">
          {preview.rows.map((r) => (
            <div key={r.label} className="contents">
              <span className="text-soft">{r.label}</span>
              <span className="truncate">{r.value}</span>
              <span className="text-right tabular-nums text-soft">{Math.round(r.confidence * 100)}%</span>
            </div>
          ))}
        </Box>
      );
    case "follow-up":
      return (
        <Box>
          <p className="font-medium">{preview.title}</p>
          {preview.lines.map((l, i) => <p key={l} className={cn("text-text", i === 0 && "mt-1.5")}>{l}</p>)}
        </Box>
      );
    case "numbers":
      return (
        <Box className="grid grid-cols-3 gap-3">
          {preview.items.map((t) => (
            <div key={t.label}>
              <p className="text-[12px] text-soft">{t.label}</p>
              <p className="text-[18px] font-semibold leading-6 tracking-[-0.02em] tabular-nums">{t.value}</p>
            </div>
          ))}
        </Box>
      );
    case "icp":
      return (
        <Box>
          <p className="text-text">{preview.line}</p>
          {preview.companies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preview.companies.map((c) => (
                <span key={c} className="inline-flex h-7 items-center rounded-full bg-white px-3 text-[13px] leading-none shadow-[inset_0_0_0_1px_#e8e8e8]">{c}</span>
              ))}
            </div>
          )}
        </Box>
      );
    case "leads":
      return (
        <Box className="grid grid-cols-[minmax(0,1fr)_44px_32px] items-center gap-x-3 gap-y-1.5">
          {preview.leads.map((l) => (
            <div key={l.id} className="contents">
              <span className="truncate">{l.company}</span>
              <span className="relative block h-1 w-11 overflow-hidden rounded-full bg-line"><span className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${l.similarity}%` }} /></span>
              <span className={cn("text-right text-[13px] font-medium tabular-nums", l.similarity >= 80 ? "text-success" : "text-ink")}>{l.similarity}</span>
            </div>
          ))}
        </Box>
      );
    case "campaign":
      return (
        <Box className="flex items-center justify-between gap-3">
          <span className="tabular-nums">{preview.line}</span>
          <span className="inline-flex h-6 items-center rounded-full bg-surface px-2.5 text-[12px] font-medium leading-none text-soft">{preview.state}</span>
        </Box>
      );
  }
}
