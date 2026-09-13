// Sample transcript excerpts and forwarded emails that type themselves into the empty Home boxes.
// Sample content only; a production build would draw these from the team's own recent conversations.

export const TRANSCRIPT_SAMPLES: [string, string, string][][] = [
  [["00:00:34", "Sam Whitfield", "Tell me about the note load itself. What are you producing now, and what does doubling actually mean in numbers?"], ["00:00:44", "Maya Chen", "We publish about sixty notes a month across four strategies. After the launch it's closer to a hundred and twenty."], ["00:01:09", "Sam Whitfield", "Who does the first draft today, and how long does one note take them?"]],
  [["00:00:20", "Jordan Lee", "Walk me through what happens from the moment a seller brings a piece in?"], ["00:00:31", "Aisha Rahman", "A specialist writes condition notes on paper, someone re-keys them into our sale system, then a cataloguer writes the lot description."], ["00:00:55", "Jordan Lee", "How many lots go through that path in a spring season?"]],
  [["00:00:18", "Sam Whitfield", "How many statements of advice are you producing in a month now, and how many were you doing before?"], ["00:00:27", "Olivia Hart", "Before the acquisition, about thirty a month. Now it's closer to fifty-five and the paraplanning team is still four people."], ["00:00:49", "Sam Whitfield", "Which of those steps takes the longest?"]],
  [["00:00:15", "Sam Whitfield", "Felix, what happens to a loan file between credit approval and the documents going out?"], ["00:00:24", "Felix Morgan", "It sits with two analysts who rebuild the facility letter by hand, and broker season starts in six weeks."], ["00:00:41", "Sam Whitfield", "Who checks it before it leaves?"]],
];

/* Forwarded emails: header lines, a blank line, then the body. */
export const EMAIL_SAMPLES: string[][] = [
  ["From: Olivia Hart <olivia@fairfieldwealth.example>", "To: Sam Whitfield <sam@eleno.example>", "Subject: Source logging and next steps", "Date: Sat 12 Sept 2026 10:12", "", "Hi Sam,", "", "Our compliance manager wants to see how the drafting assistant records every source it relies on before we roll it out to the advisers. Could you send the recommended first phase, timing, and who you need from our side?"],
  ["From: Felix Morgan <felix@kestrellending.example>", "To: Sam Whitfield <sam@eleno.example>", "Subject: Facility letter drafting before broker season", "Date: Tue 8 Sept 2026 08:31", "", "Hi Sam,", "", "Our head of risk wants the redrafted facility letter side by side with the original before we commit. We are 64 people and the season starts in six weeks. What does the discovery phase involve, and roughly what should a lender our size expect?"],
];
