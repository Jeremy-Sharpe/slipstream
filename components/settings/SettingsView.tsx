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
      <header className="flex items-center justify-between px-11 pt-[34px] pb-7">
        <div className="flex items-center gap-4">
          <span className="flex size-[46px] items-center justify-center rounded-lg bg-icon-well text-foreground"><Settings className="size-[22px]" strokeWidth={1.75} /></span>
          <h1 className="text-[26px] leading-none font-bold tracking-[-0.02em] text-foreground">Settings</h1>
        </div>
      </header>

      <div className="flex gap-10 border-t border-border px-11 pt-7">
        <nav aria-label="Settings sections" className="flex w-[200px] shrink-0 flex-col gap-0.5">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => go(t.key)} aria-current={tab === t.key ? "page" : undefined} className={cn("flex h-10 cursor-pointer items-center rounded-md px-3 text-left text-[16px] text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", tab === t.key && "bg-muted font-medium text-foreground")}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 max-w-[880px] flex-1">
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
