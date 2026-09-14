"use client";

import { useState } from "react";
import { company as seller, user } from "@/lib/data/seller";
import { Button, cn } from "./ui";

/* Settings: the few things a rep would actually touch. The account starts
   from the sample identity in lib/data/seller; choices are kept for this
   session only, and the CRM status is what the API reports. */

const CRM = ["HubSpot", "Pipedrive", "Salesforce", "Attio"] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_minmax(0,1fr)] items-center gap-6 py-3.5">
      <p className="text-[13.5px] text-ink">{label}</p>
      <div className="flex items-center justify-end gap-2">{children}</div>
    </div>
  );
}

function Field({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-9 w-64 rounded-full bg-white px-4 text-[13.5px] text-ink outline-none transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-accent/40", className)}
    />
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40", on ? "bg-ink" : "bg-[#d4d4d4]")}
    >
      <span className={cn("absolute top-0.5 left-0.5 size-4 rounded-full transition-[transform,background-color] duration-150", on ? "translate-x-4 bg-accent" : "bg-white")} />
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface-2 px-6 py-3">
      <p className="pt-2 pb-1 text-[12px] font-medium tracking-[0.04em] text-faint uppercase">{title}</p>
      <div className="divide-y divide-line-soft">{children}</div>
    </section>
  );
}

export function SettingsView({ crmConnected }: { crmConnected: boolean | null }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [company, setCompany] = useState(seller.name);
  const [crm, setCrm] = useState<(typeof CRM)[number]>("HubSpot");
  const [approveFields, setApproveFields] = useState(true);
  const [approveFollowUp, setApproveFollowUp] = useState(true);
  const [notifyDone, setNotifyDone] = useState(true);
  const [notifyLeads, setNotifyLeads] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);

  /** Forgets what this browser added (runs, pasted calls, searches, drafts) and reloads on Home. */
  function resetWorkspace() {
    setResetting(true);
    try {
      for (const key of Object.keys(window.localStorage)) if (key.startsWith("slipstream.")) window.localStorage.removeItem(key);
    } catch {
      // Storage off: nothing to forget.
    }
    window.location.assign("/home");
  }

  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="max-w-[760px]">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Settings</h1>
      <p className="mt-2 text-[14px] text-soft">Your account, your CRM, and what needs your approval.</p>

      <div className="mt-8 flex flex-col gap-4">
        <Card title="Account">
          <Row label="Name">
            <Field value={name} onChange={setName} />
          </Row>
          <Row label="Email">
            <Field value={email} onChange={setEmail} />
          </Row>
          <Row label="Company">
            <Field value={company} onChange={setCompany} />
          </Row>
        </Card>

        <Card title="CRM">
          <Row label="Connected to">
            <div className="flex gap-1.5">
              {CRM.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCrm(c)}
                  className={cn(
                    "h-8 rounded-full px-3 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                    crm === c ? "bg-ink text-white" : "bg-white text-soft hover:text-ink",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Status">
            <span className="text-[13.5px] text-soft">
              {crmConnected === null
                ? "Status unavailable, the API did not answer"
                : crmConnected
                  ? "Connected · Nothing is written without your approval"
                  : "Not connected on this deployment · Approved fields stay in Slipstream"}
            </span>
          </Row>
        </Card>

        <Card title="Approvals">
          <Row label="Extracted fields">
            <Toggle on={approveFields} onChange={setApproveFields} label="Approve extracted fields" />
          </Row>
          <Row label="Follow-up">
            <Toggle on={approveFollowUp} onChange={setApproveFollowUp} label="Approve follow-up" />
          </Row>
        </Card>

        <Card title="Notifications">
          <Row label="A run needs my approval">
            <Toggle on={notifyDone} onChange={setNotifyDone} label="Notify when a run needs approval" />
          </Row>
          <Row label="New leads are ready">
            <Toggle on={notifyLeads} onChange={setNotifyLeads} label="Notify when leads are ready" />
          </Row>
        </Card>

        <Card title="Workspace">
          <Row label="Start fresh">
            <Button onClick={resetWorkspace}>{resetting ? "Resetting" : "Reset"}</Button>
          </Row>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="primary" onClick={save}>Save</Button>
        <span className={cn("text-[13px] text-soft transition-opacity duration-150", saved ? "opacity-100" : "opacity-0")}>Saved</span>
      </div>
    </div>
  );
}
