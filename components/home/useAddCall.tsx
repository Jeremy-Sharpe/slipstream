"use client";

import { useCallback, useRef } from "react";
import { AddCallDialog } from "@/components/shell/AddCallDialog";

// AddCallDialog carries its own trigger button. Home needs to open it from a
// card and a menu, so the dialog is mounted once, its trigger hidden, and
// clicked programmatically.
export function useAddCall() {
  const wrap = useRef<HTMLDivElement>(null);
  const open = useCallback(() => wrap.current?.querySelector("button")?.click(), []);
  const mount = <div ref={wrap} className="hidden" aria-hidden><AddCallDialog /></div>;
  return { open, mount };
}
