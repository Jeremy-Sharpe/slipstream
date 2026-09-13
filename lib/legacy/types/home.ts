// Home surface: the workspace objects listed under "Recent".

export type HomeItemType = "list" | "calls" | "call" | "drafts";
export type Owner = "Maxim" | "Sam" | "Jordan";

export type HomeItem = {
  id: string;
  name: string;
  type: HomeItemType;
  href: string;
  tags: string[];
  /** Minutes ago, so relative times render the same on server and client. */
  createdMinutesAgo: number;
  lastOpenedMinutesAgo: number | null;
  owner: Owner;
  access: "Edit" | "View";
};

export type QuickAction = {
  id: "add-call" | "find-leads" | "review-drafts" | "derive-icp" | "import-hubspot";
  title: string;
  description: string;
  href?: string;
};
