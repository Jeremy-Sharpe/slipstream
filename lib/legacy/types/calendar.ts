export type CalendarEvent = {
  id: string;
  contact: string;
  company: string;
  rep: "Sam Whitfield" | "Jordan Lee";
  /** ISO datetime, Australia/Melbourne local */
  startsAt: string;
  durationMin: number;
  /** The coach overlay is armed for this call. */
  coach: boolean;
  /** Links to the last conversation with this company, when one exists. */
  conversationId?: string;
  headcount?: number;
  location?: string;
  /** Why this company fits the derived ICP. */
  icpFit: string;
  promises: string[];
  nextStep?: string;
};
