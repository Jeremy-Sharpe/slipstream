"use client";

import { useSyncExternalStore } from "react";
import { campaigns as seed, defaultSteps } from "@/lib/legacy/data/campaigns";
import { leads } from "@/lib/legacy/data/leads";
import type { Campaign, CampaignPerson, PersonStatus, SequenceStep, StepChannel } from "@/lib/legacy/types/campaigns";

// Module-level state so the list and the detail page share edits across
// navigation. Swapped for API calls when the campaigns router lands.

let state: Campaign[] = seed;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };

export function useCampaigns(): Campaign[] {
  return useSyncExternalStore(subscribe, () => state, () => seed);
}

export function useCampaign(id: string): Campaign | undefined {
  const all = useCampaigns();
  return all.find((c) => c.id === id);
}

const now = () => new Date().toISOString();

function update(id: string, fn: (c: Campaign) => Campaign) {
  state = state.map((c) => (c.id === id ? { ...fn(c), updatedMinutesAgo: 0 } : c));
  emit();
}

function log(c: Campaign, text: string): Campaign {
  return { ...c, log: [...c.log, { at: now(), text }] };
}

export const campaignActions = {
  create(name: string, source: string): Campaign {
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
    const people: CampaignPerson[] = source === "Won deals" ? [] : leads.slice(0, 5).map((l, i) => ({
      id: `${id}-${l.id}`, leadId: l.id, name: l.person, company: l.company, title: l.title, step: 1, status: "pending",
      nextAction: new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10),
      copy: [
        { subject: l.draft?.subject ?? `Managed IT for ${l.company}`, body: l.draft?.body ?? `Hi ${l.person.split(" ")[0]},\n\nShort note about IT at ${l.company}.\n\nSam` },
        { subject: `Re: ${l.draft?.subject ?? `Managed IT for ${l.company}`}`, body: `Hi ${l.person.split(" ")[0]},\n\nFollowing up on my note. Fifteen minutes if useful.\n\nSam` },
        { body: `Hi ${l.person.split(" ")[0]}, following up on my email about ${l.company}.` },
      ],
    }));
    const campaign: Campaign = { id, name, status: "draft", owner: "Maxim", source, updatedMinutesAgo: 0, steps: defaultSteps, people, log: [{ at: now(), text: `Campaign created from ${source}` }] };
    state = [campaign, ...state];
    emit();
    return campaign;
  },
  rename(id: string, name: string) { update(id, (c) => log({ ...c, name }, `Renamed to ${name}`)); },
  duplicate(id: string) {
    const src = state.find((c) => c.id === id);
    if (!src) return;
    const copy: Campaign = { ...src, id: `${src.id}-copy-${Date.now().toString(36)}`, name: `${src.name} (copy)`, status: "draft", owner: "Maxim", updatedMinutesAgo: 0, log: [{ at: now(), text: `Duplicated from ${src.name}` }] };
    const i = state.findIndex((c) => c.id === id);
    state = [...state.slice(0, i + 1), copy, ...state.slice(i + 1)];
    emit();
  },
  remove(id: string): { campaign: Campaign; index: number } | null {
    const index = state.findIndex((c) => c.id === id);
    if (index < 0) return null;
    const campaign = state[index];
    state = state.filter((c) => c.id !== id);
    emit();
    return { campaign, index };
  },
  restore(campaign: Campaign, index: number) {
    state = [...state.slice(0, index), campaign, ...state.slice(index)];
    emit();
  },
  toggleStatus(id: string) {
    update(id, (c) => {
      const next = c.status === "active" ? "paused" : "active";
      const people = c.people.map((p) => (next === "paused" && p.status === "pending" ? { ...p, status: "paused" as const } : next === "active" && p.status === "paused" ? { ...p, status: "pending" as const } : p));
      return log({ ...c, status: next, people }, next === "paused" ? "Paused" : "Resumed");
    });
  },
  setPerson(id: string, personId: string, status: PersonStatus) {
    update(id, (c) => {
      const p = c.people.find((x) => x.id === personId);
      const people = c.people.map((x) => (x.id === personId ? { ...x, status, step: status === "approved" ? Math.min(x.step + 1, c.steps.length) : x.step } : x));
      const text = status === "approved" ? `Approved ${p?.name ?? "person"} · nothing is sent` : status === "skipped" ? `Skipped ${p?.name ?? "person"}` : `${p?.name ?? "Person"} set to ${status}`;
      return log({ ...c, people }, text);
    });
  },
  removePerson(id: string, personId: string) {
    update(id, (c) => { const p = c.people.find((x) => x.id === personId); return log({ ...c, people: c.people.filter((x) => x.id !== personId) }, `Removed ${p?.name ?? "person"}`); });
  },
  approveAll(id: string) {
    update(id, (c) => {
      const n = c.people.filter((p) => p.status === "pending").length;
      const people = c.people.map((p) => (p.status === "pending" ? { ...p, status: "approved" as const, step: Math.min(p.step + 1, c.steps.length) } : p));
      return log({ ...c, people }, `Approved ${n} people · nothing is sent`);
    });
  },
  editCopy(id: string, personId: string, stepIndex: number, copy: { subject?: string; body: string }) {
    update(id, (c) => ({ ...c, people: c.people.map((p) => (p.id === personId ? { ...p, copy: p.copy.map((k, i) => (i === stepIndex ? copy : k)) } : p)) }));
  },
  editStep(id: string, stepId: string, patch: Partial<SequenceStep>) {
    update(id, (c) => ({ ...c, steps: c.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) }));
  },
  addStep(id: string, channel: StepChannel, delayDays: number) {
    update(id, (c) => {
      const step: SequenceStep = { id: `s${Date.now().toString(36)}`, channel, delayDays, subject: channel === "email" ? "Re: {{subject}}" : undefined, body: channel === "email" ? "One-line check-in with the same fifteen-minute ask." : "Short LinkedIn note referencing the thread." };
      const people = c.people.map((p) => ({ ...p, copy: [...p.copy, { subject: channel === "email" ? `Re: ${p.copy[0]?.subject ?? ""}` : undefined, body: channel === "email" ? `Hi ${p.name.split(" ")[0]},\n\nChecking in once more. Fifteen minutes if the timing works.\n\nSam` : `Hi ${p.name.split(" ")[0]}, following up on the thread about ${p.company}.` }] }));
      return log({ ...c, steps: [...c.steps, step], people }, `Added step ${c.steps.length + 1} (${channel})`);
    });
  },
  removeStep(id: string, stepId: string) {
    update(id, (c) => {
      const i = c.steps.findIndex((s) => s.id === stepId);
      if (i < 0 || c.steps.length <= 1) return c;
      return log({ ...c, steps: c.steps.filter((s) => s.id !== stepId), people: c.people.map((p) => ({ ...p, copy: p.copy.filter((_, k) => k !== i), step: Math.min(p.step, c.steps.length - 1) })) }, `Removed step ${i + 1}`);
    });
  },
};

export function exportCsv(c: Campaign) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["Person", "Company", "Title", "Step", "Status", "Next action"], ...c.people.map((p) => [p.name, p.company, p.title, `${p.step} of ${c.steps.length}`, p.status, p.nextAction])];
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${c.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`; a.click();
  URL.revokeObjectURL(url);
}
