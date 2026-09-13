// Suggested values for each lead-search criterion. Drawn from the Harbourline
// ICP: professional services and allied health in Victoria, 25–80 staff, a
// practice or operations manager as the buyer, and a concrete trigger.
export const filterSuggestions = {
  buyer_title: [
    "Practice Manager",
    "Operations Manager",
    "Office Manager",
    "General Manager",
    "Director",
    "Practice Owner",
    "Studio Operations Manager",
    "Finance Manager",
    "Managing Partner",
    "CFO",
    "Operations Lead",
    "Business Manager",
  ],
  industry: [
    "Law firm",
    "Accounting practice",
    "Architecture studio",
    "Physiotherapy clinic",
    "Dental practice",
    "Allied health",
    "Engineering consultancy",
    "Veterinary",
    "Planning consultancy",
    "Conveyancing",
    "Podiatry",
    "Osteopathy",
  ],
  trigger: [
    "Cyber-insurance renewal",
    "Essential Eight evidence",
    "Office move",
    "Microsoft 365 migration",
    "Internal IT person leaving",
    "Phishing incident",
    "Procurement security questionnaire",
    "New site opened",
    "Panel supplier review",
    "New financial year budget",
  ],
  region: ["Melbourne", "Geelong", "Ballarat", "Bendigo", "Regional Victoria", "Sydney", "Brisbane", "Australia"],
  size: ["15–25 staff", "25–80 staff", "80–120 staff", "120+ staff"],
  target: [],
} as const;

export type SuggestionKey = keyof typeof filterSuggestions;
