"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { calls } from "@/lib/calls";
import { actions } from "@/lib/store";
import { Avatar } from "./Avatar";
import { Button, cn, fmtDate } from "./ui";

export function AddCallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string>(calls[0].id);
  const [file, setFile] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const add = () => {
    const source = calls.find((c) => c.id === picked)!;
    const c = actions.addCall(source, file ? { name: file } : undefined);
    onClose();
    router.push(`/calls/${c.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/10 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal aria-label="Add a call" className="rise w-[520px] rounded-2xl bg-white p-6 shadow-[0_12px_40px_rgba(24,25,37,.14)]">
        <h2 className="text-[16px] font-semibold text-ink">Add a call</h2>
        <p className="mt-1 text-[13px] text-soft">Pick a recorded call or upload audio. It starts running straight away.</p>

        <div className="mt-5 max-h-[300px] overflow-y-auto rounded-xl bg-surface-2 p-1.5">
          {calls.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setPicked(c.id); setFile(null); }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                picked === c.id && !file ? "bg-white shadow-[var(--shadow-card)]" : "hover:bg-white/70",
              )}
            >
              <Avatar name={c.contact} size={24} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{c.contact} <span className="font-normal text-soft">· {c.company}</span></span>
              </span>
              <span className="font-mono text-[11.5px] text-faint">{fmtDate(c.at)}</span>
            </button>
          ))}
        </div>

        <label className={cn("mt-3 flex h-10 cursor-pointer items-center justify-between rounded-full px-4 text-[13px] transition-colors duration-150", file ? "bg-white text-ink shadow-[var(--shadow-card)]" : "bg-surface text-soft hover:bg-[#ececec]")}>
          <span>{file ?? "Or upload an audio file"}</span>
          <input type="file" accept="audio/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
          <span className="text-faint">{file ? "Change" : "Browse"}</span>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={add}>Add call</Button>
        </div>
      </div>
    </div>
  );
}
