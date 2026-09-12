"use client";

import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ApiKeysPanel, CrmPanel, IntegrationsPanel, NotificationsPanel, TeamPanel, WorkspacePanel } from "./panels";

const TABS = [
  { key: "workspace", label: "Workspace" },
  { key: "crm", label: "CRM" },
  { key: "team", label: "Team" },
  { key: "integrations", label: "Integrations" },
  { key: "api-keys", label: "API keys" },
  { key: "notifications", label: "Notifications" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function SettingsView() {
  const [tab, setTab] = useState<Tab>("workspace");

  // Deep-link support: /settings#team
  useEffect(() => {
    const h = window.location.hash.replace("#", "") as Tab;
    if (TABS.some((t) => t.key === h)) setTab(h);
  }, []);
  const go = (t: Tab) => { setTab(t); window.history.replaceState(null, "", `#${t}`); };

  return (
    <div className="flex flex-col pb-10">
      <header className="flex items-center justify-between px-9 pt-8 pb-6">
        <div className="flex items-center gap-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-icon-well text-foreground"><Settings className="size-5" strokeWidth={1.75} /></span>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Settings</h1>
        </div>
      </header>

      <div className="flex gap-8 border-t border-border px-9 pt-6">
        <nav aria-label="Settings sections" className="flex w-[200px] shrink-0 flex-col gap-0.5">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => go(t.key)} aria-current={tab === t.key ? "page" : undefined} className={cn("flex h-9 items-center rounded-md px-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", tab === t.key && "bg-muted font-medium text-foreground")}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 max-w-3xl flex-1">
          {tab === "workspace" && <WorkspacePanel />}
          {tab === "crm" && <CrmPanel />}
          {tab === "team" && <TeamPanel />}
          {tab === "integrations" && <IntegrationsPanel />}
          {tab === "api-keys" && <ApiKeysPanel />}
          {tab === "notifications" && <NotificationsPanel />}
        </div>
      </div>
    </div>
  );
}
