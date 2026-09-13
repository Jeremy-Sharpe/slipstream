"use client";

import { useEffect, useState } from "react";
import { CornerDownRight } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { cn, mmss } from "@/components/ui";

/* Words resolve one by one with a caret; inline citation chips (transcript
   timestamps) pop in mid-sentence; then follow-ups fade in. Remount (key) to
   stream again. */

export type Token = { text: string; cite?: number };
export type Source = { i: number; name: string; text: string; t: number; /** Chip text when the source is not a timestamp (a thread message). */ label?: string };

const WORD_MS = 55;

export function StreamingText({ tokens, sources = [], followUps = [], onCite, onJump, onFollowUp, onDone, className, size = "md" }: {
  tokens: Token[];
  sources?: Source[];
  followUps?: string[];
  onCite?: (turn: number | null) => void;
  onJump?: (turn: number) => void;
  onFollowUp?: (text: string, i: number) => void;
  onDone?: () => void;
  className?: string;
  size?: "md" | "lg";
}) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const done = count >= tokens.length;

  useEffect(() => {
    if (done) { onDone?.(); return; }
    const t = setTimeout(() => setCount((c) => c + 1), WORD_MS);
    return () => clearTimeout(t);
  }, [count, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const chip = (turn: number, key: number) => {
    const src = sources.find((s) => s.i === turn);
    if (!src) return null;
    return (
      <button
        key={key}
        type="button"
        onMouseEnter={() => onCite?.(turn)}
        onMouseLeave={() => onCite?.(null)}
        onClick={() => (onJump ?? onCite)?.(turn)}
        className="mr-1 inline-flex h-[18px] translate-y-[-1px] items-center rounded-[5px] bg-surface px-1.5 align-middle text-[11.5px] font-medium tabular-nums text-text shadow-[inset_0_0_0_1px_#e8e8e8] transition-colors duration-150 hover:bg-[#ececec] hover:text-ink"
        style={{ animation: "pop-in 250ms cubic-bezier(0.23,1,0.32,1) both" }}
      >
        {src.label ?? mmss(src.t)}
      </button>
    );
  };

  return (
    <div className={className}>
      <p className={cn("text-ink", size === "lg" ? "text-[15px] leading-6" : "text-[14px] leading-6")}>
        {tokens.slice(0, count).map((tok, i) => (tok.cite != null ? chip(tok.cite, i) : <span key={i}>{tok.text} </span>))}
        {!done && <span aria-hidden className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 rounded-full bg-ink" style={{ animation: "fade-in 150ms ease-out both" }} />}
      </p>

      {sources.length > 0 && (
        <>
          <div className="mt-2 transition-opacity duration-400" style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none" }}>
            <button type="button" aria-expanded={open} onClick={() => setOpen((c) => !c)} className="-ml-1 flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors duration-150 hover:bg-white">
              <span className="flex -space-x-1">{sources.map((s) => <Avatar key={s.i} name={s.name} size={14} className="ring-[1.5px] ring-surface" />)}</span>
              <span className="text-[13px] text-soft">{sources.length} turns</span>
            </button>
          </div>
          <div className="grid transition-[grid-template-rows,opacity] duration-300" style={{ gridTemplateRows: done && open ? "1fr" : "0fr", opacity: done && open ? 1 : 0, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}>
            <div className="overflow-hidden">
              <ul className="mt-1.5 flex flex-col gap-0.5 rounded-lg bg-white p-1">
                {sources.map((s) => (
                  <li key={s.i}>
                    <button type="button" onMouseEnter={() => onCite?.(s.i)} onMouseLeave={() => onCite?.(null)} onClick={() => (onJump ?? onCite)?.(s.i)} className="grid w-full grid-cols-[14px_minmax(0,1fr)_40px] items-center gap-x-2 rounded-md px-1.5 py-1 text-left transition-colors duration-150 hover:bg-surface-2">
                      <Avatar name={s.name} size={14} />
                      <span className="truncate text-[13px] text-text">{s.text}</span>
                      <span className="text-right text-[12px] tabular-nums text-faint">{s.label ?? mmss(s.t)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {followUps.length > 0 && (
        <div className="mt-3 transition-opacity duration-400" style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none" }}>
          <div className="flex flex-col">
            {followUps.map((text, i) => (
              <button
                key={text}
                type="button"
                onClick={() => onFollowUp?.(text, i)}
                className="-mx-1.5 flex items-center gap-2 rounded-lg border-b border-line-soft px-1.5 py-1.5 text-left text-[13.5px] text-ink transition-colors duration-100 last:border-b-0 hover:bg-white"
                style={done ? { animation: `fade-up 350ms cubic-bezier(0.23,1,0.32,1) ${i * 90}ms both` } : { opacity: 0 }}
              >
                <CornerDownRight className="size-3.5 shrink-0 text-faint" strokeWidth={2} />
                {text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const words = (s: string, cite?: number): Token[] => {
  const t: Token[] = s.split(/\s+/).filter(Boolean).map((w) => ({ text: w }));
  if (cite != null) t.push({ text: "", cite });
  return t;
};
