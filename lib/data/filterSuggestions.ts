// Suggested values for each lead-search criterion. Drawn from the Eleno ICP:
// investment research, lending, financial advice, commercial property and
// auction businesses in Victoria and New South Wales, 25–80 staff, the
// workflow owner as the buyer, and a concrete drafting or reporting backlog.
export const filterSuggestions = {
  buyer_title: [
    "Managing Partner",
    "Head of Credit Operations",
    "Practice Manager",
    "Director",
    "General Manager",
    "Operations Lead",
    "Head of Member Services",
    "Studio Operations Manager",
    "Chief Operating Officer",
    "Head of Property Management",
    "Practice Owner",
    "CFO",
  ],
  industry: [
    "Quantitative investment research boutique",
    "Non-bank commercial lender",
    "Financial planning and wealth advice firm",
    "Commercial real estate agency",
    "Fine art and collectables auction house",
    "Stockbroking and financial advisory firm",
    "Real estate debt fund manager",
    "Real estate debt and equity fund manager",
    "Commercial and industrial real estate agency",
    "State transport infrastructure project",
    "Commercial law firm",
    "Accounting practice",
  ],
  trigger: [
    "Research note production doubling",
    "Loan document turnaround blowing out",
    "Statement of advice drafting backlog",
    "Lease abstraction taking a week a month",
    "Consignment intake and cataloguing bottleneck",
    "New fund launch",
    "Acquisition of a smaller practice",
    "Fee proposal drafting backlog",
    "Complaints volume up after a migration",
    "Contract review pilot before the financial year",
  ],
  region: ["Melbourne", "Geelong", "Ballarat", "Bendigo", "Regional Victoria", "Sydney", "Brisbane", "Australia"],
  size: ["15–25 staff", "25–80 staff", "80–120 staff", "120+ staff"],
  target: [],
} as const;

export type SuggestionKey = keyof typeof filterSuggestions;
