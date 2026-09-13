"use client";

import { useSyncExternalStore } from "react";
import { conversations as seed } from "@/lib/legacy/data/conversations";
import type { Conversation } from "@/lib/legacy/types";

// Module-level store so the top bar (layout) and the feed (page) share one
// list. Replaced by Supabase reads once the API lands; the hook stays.
let rows: Conversation[] = seed;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export const getConversations = () => rows;
const getServerSnapshot = () => seed;

export function useConversations(): Conversation[] {
  return useSyncExternalStore(subscribe, getConversations, getServerSnapshot);
}

export function addConversation(row: Conversation) {
  rows = [row, ...rows];
  emit();
  // The pipeline is mocked: transcription "finishes" a few seconds later.
  window.setTimeout(() => patchConversation(row.id, { status: "needs_review" }), 3000);
}

export function patchConversation(id: string, patch: Partial<Conversation>) {
  rows = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
  emit();
}
