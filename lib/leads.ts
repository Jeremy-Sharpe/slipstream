import type { Lead } from "./types";

// Twelve leads the first search returned. Evidence quotes are verbatim
// lines from the won fixture calls (company · timestamp).
const d = (contact: string, company: string, trigger: string, similar: string, similarTrigger: string) => ({
  subject: `${trigger} at ${company}`,
  body: `Hi ${contact.split(" ")[0]},\n\nWe spoke with ${similar} last month about the same thing: ${similarTrigger}. The bit that took the time wasn't the IT, it was the evidence the insurer and the partners wanted to see.\n\nIf that's on your desk too, I can show you what we put together for them. Twenty minutes, no deck.\n\nSam`,
});

export const leads: Lead[] = [
  { id: "l1", company: "Yarra Bend Physiotherapy", contact: "Claire Donovan", title: "Practice Manager", location: "Kew, VIC", industry: "Physiotherapy clinic", headcount: 58, similarity: 92, status: "drafted", trigger: "Cyber-insurance renewal", searchId: "s1",
    evidence: [
      { attribute: "Industry", value: "Multi-site allied health", quote: "We've physios, reception, admin and a small leadership team.", call: "Port Phillip Physio Group", t: "0:17" },
      { attribute: "Trigger", value: "Cyber-insurance renewal", quote: "The immediate issue is our cyber insurance renewal, which has become much stricter.", call: "Port Phillip Physio Group", t: "0:17" },
      { attribute: "Buyer", value: "Practice manager owns the decision", quote: "I recommend, the clinic director approves, and finance signs the contract.", call: "Port Phillip Physio Group", t: "1:38" },
    ], draft: d("Claire Donovan", "Yarra Bend Physiotherapy", "Insurance evidence", "Port Phillip Physio Group", "a cyber-insurance renewal asking for Essential Eight evidence") },
  { id: "l2", company: "Coburg Family Law", contact: "Michael Tran", title: "Practice Manager", location: "Coburg, VIC", industry: "Family law firm", headcount: 31, similarity: 90, status: "drafted", trigger: "IT coordinator leaving", searchId: "s1",
    evidence: [
      { attribute: "Industry", value: "Family law, 31 staff", quote: "We're thirty-seven people, mostly solicitors, paralegals and admin.", call: "Wattle Street Legal", t: "0:14" },
      { attribute: "Trigger", value: "IT coordinator leaving", quote: "Our internal IT coordinator resigned and leaves in three weeks.", call: "Wattle Street Legal", t: "0:14" },
      { attribute: "Buyer", value: "Practice manager", quote: "If the handover is clumsy, everyone will blame me for breaking something.", call: "Wattle Street Legal", t: "2:59" },
    ], draft: d("Michael Tran", "Coburg Family Law", "Handover before your IT coordinator leaves", "Wattle Street Legal", "their internal IT coordinator leaving in three weeks") },
  { id: "l3", company: "Ashwood & Reid Accountants", contact: "Priya Nair", title: "Director", location: "Geelong, VIC", industry: "Accounting practice", headcount: 46, similarity: 89, status: "approved", trigger: "Office move + M365 migration", searchId: "s1",
    evidence: [
      { attribute: "Industry", value: "Accounting practice", quote: "Accounting firms are an obvious target, and clients assume we've our house in order.", call: "Elm & Ledger Accounting", t: "2:27" },
      { attribute: "Trigger", value: "Office move + M365 migration", quote: "We're moving offices at the end of September, and it has forced a decision about IT.", call: "Elm & Ledger Accounting", t: "0:16" },
    ], draft: d("Priya Nair", "Ashwood & Reid Accountants", "The office move and 365 in one plan", "Elm & Ledger Accounting", "an office move on top of a half-finished Microsoft 365 migration") },
  { id: "l4", company: "Brunswick Dental Group", contact: "Hannah Lee", title: "Operations Manager", location: "Brunswick, VIC", industry: "Dental group", headcount: 41, similarity: 87, status: "drafted", trigger: "Phishing incident", searchId: "s1",
    evidence: [
      { attribute: "Industry", value: "Multi-site allied health", quote: "We've physios, occupational therapists, reception and a small finance team across Brunswick and Essendon.", call: "Arcwell Health", t: "0:16" },
      { attribute: "Trigger", value: "Phishing incident", quote: "A receptionist approved a fake supplier bank change. We caught it before money moved.", call: "Arcwell Health", t: "0:44" },
    ], draft: d("Hannah Lee", "Brunswick Dental Group", "After the phishing incident", "Arcwell Health", "a phishing incident that turned into insurance conditions") },
  { id: "l5", company: "Lumina Architecture Studio", contact: "Tom Bradley", title: "Studio Operations Manager", location: "Collingwood, VIC", industry: "Architecture studio", headcount: 38, similarity: 85, status: "drafted", trigger: "Essential Eight evidence", searchId: "s1",
    evidence: [
      { attribute: "Industry", value: "Architecture practice", quote: "We're a lab planning and architecture practice, forty-two people now.", call: "Northstar Labs", t: "0:15" },
      { attribute: "Trigger", value: "Essential Eight evidence", quote: "Our insurer is asking for Essential Eight evidence, and I am worried we will pay for a managed service but still fail the questionnaire.", call: "Northstar Labs", t: "3:17" },
    ], draft: d("Tom Bradley", "Lumina Architecture Studio", "Essential Eight evidence for the renewal", "Northstar Labs", "an insurer asking for Essential Eight evidence") },
  { id: "l6", company: "Bayside Podiatry Clinics", contact: "Rachel Moore", title: "General Manager", location: "Sandringham, VIC", industry: "Podiatry clinics", headcount: 34, similarity: 82, status: "drafted", trigger: "Insurance work approved first", searchId: "s1",
    evidence: [
      { attribute: "Industry", value: "Multi-site allied health", quote: "Clinicians can't wait long because the practice system, EFTPOS and exercise software all depend on it.", call: "Port Phillip Physio Group", t: "1:12" },
      { attribute: "Buyer", value: "General manager", quote: "I can get urgent insurance work approved faster than broad improvement work.", call: "Port Phillip Physio Group", t: "6:25" },
    ], draft: d("Rachel Moore", "Bayside Podiatry Clinics", "Insurance work first", "Port Phillip Physio Group", "getting the urgent insurance work approved ahead of everything else") },
  { id: "l7", company: "Hawthorn Conveyancing Partners", contact: "Daniel Foster", title: "Practice Manager", location: "Hawthorn, VIC", industry: "Conveyancing firm", headcount: 27, similarity: 80, status: "drafted", trigger: "Insurer asking about MFA and backups", searchId: "s1",
    evidence: [
      { attribute: "Industry", value: "Legal services", quote: "Insurers asked about MFA and backups last year. We answered, but it was informal.", call: "Wattle Street Legal", t: "2:25" },
      { attribute: "Buyer", value: "Practice manager", quote: "People walk to the coordinator or message me. It works because they are here, but it's not scalable.", call: "Wattle Street Legal", t: "1:04" },
    ], draft: d("Daniel Foster", "Hawthorn Conveyancing Partners", "Something more defensible for the insurer", "Wattle Street Legal", "an insurer asking about MFA and backups") },
  { id: "l8", company: "Northcote Veterinary Hospital", contact: "James Okoro", title: "Practice Manager", location: "Northcote, VIC", industry: "Veterinary practice", headcount: 29, similarity: 78, status: "drafted", trigger: "Board asking about insurance", searchId: "s1",
    evidence: [
      { attribute: "Industry", value: "Allied health adjacent", quote: "The clinicians care about uptime and privacy. The board cares about insurance.", call: "Arcwell Health", t: "1:44" },
    ], draft: d("James Okoro", "Northcote Veterinary Hospital", "Uptime for the clinic, evidence for the board", "Arcwell Health", "a board that cares about insurance and clinicians who care about uptime") },
  { id: "l9", company: "Fitzroy Planning Group", contact: "Emily Chen", title: "Director", location: "Fitzroy, VIC", industry: "Town planning consultancy", headcount: 26, similarity: 75, status: "drafted", trigger: "Office refit and insurance renewal", searchId: "s1",
    evidence: [
      { attribute: "Industry", value: "Professional services", quote: "Our finance partner owns risk, our studio manager does the day-to-day chasing, and I make the final call.", call: "Northstar Labs", t: "1:42" },
    ], draft: d("Emily Chen", "Fitzroy Planning Group", "Managed IT for a 26-person planning practice", "Northstar Labs", "an office refit and an insurance renewal landing at the same time") },
  { id: "l10", company: "Mornington Peninsula Osteopathy", contact: "Luke Harrington", title: "Practice Owner", location: "Mornington, VIC", industry: "Osteopathy clinic", headcount: 22, similarity: 71, status: "drafted", trigger: "Reception chasing IT by phone", searchId: "s1",
    evidence: [
      { attribute: "Industry", value: "Allied health", quote: "An evidence pack for the insurer, a known helpdesk process for reception, a cleaned-up Microsoft 365 tenant.", call: "Port Phillip Physio Group", t: "2:00" },
    ], draft: d("Luke Harrington", "Mornington Peninsula Osteopathy", "A known helpdesk process for reception", "Port Phillip Physio Group", "reception logging issues by email and chasing by phone") },
  { id: "l11", company: "Docklands Immigration Lawyers", contact: "Aisha Rahman", title: "Office Manager", location: "Docklands, VIC", industry: "Immigration law firm", headcount: 33, similarity: 68, status: "drafted", trigger: "Locked account on a deadline day", searchId: "s1",
    evidence: [
      { attribute: "Industry", value: "Legal services", quote: "Staff will forgive a slightly clunky portal before they forgive being unable to file documents or open matters.", call: "Wattle Street Legal", t: "5:50" },
    ], draft: d("Aisha Rahman", "Docklands Immigration Lawyers", "Filing deadlines and a locked account", "Wattle Street Legal", "a locked account on a deadline day") },
  { id: "l12", company: "Meridian Engineering Consultants", contact: "Sarah Whitlock", title: "Office Manager", location: "Richmond, VIC", industry: "Engineering consultancy", headcount: 112, similarity: 54, status: "drafted", trigger: "Tooling catching up at 112 staff", searchId: "s1",
    evidence: [
      { attribute: "Company size", value: "112 staff, above the band", quote: "We're at one hundred and eighteen people and the tooling is catching up with us.", call: "Meridian AI", t: "0:16" },
    ], draft: d("Sarah Whitlock", "Meridian Engineering Consultants", "Managed IT at 112 people", "Elm & Ledger Accounting", "a migration that could not be messy in the middle of busy season") },
];

// A pool of further Harbourline-ICP companies the mock search rotates through,
// ten per run, so repeated searches differ. Quotes are verbatim won-call lines.
type Seed = { company: string; contact: string; title: string; location: string; industry: string; headcount: number; trigger: string; call: string; t: string; quote: string; value: string; subject: string; similar: string };
const POOL: Seed[] = [
  { company: "Kew Orthodontics", contact: "Nadia Ferreira", title: "Practice Manager", location: "Kew, VIC", industry: "Orthodontic practice", headcount: 36, trigger: "Cyber-insurance renewal", call: "Port Phillip Physio Group", t: "0:17", quote: "The immediate issue is our cyber insurance renewal, which has become much stricter.", value: "Cyber-insurance renewal", subject: "The renewal questionnaire, answered once", similar: "a cyber-insurance renewal asking for Essential Eight evidence" },
  { company: "Ballarat Surveying Co.", contact: "Owen Pritchard", title: "Operations Manager", location: "Ballarat, VIC", industry: "Surveying practice", headcount: 44, trigger: "Office move", call: "Elm & Ledger Accounting", t: "0:16", quote: "We're moving offices at the end of September, and it has forced a decision about IT.", value: "Office move in September", subject: "IT sorted before the move", similar: "an office move on top of a half-finished Microsoft 365 migration" },
  { company: "Prahran Speech Pathology", contact: "Georgia Lam", title: "Practice Manager", location: "Prahran, VIC", industry: "Allied health clinic", headcount: 28, trigger: "Phishing incident", call: "Arcwell Health", t: "0:44", quote: "A receptionist approved a fake supplier bank change. We caught it before money moved.", value: "Near-miss on a supplier bank change", subject: "After the near miss", similar: "a phishing incident that turned into insurance conditions" },
  { company: "Bendigo Tax & Advisory", contact: "Marcus Bell", title: "Director", location: "Bendigo, VIC", industry: "Accounting practice", headcount: 39, trigger: "M365 migration", call: "Elm & Ledger Accounting", t: "2:27", quote: "Accounting firms are an obvious target, and clients assume we've our house in order.", value: "Half-finished Microsoft 365 migration", subject: "Finishing the 365 move properly", similar: "a migration that could not be messy in the middle of busy season" },
  { company: "St Kilda Road Chambers", contact: "Fiona Walsh", title: "Practice Manager", location: "Melbourne, VIC", industry: "Barristers' chambers", headcount: 52, trigger: "IT coordinator leaving", call: "Wattle Street Legal", t: "0:14", quote: "Our internal IT coordinator resigned and leaves in three weeks.", value: "IT coordinator leaving", subject: "Handover in three weeks", similar: "their internal IT coordinator leaving in three weeks" },
  { company: "Geelong Hand Therapy", contact: "Sunil Menon", title: "General Manager", location: "Geelong, VIC", industry: "Allied health clinic", headcount: 31, trigger: "Cyber-insurance renewal", call: "Port Phillip Physio Group", t: "6:25", quote: "I can get urgent insurance work approved faster than broad improvement work.", value: "Renewal deadline this quarter", subject: "Insurance work first, the rest after", similar: "getting the urgent insurance work approved ahead of everything else" },
  { company: "Williamstown Marine Engineers", contact: "Bec Sutherland", title: "Office Manager", location: "Williamstown, VIC", industry: "Engineering consultancy", headcount: 47, trigger: "Essential Eight evidence", call: "Northstar Labs", t: "3:17", quote: "Our insurer is asking for Essential Eight evidence, and I am worried we will pay for a managed service but still fail the questionnaire.", value: "Insurer wants Essential Eight evidence", subject: "Evidence the underwriter will accept", similar: "an insurer asking for Essential Eight evidence" },
  { company: "Camberwell Paediatrics", contact: "Helen Zhou", title: "Practice Manager", location: "Camberwell, VIC", industry: "Medical practice", headcount: 34, trigger: "Practice system outage", call: "Port Phillip Physio Group", t: "1:12", quote: "Clinicians can't wait long because the practice system, EFTPOS and exercise software all depend on it.", value: "Outage stopped the clinic", subject: "Uptime for the front desk", similar: "a practice system every clinician depends on" },
  { company: "Ringwood Property Lawyers", contact: "Adrian Kostas", title: "Practice Manager", location: "Ringwood, VIC", industry: "Property law firm", headcount: 29, trigger: "Insurer asking about MFA", call: "Wattle Street Legal", t: "2:25", quote: "Insurers asked about MFA and backups last year. We answered, but it was informal.", value: "Informal answers to the insurer", subject: "Something more defensible for the insurer", similar: "an insurer asking about MFA and backups" },
  { company: "Shepparton Agribusiness Accountants", contact: "Lauren Mackay", title: "Operations Manager", location: "Shepparton, VIC", industry: "Accounting practice", headcount: 42, trigger: "Office move", call: "Elm & Ledger Accounting", t: "0:16", quote: "We're moving offices at the end of September, and it has forced a decision about IT.", value: "Office move before busy season", subject: "The office move and 365 in one plan", similar: "an office move landing right before busy season" },
  { company: "Malvern Sports Medicine", contact: "Jack Reilly", title: "Practice Manager", location: "Malvern, VIC", industry: "Sports medicine clinic", headcount: 37, trigger: "Cyber-insurance renewal", call: "Arcwell Health", t: "1:44", quote: "The clinicians care about uptime and privacy. The board cares about insurance.", value: "Board pushing on insurance", subject: "Uptime for the clinic, evidence for the board", similar: "a board that cares about insurance and clinicians who care about uptime" },
  { company: "Frankston Family Dental", contact: "Mei Ling Tan", title: "Operations Manager", location: "Frankston, VIC", industry: "Dental group", headcount: 45, trigger: "Phishing incident", call: "Arcwell Health", t: "0:44", quote: "A receptionist approved a fake supplier bank change. We caught it before money moved.", value: "Phishing at the front desk", subject: "After the phishing incident", similar: "a phishing incident that turned into insurance conditions" },
  { company: "Warrnambool Planning Partners", contact: "Callum Doyle", title: "Director", location: "Warrnambool, VIC", industry: "Town planning consultancy", headcount: 26, trigger: "Insurance renewal", call: "Northstar Labs", t: "1:42", quote: "Our finance partner owns risk, our studio manager does the day-to-day chasing, and I make the final call.", value: "Renewal owned by the finance partner", subject: "Managed IT for a 26-person planning practice", similar: "an office refit and an insurance renewal landing at the same time" },
  { company: "Essendon Migration Law", contact: "Yasmin Haddad", title: "Office Manager", location: "Essendon, VIC", industry: "Immigration law firm", headcount: 30, trigger: "Locked account on a deadline", call: "Wattle Street Legal", t: "5:50", quote: "Staff will forgive a slightly clunky portal before they forgive being unable to file documents or open matters.", value: "Filing deadline missed to a locked account", subject: "Filing deadlines and a locked account", similar: "a locked account on a deadline day" },
  { company: "Mildura Vet Group", contact: "Pat O'Connell", title: "Practice Manager", location: "Mildura, VIC", industry: "Veterinary practice", headcount: 33, trigger: "Insurance renewal", call: "Arcwell Health", t: "1:44", quote: "The clinicians care about uptime and privacy. The board cares about insurance.", value: "Renewal with new conditions", subject: "Evidence for the renewal", similar: "a board that cares about insurance and clinicians who care about uptime" },
  { company: "Box Hill Structural Engineers", contact: "Raj Iyer", title: "Office Manager", location: "Box Hill, VIC", industry: "Engineering consultancy", headcount: 58, trigger: "M365 migration", call: "Elm & Ledger Accounting", t: "0:16", quote: "We're moving offices at the end of September, and it has forced a decision about IT.", value: "Microsoft 365 migration planned", subject: "Finishing the 365 move properly", similar: "a half-finished Microsoft 365 migration" },
  { company: "Torquay Physio & Pilates", contact: "Ella Brennan", title: "Practice Owner", location: "Torquay, VIC", industry: "Physiotherapy clinic", headcount: 24, trigger: "Reception chasing IT by phone", call: "Port Phillip Physio Group", t: "2:00", quote: "An evidence pack for the insurer, a known helpdesk process for reception, a cleaned-up Microsoft 365 tenant.", value: "No helpdesk process", subject: "A known helpdesk process for reception", similar: "reception logging issues by email and chasing by phone" },
  { company: "Moonee Ponds Conveyancing", contact: "Stephen Ward", title: "Practice Manager", location: "Moonee Ponds, VIC", industry: "Conveyancing firm", headcount: 27, trigger: "IT coordinator leaving", call: "Wattle Street Legal", t: "2:59", quote: "If the handover is clumsy, everyone will blame me for breaking something.", value: "Handover with no one to hand to", subject: "Handover before your IT coordinator leaves", similar: "their internal IT coordinator leaving in three weeks" },
  { company: "Doncaster Radiology Partners", contact: "Anita Rao", title: "General Manager", location: "Doncaster, VIC", industry: "Radiology practice", headcount: 61, trigger: "Cyber-insurance renewal", call: "Port Phillip Physio Group", t: "0:17", quote: "The immediate issue is our cyber insurance renewal, which has become much stricter.", value: "Stricter renewal this year", subject: "The renewal questionnaire, answered once", similar: "a cyber-insurance renewal asking for Essential Eight evidence" },
  { company: "Sunbury Building Certifiers", contact: "Grant Leyland", title: "Director", location: "Sunbury, VIC", industry: "Building certification", headcount: 25, trigger: "Essential Eight evidence", call: "Northstar Labs", t: "0:15", quote: "We're a lab planning and architecture practice, forty-two people now.", value: "Insurer wants Essential Eight evidence", subject: "Essential Eight evidence for the renewal", similar: "an insurer asking for Essential Eight evidence" },
];

/** Ten (or `count`) leads for a run, rotating through the pool. Similarity
    descends from the low 90s with a deterministic wobble; drafts are signed Sam. */
export function generateLeads(searchId: string, run: number, count: number): Lead[] {
  const start = ((run - 2) * count) % POOL.length;
  return Array.from({ length: count }, (_, i) => {
    const s = POOL[(start + i + POOL.length) % POOL.length];
    const similarity = Math.max(48, 93 - i * 4 - ((i * 7 + run * 3) % 5));
    return {
      id: `${searchId}-${i + 1}`,
      company: s.company, contact: s.contact, title: s.title, location: s.location, industry: s.industry, headcount: s.headcount,
      similarity, status: "drafted", trigger: s.trigger, searchId,
      evidence: [
        { attribute: "Industry", value: s.industry, quote: s.quote, call: s.call, t: s.t },
        { attribute: "Trigger", value: s.value, quote: s.quote, call: s.call, t: s.t },
      ],
      draft: d(s.contact, s.company, s.subject, s.call, s.similar),
    };
  });
}
