import type { HomeItem, QuickAction } from "@/lib/types/home";

export const quickActions: QuickAction[] = [
  { id: "add-call", title: "Add a call", description: "Record or upload a call and let it write itself into the CRM." },
  { id: "find-leads", title: "Find leads", description: "Source companies that look like the deals you won.", href: "/leads" },
  { id: "review-drafts", title: "Review drafts", description: "Approve follow-ups and outreach before anything goes out.", href: "/campaigns" },
  { id: "derive-icp", title: "Derive ICP", description: "Work the ideal customer backwards from won deals.", href: "/intelligence" },
  { id: "import-hubspot", title: "Import from HubSpot", description: "Bring in contacts, companies and deals from your CRM.", href: "/settings" },
];

export const homeItems: HomeItem[] = [
  { id: "leads-icp-v3", name: "Leads — ICP v3", type: "list", href: "/lists/leads-icp-v3", tags: ["ICP v3"], createdMinutesAgo: 50, lastOpenedMinutesAgo: 12, owner: "Maxim", access: "Edit" },
  { id: "won-deals", name: "Won deals", type: "list", href: "/lists/won-deals", tags: [], createdMinutesAgo: 47, lastOpenedMinutesAgo: null, owner: "Sam", access: "Edit" },
  { id: "call-history", name: "Call history", type: "calls", href: "/", tags: [], createdMinutesAgo: 47, lastOpenedMinutesAgo: 30, owner: "Maxim", access: "Edit" },
  { id: "outreach-drafts", name: "Outreach drafts", type: "drafts", href: "/campaigns", tags: ["Draft"], createdMinutesAgo: 32, lastOpenedMinutesAgo: 32, owner: "Jordan", access: "Edit" },
  { id: "scorecards", name: "Scorecards", type: "list", href: "/intelligence", tags: [], createdMinutesAgo: 95, lastOpenedMinutesAgo: null, owner: "Sam", access: "Edit" },
  { id: "marlowe-finch-demo", name: "Marlowe & Finch — demo call", type: "call", href: "/", tags: ["Demo"], createdMinutesAgo: 140, lastOpenedMinutesAgo: 5, owner: "Jordan", access: "View" },
];
