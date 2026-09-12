"use client";

import { Check, Copy, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { hubspot, integrations, team as seedTeam, workspace as seedWorkspace } from "@/lib/data/settings";
import type { ApiKey, Integration, TeamMember, TeamRole } from "@/lib/types/settings";
import { cn } from "@/lib/utils";
import { Card, fieldLabel, outlineBtn, primaryBtn, StatusDot, Switch } from "./primitives";

const ROLES: TeamRole[] = ["Admin", "Senior AE", "AE", "Viewer"];
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function useSaved(): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (!saved) return; const t = window.setTimeout(() => setSaved(false), 2000); return () => window.clearTimeout(t); }, [saved]);
  return [saved, () => setSaved(true)];
}

function useStored<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => { try { const raw = localStorage.getItem(key); if (raw) setValue(JSON.parse(raw) as T); } catch {} }, [key]);
  const set = (v: T) => { setValue(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };
  return [value, set];
}

// ---------------------------------------------------------------- Workspace

export function WorkspacePanel() {
  const [ws, setWs] = useState(seedWorkspace);
  const [saved, save] = useSaved();
  return (
    <Card title="Workspace" description="What the team sees at the top of every page and how numbers are shown.">
      <form className="grid max-w-xl grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="col-span-2 flex flex-col gap-1.5"><span className={fieldLabel}>Workspace name</span><Input value={ws.name} onChange={(e) => setWs({ ...ws, name: e.target.value })} /></label>
        <label className="flex flex-col gap-1.5"><span className={fieldLabel}>Timezone</span>
          <select value={ws.timezone} onChange={(e) => setWs({ ...ws, timezone: e.target.value })} className="h-10 rounded-md border border-border bg-card px-3 text-[16px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <option>Australia/Melbourne</option><option>Australia/Sydney</option><option>Australia/Brisbane</option><option>Australia/Perth</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5"><span className={fieldLabel}>Currency</span>
          <select value={ws.currency} onChange={(e) => setWs({ ...ws, currency: e.target.value })} className="h-10 rounded-md border border-border bg-card px-3 text-[16px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <option>AUD</option><option>NZD</option><option>USD</option>
          </select>
        </label>
        <div className="col-span-2 flex items-center gap-3">
          <button type="submit" className={primaryBtn}>Save</button>
          {saved && <span className="text-[15px] text-muted-foreground" role="status">Saved</span>}
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------- CRM

export function CrmPanel() {
  const [connected, setConnected] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncedJustNow, setSyncedJustNow] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const sync = () => { setSyncing(true); window.setTimeout(() => { setSyncing(false); setSyncedJustNow(true); }, 1500); };

  return (
    <Card title="CRM" description="Slipstream writes calls, notes, tasks and drafts into your CRM. Nothing changes without an approval.">
      <div className="flex items-start justify-between gap-6 rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-icon-well text-[13px] font-semibold text-foreground">Hs</span>
          <div>
            <p className="flex items-center gap-2 text-[17px] font-semibold text-foreground">HubSpot <span className="flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs font-normal text-foreground/80"><StatusDot on={connected} />{connected ? "Connected · mock" : "Disconnected"}</span></p>
            {connected ? (
              <p className="mt-1 text-[15px] text-muted-foreground">Portal {hubspot.portalId} · {syncedJustNow ? "Synced just now" : `Synced ${hubspot.lastSyncMinutesAgo} min ago`} · {hubspot.objects.join(", ")}</p>
            ) : (
              <p className="mt-1 text-[15px] text-muted-foreground">Connect a portal to write calls and drafts back to your records.</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {connected ? (
            <>
              <button type="button" onClick={sync} disabled={syncing} className={outlineBtn}><RefreshCw className={cn("size-4", syncing && "animate-spin")} strokeWidth={1.75} />{syncing ? "Syncing…" : "Sync now"}</button>
              <Dialog open={confirm} onOpenChange={setConfirm}>
                <DialogTrigger render={<button type="button" className={outlineBtn} />}>Disconnect</DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader><DialogTitle>Disconnect HubSpot?</DialogTitle><DialogDescription>Calls keep processing, but nothing is written back until you reconnect.</DialogDescription></DialogHeader>
                  <DialogFooter>
                    <button type="button" onClick={() => setConfirm(false)} className={outlineBtn}>Cancel</button>
                    <button type="button" onClick={() => { setConnected(false); setConfirm(false); }} className={primaryBtn}>Disconnect</button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <button type="button" onClick={() => { setConnected(true); setSyncedJustNow(true); }} className={primaryBtn}>Connect</button>
          )}
        </div>
      </div>
      <p className="mt-3 text-[14px] text-muted-foreground">Object mapping: contacts, companies, deals, calls, notes, tasks and emails mirror the HubSpot objects, so a real integration is a field mapping rather than a redesign.</p>
    </Card>
  );
}

// --------------------------------------------------------------------- Team

export function TeamPanel() {
  const [members, setMembers] = useState<TeamMember[]>(seedTeam);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("AE");

  const invite = () => {
    const e = email.trim();
    if (!e.includes("@")) return;
    setMembers((m) => [...m, { id: `inv-${Date.now().toString(36)}`, name: e.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), email: e, role, status: "pending" }]);
    setEmail(""); setOpen(false);
  };

  return (
    <Card title="Team" description="Who can see conversations and approve drafts.">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-[16px]">
          <thead><tr className="border-b border-border bg-page text-left text-[14px] font-semibold text-foreground"><th className="px-5 py-3.5">Member</th><th className="px-5 py-3.5">Email</th><th className="px-5 py-3.5">Role</th><th className="px-5 py-3.5">Status</th><th className="w-12" /></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-b-0">
                <td className="px-5 py-3.5"><span className="flex items-center gap-2.5"><span className="flex size-7 items-center justify-center rounded-full bg-avatar text-[11px] font-medium text-foreground">{initials(m.name)}</span><span className="font-medium text-foreground">{m.name}</span></span></td>
                <td className="px-5 py-3.5 text-muted-foreground">{m.email}</td>
                <td className="px-5 py-3.5">
                  <select value={m.role} onChange={(e) => setMembers((cur) => cur.map((x) => (x.id === m.id ? { ...x, role: e.target.value as TeamRole } : x)))} aria-label={`Role for ${m.name}`} className="h-8 rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3.5"><span className="flex items-center gap-1.5 text-foreground/80"><StatusDot on={m.status === "active"} />{m.status === "active" ? "Active" : "Pending"}</span></td>
                <td className="px-2 py-2.5 text-right">{m.status === "pending" && <button type="button" aria-label={`Remove ${m.email}`} onClick={() => setMembers((cur) => cur.filter((x) => x.id !== m.id))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 className="size-4" strokeWidth={1.75} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<button type="button" className={primaryBtn} />}><Plus className="size-4" strokeWidth={2.25} />Invite</DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Invite a teammate</DialogTitle><DialogDescription>They get an email with a link to join Harbourline IT.</DialogDescription></DialogHeader>
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); invite(); }}>
              <label className="flex flex-col gap-1.5"><span className={fieldLabel}>Email</span><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@harbourline.example" autoFocus /></label>
              <label className="flex flex-col gap-1.5"><span className={fieldLabel}>Role</span>
                <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)} className="h-10 rounded-md border border-border bg-card px-3 text-[16px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
              </label>
              <DialogFooter><button type="button" onClick={() => setOpen(false)} className={outlineBtn}>Cancel</button><button type="submit" disabled={!email.includes("@")} className={primaryBtn}>Send invite</button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------- Integrations

function ConfigureDialog({ integration, current, onSave }: { integration: Integration; current?: string; onSave: (last4: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const save = () => { const v = value.trim(); if (v.length < 4) return; onSave(v.slice(-4)); setValue(""); setOpen(false); };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" className={outlineBtn} />}>{current ? "Update" : "Configure"}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{integration.name}</DialogTitle><DialogDescription>{integration.purpose}.</DialogDescription></DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label className="flex flex-col gap-1.5"><span className={fieldLabel}>{integration.kind === "key" ? "API key" : "Connection string"}</span><Input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder={current ? `•••• ${current}` : integration.kind === "key" ? "Paste the key" : "Paste the URL"} autoFocus /></label>
          <p className="text-[14px] text-muted-foreground">Keys are shared in the group chat until 1Password is set up. This one stays in your browser only.</p>
          <DialogFooter>
            {current && <button type="button" onClick={() => { onSave(null); setOpen(false); }} className={outlineBtn}>Remove</button>}
            <button type="submit" disabled={value.trim().length < 4} className={primaryBtn}>Save</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IntegrationsPanel() {
  const [keys, setKeys] = useStored<Record<string, string>>("slipstream.integrations", {});
  return (
    <Card title="Integrations" description="Everything the pipeline calls. A missing key shows as not set; the screens keep working on fixture data.">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {integrations.map((i) => {
          const last4 = keys[i.id];
          return (
            <li key={i.id} className="flex items-center gap-4 px-4 py-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-icon-well text-[13px] font-semibold text-foreground">{i.name.slice(0, 2)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-medium text-foreground">{i.name}</p>
                <p className="truncate text-[14px] text-muted-foreground">{i.purpose}</p>
              </div>
              <span className="flex items-center gap-1.5 text-[15px] text-foreground/80"><StatusDot on={!!last4} />{last4 ? `•••• ${last4}` : i.kind === "key" ? "No API key" : "Not connected"}</span>
              <ConfigureDialog integration={i} current={last4} onSave={(v) => { const next = { ...keys }; if (v) next[i.id] = v; else delete next[i.id]; setKeys(next); }} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ----------------------------------------------------------------- API keys

export function ApiKeysPanel() {
  const [list, setList] = useStored<ApiKey[]>("slipstream.apiKeys", []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = () => {
    const n = name.trim(); if (!n) return;
    const secret = `ss_live_${Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
    setList([...list, { id: `key-${Date.now().toString(36)}`, name: n, last4: secret.slice(-4), createdAt: new Date().toISOString() }]);
    setFresh(secret); setName("");
  };
  const copy = async () => { if (!fresh) return; try { await navigator.clipboard.writeText(fresh); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch {} };
  const dateFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", year: "numeric" });

  return (
    <Card title="API keys" description="For your own scripts against the Slipstream API. Shown once, stored hashed.">
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-[15px] text-muted-foreground">No keys yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.map((k) => (
            <li key={k.id} className="flex items-center gap-4 px-5 py-3.5 text-[16px]">
              <span className="flex-1 font-medium text-foreground">{k.name}</span>
              <span className="font-mono text-muted-foreground">ss_live_…{k.last4}</span>
              <span className="text-muted-foreground">{dateFmt.format(new Date(k.createdAt))}</span>
              <button type="button" aria-label={`Revoke ${k.name}`} onClick={() => setList(list.filter((x) => x.id !== k.id))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 className="size-4" strokeWidth={1.75} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFresh(null); }}>
          <DialogTrigger render={<button type="button" className={primaryBtn} />}><Plus className="size-4" strokeWidth={2.25} />Create key</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{fresh ? "Copy your key" : "Create an API key"}</DialogTitle><DialogDescription>{fresh ? "This is the only time it is shown." : "Name it after what will use it."}</DialogDescription></DialogHeader>
            {fresh ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 rounded-md border border-border bg-page px-3 py-2 font-mono text-[13px] break-all text-foreground">{fresh}</div>
                <DialogFooter>
                  <button type="button" onClick={copy} className={outlineBtn}>{copied ? <><Check className="size-4" strokeWidth={2} />Copied</> : <><Copy className="size-4" strokeWidth={1.75} />Copy</>}</button>
                  <button type="button" onClick={() => { setOpen(false); setFresh(null); }} className={primaryBtn}>Done</button>
                </DialogFooter>
              </div>
            ) : (
              <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); create(); }}>
                <label className="flex flex-col gap-1.5"><span className={fieldLabel}>Name</span><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zapier, internal script…" autoFocus /></label>
                <DialogFooter><button type="button" onClick={() => setOpen(false)} className={outlineBtn}>Cancel</button><button type="submit" disabled={!name.trim()} className={primaryBtn}>Create</button></DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------ Notifications

const NOTIFICATIONS: { key: string; label: string; help: string }[] = [
  { key: "call_processed", label: "New call processed", help: "When a transcript, its CRM fields and scorecard are ready to review." },
  { key: "draft_ready", label: "Draft ready to approve", help: "A follow-up or outreach draft is waiting for you." },
  { key: "search_finished", label: "Lead search finished", help: "Origami returned and scored a new batch of leads." },
];

export function NotificationsPanel() {
  const [prefs, setPrefs] = useStored<Record<string, boolean>>("slipstream.notifications", { call_processed: true, draft_ready: true, search_finished: false });
  return (
    <Card title="Notifications" description="What shows up under the bell.">
      <ul className="divide-y divide-border">
        {NOTIFICATIONS.map((n) => (
          <li key={n.key} className="flex items-center justify-between gap-6 py-3 first:pt-0 last:pb-0">
            <div><p className="text-[16px] font-medium text-foreground">{n.label}</p><p className="text-[14px] text-muted-foreground">{n.help}</p></div>
            <Switch checked={!!prefs[n.key]} onChange={(v) => setPrefs({ ...prefs, [n.key]: v })} label={n.label} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
