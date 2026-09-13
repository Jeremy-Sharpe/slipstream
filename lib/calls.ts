// Generated from data/fixtures/*/{script,expected}.json, the thirteen
// Harbourline IT calls. Timestamps are spread over the call by word count;
// confidences are deterministic; spans point at the source turn.
import type { CallRecord } from "./types";

export const calls: CallRecord[] = [
 {
  "id": "call-01-northstar-labs",
  "contact": "Maya Chen",
  "title": "Managing Partner",
  "email": "maya@northstarlabs.example",
  "company": "Northstar Labs",
  "industry": "Architecture and lab planning consultancy",
  "headcount": 42,
  "location": "Southbank, VIC",
  "rep": "Sam Whitfield",
  "at": "2026-08-31T09:15:00+10:00",
  "duration": 420,
  "outcome": "won",
  "valueAud": 58400,
  "trigger": "Cyber insurance renewal requiring Essential Eight controls",
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Hi Maya, it's Sam from Harbourline IT. Thanks for making time, and just so I have the context right, are you Maya Chen from Northstar Labs in Southbank?",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Yes, that's me. We're a lab planning and architecture practice, forty-two people now, mostly architects, project leads and admin. The call is timely because our cyber insurance renewal landed last week and it was more pointed than last year.",
    "t": 15
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What changed in the renewal pack that made this feel urgent?",
    "t": 37
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "They have asked us to show multi-factor coverage, backup testing, admin separation and some evidence around patching. Previously we just ticked a few boxes. This time the broker said the underwriter wants Essential Eight-style controls before they quote.",
    "t": 43
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How are you handling those controls today across Microsoft 365, laptops and project files?",
    "t": 65
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Patch management is half manual and half Intune, and nobody loves it. We've MFA for email but not every app. Project files are in SharePoint, but architects still sync big drawing folders locally because they travel to sites.",
    "t": 72
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who is responsible internally when something breaks or when the insurer asks for evidence?",
    "t": 94
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Our finance partner owns risk, our studio manager does the day-to-day chasing, and I make the final call. We've an ad hoc IT contractor who is lovely, but he isn't built for reporting or controls evidence.",
    "t": 102
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What would a good result look like by the time the insurer comes back for the final questionnaire?",
    "t": 122
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "I need to show that a sensible provider has reviewed us, closed the obvious gaps and can produce records. I don't expect magic in two weeks, but I want confidence that we're not guessing.",
    "t": 132
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where have staff felt the pain most, security paperwork, day-to-day support, or project file reliability?",
    "t": 151
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "The paperwork is the trigger, but support is the quiet frustration. New starters wait too long, password resets go to whichever admin is free, and site laptops get forgotten until they refuse to update during a deadline.",
    "t": 160
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That helps. Harbourline usually starts with a fixed onboarding project, then a managed services agreement at $135 per seat per month for a practice your size, with security reporting included.",
    "t": 180
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Our insurer is asking for Essential Eight evidence, and I am worried we will pay for a managed service but still fail the questionnaire. We have had vendors sell us a dashboard before and then leave us to explain it.",
    "t": 197
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is a fair concern. We would separate the promise into two parts: first the evidence you can use with the broker, then the ongoing support model. I will send the mapped Essential Eight gap summary by Thursday so you can see exactly what is covered and what remains your risk.",
    "t": 220
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "That would be useful. The finance partner will ask whether there's a large project fee on top, because the renewal and an office refit are hitting the same quarter.",
    "t": 248
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will include the onboarding sequence and the fixed project range. For Northstar Labs I would expect the project to sit around $8,000 to $11,000 unless the device audit uncovers something odd.",
    "t": 265
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "That's inside what I can approve with finance, provided the monthly number stays close to what you just said and the support response times are written down.",
    "t": 282
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Let us lock the next step while the renewal is warm. Can we meet Thursday 3 September at 2pm with you and the finance partner to review the proposal and the evidence pack?",
    "t": 298
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Yes, Thursday 3 September at 2pm works. Send the invite to me and I will forward it to Grace in finance. If the proposal matches this discussion, I'm comfortable moving ahead.",
    "t": 316
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "One practical thing I want to avoid is over-promising maturity in week one. We'd show the insurer what is already true, what we can close quickly, and what needs a dated remediation plan.",
    "t": 334
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "That language would help. The underwriter seems more interested in whether we know our gaps than whether we pretend to be perfect, and I'd rather be honest than scramble later.",
    "t": 352
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Exactly. We can also give your studio manager a simple evidence folder, so next year the renewal is a maintenance task rather than a panic.",
    "t": 369
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "That would be a relief. She is organised, but she is tired of chasing screenshots from three different systems whenever someone asks a security question.",
    "t": 383
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Great, I will send the invite, the gap summary and the commercial proposal by Thursday morning. Thanks Maya, this gives us enough to be precise.",
    "t": 397
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Thanks Sam. I appreciate that you did not jump straight to a bundle. Speak Thursday.",
    "t": 411
   }
  ],
  "fields": {
   "contact": {
    "value": "Maya Chen",
    "confidence": 0.87,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Northstar Labs",
    "confidence": 0.95,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "closed_won",
    "confidence": 0.95,
    "span": 9,
    "evidence_ms": 132000
   },
   "value": {
    "value": 58400,
    "confidence": 0.95,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": "Sam to send the Essential Eight gap summary and onboarding sequence, then meet Maya and the finance partner for proposal review.",
    "confidence": 0.9,
    "span": 14,
    "evidence_ms": 220000
   },
   "promises": {
    "value": [
     "I will send the mapped Essential Eight gap summary by Thursday",
     "I will include the onboarding sequence and the fixed project range"
    ],
    "confidence": 0.87,
    "span": 14,
    "evidence_ms": 220000
   }
  },
  "scorecard": {
   "discovery": 6,
   "nextStepSecured": true,
   "objection": "handled",
   "talkRatio": 0.44,
   "spans": {
    "discovery": 0,
    "nextStep": 14,
    "objection": 13
   }
  },
  "objections": [
   {
    "text": "Our insurer is asking for Essential Eight evidence, and I am worried we will pay for a managed service but still fail the questionnaire",
    "handling": "handled"
   }
  ],
  "icp": {
   "industry": "Architecture and lab planning consultancy",
   "headcount_band": "25-80",
   "role": "Managing Partner",
   "trigger": "Cyber insurance renewal requiring Essential Eight controls"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps for Northstar Labs",
   "body": "Hi Maya,\n\nThanks for the time today. As promised, i will send the mapped Essential Eight gap summary by Thursday.\n\nNext step on our side: Sam to send the Essential Eight gap summary and onboarding sequence, then meet Maya and the finance partner for proposal review.\n\nShout if anything in that needs changing.\n\nSam"
  },
  "draftShort": {
   "subject": "Next steps for Northstar Labs",
   "body": "Hi Maya,\n\nSam"
  }
 },
 {
  "id": "call-02-arcwell-health",
  "contact": "Felix Morgan",
  "title": "Operations Manager",
  "email": "felix@arcwellhealth.example",
  "company": "Arcwell Health",
  "industry": "Multi-site allied health clinic",
  "headcount": 64,
  "location": "Brunswick and Essendon, VIC",
  "rep": "Sam Whitfield",
  "at": "2026-09-01T14:30:00+10:00",
  "duration": 450,
  "outcome": "won",
  "valueAud": 103600,
  "trigger": "Phishing incident and follow-up cyber insurance conditions",
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Felix Morgan, Sam Whitfield from Harbourline IT. I have Arcwell Health as a two-site allied health group with you looking after operations, is that still right?",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That's right. We've physios, occupational therapists, reception and a small finance team across Brunswick and Essendon. The reason I booked this is a phishing incident last month that rattled the directors.",
    "t": 16
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What happened in the phishing incident, and what did it expose about the current setup?",
    "t": 35
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "A receptionist approved a fake supplier bank change. We caught it before money moved, but the mailbox was compromised for a day. Our current IT person cleaned it up, but there was no proper incident note or training follow-up.",
    "t": 44
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How does support work between the two clinics when reception, clinicians and practice software are all busy?",
    "t": 69
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Honestly, everyone messages me first. Then I triage whether it's Best Practice, Xero, Microsoft 365 or the internet. It's workable until a Monday morning when both clinics have full books.",
    "t": 79
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who needs to be confident before Arcwell Health changes provider?",
    "t": 98
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "The clinical director, me, and one GP who sits on the board. The clinicians care about uptime and privacy. The board cares about insurance, audit trail and not paying for theatre.",
    "t": 104
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What would you want fixed in the first thirty days if we started?",
    "t": 123
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "MFA everywhere, a reliable joiner and leaver process, backup testing for shared drives and someone running security awareness without making staff feel silly. I'd also like one helpdesk number instead of five workarounds.",
    "t": 131
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where does the cyber insurance renewal sit in the calendar?",
    "t": 152
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "The broker wants updated answers by 18 September. They specifically asked about admin accounts, patching cadence and whether we can prove backups have been restored.",
    "t": 158
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For sixty-four staff, Harbourline would likely be $128 per seat per month, plus an onboarding project to clean identity, backups and device management before the insurer deadline.",
    "t": 174
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Data sovereignty is the thing our clinical director will ask about. We deal with patient information, and she will not accept a vague answer about where tickets or backups go.",
    "t": 191
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Good, she should ask. We keep Microsoft 365 data in your Australian tenant, document where backup metadata sits, and make any remote access auditable. I will send the incident-response checklist and onboarding proposal by Friday so she can see the detail.",
    "t": 209
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That would take heat out of the conversation. What about the rollout? We can't close both clinics or interrupt appointments.",
    "t": 235
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will include the two clinic rollout plan and the cyber insurance evidence register. The first week is discovery and identity controls, then we schedule endpoint work in reception gaps and after-hours windows.",
    "t": 247
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That sounds sensible. The price is higher than our current person, but I can justify it if the board sees risk reduction and not just support tickets.",
    "t": 268
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Can we book Friday 4 September at 11am for you, the clinical director and me to walk through the proposal before it goes to the board?",
    "t": 285
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Yes, Friday 4 September at 11am is good. Send me the invite and I will add Dr Patel. If the checklist answers her privacy questions, I think we will proceed.",
    "t": 301
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "On the clinical side, we'd keep the change visible but lightweight. Reception gets a single contact path, clinicians get clear timing for MFA changes, and the board gets evidence without needing to read technical logs.",
    "t": 319
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That balance matters. If clinicians feel the security work is being done to them rather than with them, I will spend a month smoothing frustration instead of running the clinics.",
    "t": 341
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "We can make the first staff message plain: why the changes are happening, what will change this week, and where to get help if a login prompt appears before an appointment.",
    "t": 360
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Good. The phishing incident embarrassed people, and I don't want training that sounds like a lecture. A practical tone will land much better.",
    "t": 379
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will also note that the board can start with the insurance evidence and then decide whether any deeper maturity work waits until after the renewal.",
    "t": 393
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That's sensible. They will approve urgent controls quickly, but anything that smells like a giant transformation will get pushed into a later meeting.",
    "t": 410
   },
   {
    "i": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Perfect. I will send the invite, proposal and checklist by Thursday afternoon so you've time to read it before Friday.",
    "t": 424
   },
   {
    "i": 27,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Thanks Sam. This is the first call where I have felt someone understood the clinic constraints, not only the security words.",
    "t": 436
   }
  ],
  "fields": {
   "contact": {
    "value": "Felix Morgan",
    "confidence": 0.93,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Arcwell Health",
    "confidence": 0.88,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "closed_won",
    "confidence": 0.89,
    "span": null,
    "evidence_ms": null
   },
   "value": {
    "value": 103600,
    "confidence": 0.9,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": "Sam to send proposal and meet Felix plus clinical director for rollout approval.",
    "confidence": 0.98,
    "span": 18,
    "evidence_ms": 285000
   },
   "promises": {
    "value": [
     "I will send the incident-response checklist and onboarding proposal by Friday",
     "I will include the two clinic rollout plan and the cyber insurance evidence register"
    ],
    "confidence": 0.9,
    "span": 14,
    "evidence_ms": 209000
   }
  },
  "scorecard": {
   "discovery": 4,
   "nextStepSecured": true,
   "objection": "handled",
   "talkRatio": 0.46,
   "spans": {
    "discovery": 0,
    "nextStep": 18,
    "objection": 13
   }
  },
  "objections": [
   {
    "text": "Data sovereignty is the thing our clinical director will ask about",
    "handling": "handled"
   }
  ],
  "icp": {
   "industry": "Multi-site allied health clinic",
   "headcount_band": "25-80",
   "role": "Operations Manager",
   "trigger": "Phishing incident and follow-up cyber insurance conditions"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps for Arcwell Health",
   "body": "Hi Felix,\n\nThanks for the time today. As promised, i will send the incident-response checklist and onboarding proposal by Friday.\n\nNext step on our side: Sam to send proposal and meet Felix plus clinical director for rollout approval.\n\nShout if anything in that needs changing.\n\nSam"
  },
  "draftShort": {
   "subject": "Next steps for Arcwell Health",
   "body": "Hi Felix,\n\nSam"
  }
 },
 {
  "id": "call-03-afterglow-studio",
  "contact": "Priya Shah",
  "title": "Founder",
  "email": "priya@afterglowstudio.example",
  "company": "Afterglow Studio",
  "industry": "Creative branding studio",
  "headcount": 12,
  "location": "Collingwood, VIC",
  "rep": "Jordan Lee",
  "at": "2026-09-02T10:00:00+10:00",
  "duration": 390,
  "outcome": "lost",
  "valueAud": 15400,
  "trigger": null,
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Hi Priya Shah, Jordan from Harbourline IT. Great to speak with Afterglow Studio. We help Melbourne firms move from ad hoc IT to a proper managed service, and our standard package is $120 per seat per month.",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Hi Jordan. We're only twelve people, so I was mostly curious. Our computers are fine most weeks, and we use a local break-fix person when something annoying happens.",
    "t": 16
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That's exactly where managed services helps, because waiting for things to break costs time. With us you get helpdesk, Microsoft 365 admin, patching, endpoint security, backup checks and quarterly reviews, all wrapped into one predictable monthly number.",
    "t": 29
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "We are probably too small for a monthly managed service. The designers are on Macs, the account team uses Google Workspace, and there is not much infrastructure.",
    "t": 45
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Small teams actually need it more because there's no internal IT person. Harbourline IT can bring the same structure bigger firms have, and it means you're not relying on whoever is least busy to fix a printer or password issue.",
    "t": 57
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "The printer bit's real, but it's not painful enough to spend a lot. We might have two support issues a month, maybe three when freelancers are in.",
    "t": 75
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The bigger risk isn't the ticket count, it's the security baseline. Cyber insurance and client questionnaires are getting stricter, so having managed endpoint protection and patch records makes you look professional when a client asks.",
    "t": 87
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Most of our clients are hospitality and lifestyle brands. They care about creative work. Nobody has sent us a security questionnaire, and if they did, I'd probably just answer it myself.",
    "t": 103
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "We also include onboarding, so we'd clean up user accounts, make sure everyone has MFA, standardise devices and document your apps. For a team like Afterglow Studio, that project could be $4,000 to $6,000 depending on what we find.",
    "t": 117
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "That is more than double what we pay now. Our current guy charges when we need him, and some months we pay nothing at all.",
    "t": 135
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Right, but the monthly fee buys peace of mind. If a laptop is stolen or someone clicks a bad link, you've a team ready. Break-fix is cheaper until the one day it's not.",
    "t": 146
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "I understand the argument, but there's not a burning problem. We're watching costs this quarter, and I don't want another subscription unless it removes a daily headache.",
    "t": 161
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The daily headache can be hidden, though. Designers losing twenty minutes here and there adds up, and with a managed agreement you can send everything through one channel instead of interrupting each other.",
    "t": 173
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Maybe, but I'd need to see a very small plan. I'm not going to take a twelve-seat studio into a corporate IT package because it sounds responsible.",
    "t": 188
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Our minimum managed plan is still designed around the full stack, because partial coverage creates gaps. We can start with the baseline and then add anything specific later.",
    "t": 200
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "That's probably not for us then. I was hoping there might be a light-touch option or an annual check-up.",
    "t": 212
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will send some info this afternoon. It will explain the service inclusions, the onboarding project and why proactive support tends to be better value over a year.",
    "t": 221
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "You can send it, but I don't want to waste your time. Unless the price is much closer to what we pay casually, I can't see us moving.",
    "t": 233
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The reason I'm pushing the managed option is that creative studios often underestimate the cost of interruption. If a designer loses files before a client presentation, the impact isn't just an IT invoice, it's reputation and rework.",
    "t": 246
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "I hear that, but our files are backed up in the design tools and we've not had that kind of incident.",
    "t": 262
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "You would also get a proper onboarding audit. We'd review admin accounts, device health, domains, password sharing, MFA and whether freelancers still have access after a project finishes.",
    "t": 272
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Those are real things, but they aren't things I'm ready to put a monthly contract around.",
    "t": 284
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "If budget is the blocker, I can still show the cost over twelve months compared with reactive work and staff downtime. Sometimes the managed plan comes out closer than it first appears.",
    "t": 292
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Maybe for another studio. For us, the cash cost is obvious and the downtime cost is still theoretical.",
    "t": 306
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The overview will also show the security baseline we recommend for even a small studio: MFA, device encryption, admin account separation, backup confirmation and a simple incident contact path. That gives you a benchmark, even if you choose not to move now.",
    "t": 314
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "A benchmark is fine. I just don't want the benchmark to turn into pressure to buy something we've already said is too heavy.",
    "t": 333
   },
   {
    "i": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The thing I'd be careful of is waiting until the first serious client requirement appears. By then you're trying to write policies, clean accounts, find device records and reassure a client at the same time. The managed plan keeps all of that ready before anyone asks, and it gives you a professional answer rather than a scramble.",
    "t": 343
   },
   {
    "i": 27,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "I understand, but that still feels like buying ahead of a problem.",
    "t": 369
   },
   {
    "i": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Understood. I will send the overview and you can come back if anything changes or if a client asks for security evidence.",
    "t": 374
   },
   {
    "i": 29,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Thanks Jordan. I appreciate the call, but it's a no for now.",
    "t": 384
   }
  ],
  "fields": {
   "contact": {
    "value": "Priya Shah",
    "confidence": 0.93,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Afterglow Studio",
    "confidence": 0.97,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "closed_lost",
    "confidence": 0.96,
    "span": null,
    "evidence_ms": null
   },
   "value": {
    "value": 15400,
    "confidence": 0.93,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": null,
    "confidence": 0.88,
    "span": null,
    "evidence_ms": null
   },
   "promises": {
    "value": [
     "I will send some info this afternoon"
    ],
    "confidence": 0.88,
    "span": 16,
    "evidence_ms": 221000
   }
  },
  "scorecard": {
   "discovery": 0,
   "nextStepSecured": false,
   "objection": "ignored",
   "talkRatio": 0.61,
   "spans": {
    "discovery": null,
    "nextStep": null,
    "objection": 3
   }
  },
  "objections": [
   {
    "text": "We are probably too small for a monthly managed service",
    "handling": "ignored"
   },
   {
    "text": "That is more than double what we pay now",
    "handling": "ignored"
   }
  ],
  "icp": {
   "industry": "Creative branding studio",
   "headcount_band": "under-15",
   "role": "Founder",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Leaving the door open",
   "body": "Hi Priya,\n\nThanks for being straight with me today. It sounds like managed IT isn't the right spend for Afterglow Studio right now, and that's fair.\n\nIf anything changes, an insurer asks for security evidence, or the computers stop being fine, I'm one email away.\n\nJordan"
  },
  "draftShort": {
   "subject": "Leaving the door open",
   "body": "Hi Priya,\n\nJordan"
  }
 },
 {
  "id": "call-04-kite-and-co",
  "contact": "Daniel Ortiz",
  "title": "Operations Lead",
  "email": "daniel@kiteandco.example",
  "company": "Kite & Co",
  "industry": "Commercial law firm",
  "headcount": 95,
  "location": "Melbourne CBD, VIC",
  "rep": "Sam Whitfield",
  "at": "2026-09-02T16:00:00+10:00",
  "duration": 430,
  "outcome": "stalled",
  "valueAud": 132000,
  "trigger": "Procurement security questionnaire before panel appointment",
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Daniel, thanks for joining. I have you as Daniel Ortiz, operations lead at Kite & Co, a commercial law firm in the CBD. What prompted the conversation with Harbourline IT?",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That's right. We're reviewing our panel of suppliers after a procurement refresh. IT support is bundled into that, partly because our partners have started asking for clearer security reporting.",
    "t": 17
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What does the partner group want to see that they aren't getting today?",
    "t": 34
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "They want fewer surprises. When a barrister can't access a brief or a senior associate is locked out before court, it becomes an operational incident. The current provider fixes things eventually, but there's no rhythm or account management.",
    "t": 42
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How are your systems set up across document management, Microsoft 365 and remote access?",
    "t": 64
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "We're on Microsoft 365, Xero for finance, and a cloud document platform for matters. Remote access is mostly browser based, but some partners still have old habits around local files and personal devices.",
    "t": 72
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who will decide whether a new provider is worth moving to?",
    "t": 92
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "The managing partner signs off, the finance director checks the numbers, and procurement controls the process. I can recommend a shortlist, but I can't award it on this call.",
    "t": 98
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What would make you confident enough to recommend Harbourline IT for that shortlist?",
    "t": 115
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "I need evidence that you understand confidentiality, response times and change management. We're ninety-five staff, but partner influence makes us feel larger. A botched migration would be painful politically.",
    "t": 123
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where are the current risks most visible day to day?",
    "t": 140
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Joiners and leavers are messy, shared mailboxes are inconsistent, and procurement keeps asking me for supplier documents I have to chase. There's also a cyber insurance renewal in November, but it's not the only driver.",
    "t": 146
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "At that size, the managed services agreement would normally sit around $140 per seat per month, with a scoped onboarding project for identity, device management and documentation.",
    "t": 167
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Procurement will not let us progress without the full questionnaire and insurance certificates. They will ask about data handling, subcontractors, incident response and professional indemnity before a partner even reads the proposal.",
    "t": 182
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That makes sense. I can answer the supplier side and show our standard controls, although some items depend on the final scope. I will send the security pack and a sample service schedule so you can test whether procurement is comfortable.",
    "t": 201
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That would help, but it may disappear into the vendor portal for a while. Our procurement manager is methodical and the managing partner is away until the week after next.",
    "t": 225
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Would it be useful to pencil a review with the managing partner when he is back?",
    "t": 243
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Possibly, but I don't want to put a date in before procurement accepts the documents. If they bounce the questionnaire, the partner call would be premature.",
    "t": 252
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Understood. I will send the pack and service schedule today, and you can tell me what procurement comes back with.",
    "t": 268
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Yes, send it through. I'm interested, but I need the process to move first. Once procurement clears the basics, we can talk about who joins the next call.",
    "t": 279
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "The sample service schedule will spell out response targets, account review cadence and what evidence is produced monthly. That way procurement can compare more than hourly rates.",
    "t": 296
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That will be useful. They tend to reduce vendors to a spreadsheet, and IT support is hard to compare unless the service boundaries are explicit.",
    "t": 312
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "If procurement wants clarification, I can answer in writing or join a short call with them before the partner group spends time on it.",
    "t": 327
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Possibly. I need to see how they react first. They can be quite strict about keeping suppliers out until the formal shortlist is set.",
    "t": 341
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "No problem. I will make the pack self-contained, including our insurance certificates, data handling summary and a plain-English incident response outline.",
    "t": 355
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That gives me a decent chance of getting it through the first gate. After that the internal politics are the bigger unknown.",
    "t": 367
   },
   {
    "i": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will also avoid assuming the current provider has done nothing. The comparison should be about service evidence and accountability, not throwing stones at people who may have been operating under a loose brief.",
    "t": 380
   },
   {
    "i": 27,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That tone will help. The partners dislike vendor drama, and the incumbent still supports us while this process runs.",
    "t": 400
   },
   {
    "i": 28,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Thanks Daniel. I will keep it concise and label the parts procurement usually wants first.",
    "t": 411
   },
   {
    "i": 29,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Appreciated. That will make my life easier even if the timetable isn't completely in my hands.",
    "t": 420
   }
  ],
  "fields": {
   "contact": {
    "value": "Daniel Ortiz",
    "confidence": 0.95,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Kite & Co",
    "confidence": 0.88,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "evaluation",
    "confidence": 0.96,
    "span": null,
    "evidence_ms": null
   },
   "value": {
    "value": 132000,
    "confidence": 0.89,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": "Sam to send security pack and sample service schedule for Daniel to circulate.",
    "confidence": 0.98,
    "span": 14,
    "evidence_ms": 201000
   },
   "promises": {
    "value": [
     "I will send the security pack and a sample service schedule"
    ],
    "confidence": 0.93,
    "span": 14,
    "evidence_ms": 201000
   }
  },
  "scorecard": {
   "discovery": 6,
   "nextStepSecured": false,
   "objection": "partial",
   "talkRatio": 0.43,
   "spans": {
    "discovery": 0,
    "nextStep": 14,
    "objection": 13
   }
  },
  "objections": [
   {
    "text": "Procurement will not let us progress without the full questionnaire and insurance certificates",
    "handling": "partial"
   }
  ],
  "icp": {
   "industry": "Commercial law firm",
   "headcount_band": "81-120",
   "role": "Operations Lead",
   "trigger": "Procurement security questionnaire before panel appointment"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps for Kite & Co",
   "body": "Hi Daniel,\n\nThanks for the time today. As promised, i will send the security pack and a sample service schedule.\n\nNext step on our side: Sam to send security pack and sample service schedule for Daniel to circulate.\n\nShout if anything in that needs changing.\n\nSam"
  },
  "draftShort": {
   "subject": "Next steps for Kite & Co",
   "body": "Hi Daniel,\n\nSam"
  }
 },
 {
  "id": "call-05-craftwork",
  "contact": "Lucy Beck",
  "title": "Owner",
  "email": "lucy@craftwork.example",
  "company": "Craftwork",
  "industry": "Independent craft retail and workshops",
  "headcount": 8,
  "location": "Northcote, VIC",
  "rep": "Jordan Lee",
  "at": "2026-09-03T11:30:00+10:00",
  "duration": 360,
  "outcome": "lost",
  "valueAud": 9800,
  "trigger": null,
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Hi Lucy Beck, Jordan Lee from Harbourline IT. Thanks for speaking with me about Craftwork. Our managed services plan starts at $95 per seat per month and gives small teams a proper IT helpdesk, security stack and regular maintenance.",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Hi Jordan. I should say upfront we're a small shop in Northcote with eight people, some casual. We run workshops, sell online a bit, and mainly need the till and Wi-Fi to behave.",
    "t": 16
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That's exactly why a managed agreement is helpful. Retail downtime is expensive, and a predictable monthly fee means you can call us instead of trying to work out whether the issue is Shopify, Xero, the router or a laptop.",
    "t": 31
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "My cousin helps us for cheap when the till or Wi-Fi plays up. He knows our setup, and most of the time he can pop in after work or talk me through it.",
    "t": 47
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Family help is common, but it usually has gaps. If there's a ransomware issue, a lost laptop, or a staff member leaving with access, you want proper offboarding, endpoint protection and backup checks instead of favours.",
    "t": 62
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "I get that, but we're not a law firm. We've a handful of iPads, a point-of-sale machine, two laptops and some craft teachers who use their own devices.",
    "t": 77
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The package would still cover those devices, plus Microsoft 365 or Google Workspace, password policy, domain security, and quarterly reports. For Craftwork, onboarding would likely be around $3,500, which gets the environment documented.",
    "t": 89
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "That would be a lot for us. Some weeks we're watching every invoice, especially outside school holiday workshop periods.",
    "t": 103
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The way I'd think about it's risk smoothing. Instead of a surprise emergency bill and lost trading time, you pay a smaller monthly amount and know the basics are covered by a team.",
    "t": 112
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "But our surprise emergency bills have been pretty small. The last one was a new router, and my cousin charged us a slab and the parts.",
    "t": 126
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That works until the problem isn't a router. Cyber insurance, payment security and customer data expectations are increasing, and a managed provider helps show you're taking reasonable steps.",
    "t": 137
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "We don't have cyber insurance, and nobody has asked us about Essential Eight. I mostly answered your email because I wondered if there was an affordable health check.",
    "t": 149
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "We can do health checks, but Harbourline IT's really set up for ongoing managed services. A one-off check without ongoing support can find problems and then leave you with no one accountable for fixing them.",
    "t": 161
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Then I think we're not your customer right now. I'm not saying never, but it's hard to justify before there's a real trigger.",
    "t": 176
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will send a one-page managed services overview. It will show what is included and give you something to keep on file if you decide to professionalise support later.",
    "t": 186
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Sure, send it, but please don't put me into a heavy follow-up sequence. I know the answer for this quarter.",
    "t": 199
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The managed service also gives you continuity when staff change. Casual retail teams can end up with shared passwords, old accounts and nobody quite sure who has access to the online store.",
    "t": 207
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "We do have some messy passwords, but I can fix that with a password manager without signing up to a whole IT service.",
    "t": 221
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "A password manager is a good start, but it's still only one piece. We'd also look at MFA, device updates, DNS records, backups, user permissions and support documentation.",
    "t": 231
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "That sounds thorough, just bigger than the problem I have.",
    "t": 243
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I understand the scale concern, but a lot of small shops only call us after an avoidable issue has already cost them a weekend. I'd rather help before it becomes urgent.",
    "t": 247
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "And I'd rather wait until there's something urgent enough to justify it.",
    "t": 261
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Fair enough. Keep the overview somewhere handy, because if you open a second store or start handling more online orders, the maths changes quickly.",
    "t": 266
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "If we open a second store, I will probably call. Right now we're trying to make this one smoother.",
    "t": 276
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The one-page overview will be practical rather than glossy. I will include the minimum controls, the support inclusions, the onboarding assumptions and the reasons we usually avoid tiny retainers that can't be properly accountable.",
    "t": 284
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Okay. I will read it with that frame, but I'm still expecting it to be more than we need.",
    "t": 299
   },
   {
    "i": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I'd still encourage you to compare the annual cost against the risk of a bad trading day, because a Saturday outage or compromised mailbox can be more expensive than it feels when everything is calm. The managed plan is meant to remove that uncertainty.",
    "t": 307
   },
   {
    "i": 27,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "I hear you, but calm is where we're.",
    "t": 326
   },
   {
    "i": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Even if you don't choose us, I'd make sure the hourly provider can name who owns backups, account removal, MFA and support response during trading hours, because those are the areas that usually fall between casual arrangements.",
    "t": 330
   },
   {
    "i": 29,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "I can ask them that.",
    "t": 346
   },
   {
    "i": 30,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "No problem. I will send the overview and check back down the track.",
    "t": 348
   },
   {
    "i": 31,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Thanks Jordan. Good luck with it, but for now we will stay as we're.",
    "t": 353
   }
  ],
  "fields": {
   "contact": {
    "value": "Lucy Beck",
    "confidence": 0.91,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Craftwork",
    "confidence": 0.9,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "closed_lost",
    "confidence": 0.88,
    "span": 4,
    "evidence_ms": 62000
   },
   "value": {
    "value": 9800,
    "confidence": 0.95,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": null,
    "confidence": 0.86,
    "span": null,
    "evidence_ms": null
   },
   "promises": {
    "value": [
     "I will send a one-page managed services overview"
    ],
    "confidence": 0.97,
    "span": 14,
    "evidence_ms": 186000
   }
  },
  "scorecard": {
   "discovery": 0,
   "nextStepSecured": false,
   "objection": "ignored",
   "talkRatio": 0.61,
   "spans": {
    "discovery": null,
    "nextStep": null,
    "objection": 3
   }
  },
  "objections": [
   {
    "text": "My cousin helps us for cheap when the till or Wi-Fi plays up",
    "handling": "ignored"
   }
  ],
  "icp": {
   "industry": "Independent craft retail and workshops",
   "headcount_band": "under-15",
   "role": "Owner",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Leaving the door open",
   "body": "Hi Lucy,\n\nThanks for being straight with me today. It sounds like managed IT isn't the right spend for Craftwork right now, and that's fair.\n\nIf anything changes, an insurer asks for security evidence, or the computers stop being fine, I'm one email away.\n\nJordan"
  },
  "draftShort": {
   "subject": "Leaving the door open",
   "body": "Hi Lucy,\n\nJordan"
  }
 },
 {
  "id": "call-06-meridian-ai",
  "contact": "Tom Reid",
  "title": "Head of Engineering",
  "email": "tom@meridianai.example",
  "company": "Meridian AI",
  "industry": "AI software company",
  "headcount": 118,
  "location": "Richmond, VIC",
  "rep": "Jordan Lee",
  "at": "2026-09-04T15:15:00+10:00",
  "duration": 440,
  "outcome": "stalled",
  "valueAud": 174000,
  "trigger": "Microsoft 365 migration under consideration for next financial year",
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Tom Reid, it's Jordan from Harbourline IT. I know Meridian AI has grown quickly in Richmond. What made you take a call about managed IT now?",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "We're at one hundred and eighteen people and the tooling is catching up with us. Engineering is fine, but the rest of the company is spread across Google Workspace, Microsoft 365 trials, a few SaaS admin accounts and a lot of tribal knowledge.",
    "t": 15
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Where is that mess causing the most friction today?",
    "t": 42
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Onboarding and access reviews. New starters get a laptop quickly, but permissions depend on which team lead remembered which checklist. Finance also wants more predictable support, because engineers are tired of being unofficial helpdesk.",
    "t": 47
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Who owns the decision if you move from the current hybrid setup to a cleaner Microsoft 365 environment?",
    "t": 68
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "I can recommend the technical approach, but finance owns budget and the COO owns timing. Neither is on this call. I'm gathering options before next year planning.",
    "t": 79
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Harbourline can run the migration, then support everyone under a managed services agreement. For a company at your size, the monthly fee would likely land around $145 per seat, with a project for tenant design, identity and device management.",
    "t": 96
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Budget sits with finance next financial year, not with me this month. I do not want a proposal that assumes authority I do not have.",
    "t": 120
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Totally, although it's helpful to get a number in front of people early. If finance sees the risk and productivity case, they can make room before the planning cycle closes.",
    "t": 135
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Maybe. My bigger concern is whether an external provider can work with engineers without slowing us down. We've unusual device needs, Linux boxes, lab environments and a strong preference for not being locked down blindly.",
    "t": 154
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "We're flexible. We can segment engineering and corporate users, apply different policies and still keep reporting clean. The important thing is having a central support channel and clear admin ownership.",
    "t": 175
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "That sounds plausible, but I'd need our platform lead in the detail. Also, this isn't urgent in September. It's a next financial year budget conversation unless something breaks.",
    "t": 194
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Understood. We've done Microsoft 365 migrations where engineering teams keep the workflows they need while the rest of the business gets structure. I can show examples in a deck.",
    "t": 211
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Examples would be fine, but decks have a way of floating around Slack and dying. If there's a specific workshop later, I can bring finance and platform.",
    "t": 229
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Let me send a capability deck and a rough migration outline. You can share it with finance and the COO, and then we can see whether a workshop makes sense.",
    "t": 245
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Okay, send it through. I'm not promising a workshop yet. I need to see if the business wants to do anything before November.",
    "t": 264
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That's fair. I will also include an indicative timeline and the questions we'd need answered before pricing the onboarding project.",
    "t": 278
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Good. Keep it brief, please. If it's twenty pages, nobody here will read it.",
    "t": 290
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "One option is a discovery workshop rather than a full proposal. We could map users, systems, admin ownership and migration risks, then give finance a budget range for next year.",
    "t": 299
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "That sounds closer to what we need, but I still need the COO to agree it's worth a workshop. We've a lot of competing planning work.",
    "t": 317
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will frame the outline as a decision brief rather than a sales proposal, with the risks of doing nothing, a staged migration path and the questions finance should answer.",
    "t": 333
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "That would travel better internally. People here react badly to vendor language, but a decision brief with open questions could get read.",
    "t": 352
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "If the brief gets traction, the best next call would include finance, the COO and your platform lead so we can separate commercial timing from technical concerns.",
    "t": 365
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Agreed. Without those people, we'd just have another interesting conversation that doesn't move anything.",
    "t": 382
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will keep the brief anchored to your growth problem rather than pretending this is an emergency. The question is whether the current informal support model can survive another hiring cycle.",
    "t": 390
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "That's the right question. We can survive this month, but another burst of hiring would expose the access and onboarding problems again.",
    "t": 409
   },
   {
    "i": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will keep it to the essentials and follow up after you've had a chance to circulate it.",
    "t": 423
   },
   {
    "i": 27,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Thanks Jordan. There's interest, just no firm path yet.",
    "t": 434
   }
  ],
  "fields": {
   "contact": {
    "value": "Tom Reid",
    "confidence": 0.86,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Meridian AI",
    "confidence": 0.87,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "discovery",
    "confidence": 0.87,
    "span": 18,
    "evidence_ms": 299000
   },
   "value": {
    "value": 174000,
    "confidence": 0.92,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": "Jordan to send capability deck and rough migration outline for Tom to share internally.",
    "confidence": 0.94,
    "span": 14,
    "evidence_ms": 245000
   },
   "promises": {
    "value": [
     "Let me send a capability deck and a rough migration outline"
    ],
    "confidence": 0.89,
    "span": 14,
    "evidence_ms": 245000
   }
  },
  "scorecard": {
   "discovery": 3,
   "nextStepSecured": false,
   "objection": "partial",
   "talkRatio": 0.51,
   "spans": {
    "discovery": 0,
    "nextStep": 14,
    "objection": 7
   }
  },
  "objections": [
   {
    "text": "Budget sits with finance next financial year, not with me this month",
    "handling": "partial"
   }
  ],
  "icp": {
   "industry": "AI software company",
   "headcount_band": "81-120",
   "role": "Head of Engineering",
   "trigger": "Microsoft 365 migration under consideration for next financial year"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps for Meridian AI",
   "body": "Hi Tom,\n\nThanks for the time today. As promised, let me send a capability deck and a rough migration outline.\n\nNext step on our side: Jordan to send capability deck and rough migration outline for Tom to share internally.\n\nShout if anything in that needs changing.\n\nJordan"
  },
  "draftShort": {
   "subject": "Next steps for Meridian AI",
   "body": "Hi Tom,\n\nJordan"
  }
 },
 {
  "id": "call-07-wattle-street-legal",
  "contact": "Olivia Hart",
  "title": "Practice Manager",
  "email": "olivia@wattlestreetlegal.example",
  "company": "Wattle Street Legal",
  "industry": "Family law firm",
  "headcount": 37,
  "location": "Hawthorn, VIC",
  "rep": "Sam Whitfield",
  "at": "2026-09-07T09:45:00+10:00",
  "duration": 445,
  "outcome": "won",
  "valueAud": 59600,
  "trigger": "Outgoing internal IT coordinator leaving in three weeks",
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Olivia Hart, Sam from Harbourline IT. Before we get into options, are you still the practice manager at Wattle Street Legal in Hawthorn?",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Yes. We're thirty-seven people, mostly solicitors, paralegals and admin. I booked the call because our internal IT coordinator resigned and leaves in three weeks.",
    "t": 14
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What does that coordinator currently hold in their head that worries you most?",
    "t": 28
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Almost everything. They know the document system quirks, which partners have unusual setups, how court filing certificates work, and which laptops are overdue for replacement. Some of it's written down, but not enough.",
    "t": 36
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How are support requests handled now when solicitors are under deadline pressure?",
    "t": 57
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "People walk to the coordinator or message me. It works because they are here, but it's not scalable. Family law deadlines are emotional, and a locked account before a filing deadline becomes my problem fast.",
    "t": 64
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who needs to approve a managed services agreement before the coordinator leaves?",
    "t": 86
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "The principal solicitor and I can approve if the numbers are sensible. Finance will check cash flow, but this is an operational risk we can't leave open.",
    "t": 93
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What must be stable in the first month for you to feel the transition worked?",
    "t": 110
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Helpdesk coverage, leavers and joiners, backups, certificates for court systems, and someone documenting our Microsoft 365 admin settings. I also need staff to know who to call on day one.",
    "t": 119
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What is your current risk around cyber insurance or client confidentiality questionnaires?",
    "t": 137
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Insurers asked about MFA and backups last year. We answered, but it was informal. The principal wants something more defensible this year, especially because we handle sensitive family matters.",
    "t": 145
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For Wattle Street Legal, the managed service would be about $132 per seat per month, with a transition project focused on documentation, identity, backups and support handover.",
    "t": 163
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "I am nervous about changing provider while our internal IT coordinator is leaving. If the handover is clumsy, everyone will blame me for breaking something that mostly works.",
    "t": 179
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is completely reasonable. I would not suggest a big-bang change. We would run a two-week shadow handover with your coordinator, document the critical systems first and only then switch the helpdesk number. I will send the transition plan and fixed onboarding quote by Tuesday.",
    "t": 196
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "A shadow handover would calm people down. The principal will ask whether you can handle after-hours work, because file migrations during business hours aren't acceptable.",
    "t": 224
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will include the leaver checklist and after-hours file migration window. We can also give staff a simple support card so they know the new process before the coordinator leaves.",
    "t": 240
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Good. The monthly fee isn't the cheapest option, but the timing means I care more about a controlled handover than saving a few dollars per seat.",
    "t": 258
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Can we review the plan Tuesday 8 September at 10am with you and the principal solicitor? If that works, we can start the discovery checklist the next morning.",
    "t": 274
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Yes, Tuesday 8 September at 10am works. Send the invite and the plan before close of business Monday if you can.",
    "t": 291
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I'd also like to interview your coordinator before they leave, not just collect passwords. The unwritten history is often where the real transition risk lives.",
    "t": 304
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Yes, please. They are helpful and will share what they know, but I need someone to ask the right questions while they are still here.",
    "t": 320
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "We will prioritise court-system certificates, document access, admin rights and backup restore evidence before any cosmetic tidy-up. The goal is continuity first, then maturity.",
    "t": 335
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "That order makes sense. Staff will forgive a slightly clunky portal before they forgive being unable to file documents or open matters.",
    "t": 350
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For communication, we can draft a simple internal note from you explaining the support change, the reason for it and exactly what staff should do from the first day.",
    "t": 363
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "That would save me time. People get nervous when support changes, especially the partners who have had the same habits for years.",
    "t": 381
   },
   {
    "i": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "We can start the handover with a short risk register as well, so you can show the principal what is critical, what is inconvenient and what can wait until after the coordinator leaves.",
    "t": 395
   },
   {
    "i": 27,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "That will make the approval conversation cleaner. The principal is practical, but she hates open-ended projects with no sense of priority.",
    "t": 415
   },
   {
    "i": 28,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Done. I will send the invite now, then the transition plan and fixed quote by Monday afternoon.",
    "t": 428
   },
   {
    "i": 29,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Thanks Sam. This feels practical, which is what I needed.",
    "t": 438
   }
  ],
  "fields": {
   "contact": {
    "value": "Olivia Hart",
    "confidence": 0.96,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Wattle Street Legal",
    "confidence": 0.94,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "closed_won",
    "confidence": 0.91,
    "span": null,
    "evidence_ms": null
   },
   "value": {
    "value": 59600,
    "confidence": 0.91,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": "Sam to send transition plan and meet Olivia plus principal solicitor for sign-off.",
    "confidence": 0.89,
    "span": 14,
    "evidence_ms": 196000
   },
   "promises": {
    "value": [
     "I will send the transition plan and fixed onboarding quote by Tuesday",
     "I will include the leaver checklist and after-hours file migration window"
    ],
    "confidence": 0.94,
    "span": 14,
    "evidence_ms": 196000
   }
  },
  "scorecard": {
   "discovery": 6,
   "nextStepSecured": true,
   "objection": "handled",
   "talkRatio": 0.48,
   "spans": {
    "discovery": 0,
    "nextStep": 14,
    "objection": 13
   }
  },
  "objections": [
   {
    "text": "I am nervous about changing provider while our internal IT coordinator is leaving",
    "handling": "handled"
   }
  ],
  "icp": {
   "industry": "Family law firm",
   "headcount_band": "25-80",
   "role": "Practice Manager",
   "trigger": "Outgoing internal IT coordinator leaving in three weeks"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps for Wattle Street Legal",
   "body": "Hi Olivia,\n\nThanks for the time today. As promised, i will send the transition plan and fixed onboarding quote by Tuesday.\n\nNext step on our side: Sam to send transition plan and meet Olivia plus principal solicitor for sign-off.\n\nShout if anything in that needs changing.\n\nSam"
  },
  "draftShort": {
   "subject": "Next steps for Wattle Street Legal",
   "body": "Hi Olivia,\n\nSam"
  }
 },
 {
  "id": "call-08-elm-and-ledger-accounting",
  "contact": "Ben Wallace",
  "title": "Director",
  "email": "ben@elmandledger.example",
  "company": "Elm & Ledger Accounting",
  "industry": "Accounting practice",
  "headcount": 52,
  "location": "Geelong, VIC",
  "rep": "Sam Whitfield",
  "at": "2026-09-07T13:30:00+10:00",
  "duration": 455,
  "outcome": "won",
  "valueAud": 78200,
  "trigger": "Office move and Microsoft 365 migration before busy season",
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Ben Wallace, thanks for taking the call. I have Elm & Ledger Accounting as a fifty-two person practice in Geelong, and you're one of the directors, correct?",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Correct. We're moving offices at the end of September, and it has forced a decision about IT. We also want to finish a Microsoft 365 migration before the next busy season.",
    "t": 16
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What is driving the Microsoft 365 migration now rather than after the move?",
    "t": 36
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "We're halfway between old file shares and SharePoint. Staff are confused, and our current provider keeps telling us to wait. The office move feels like the clean moment to stop dragging both systems around.",
    "t": 44
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How does that confusion show up for accountants and admin during client work?",
    "t": 65
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "People duplicate files, Xero reports end up in the wrong folder, and managers ask admin to find versions during client calls. Nobody is malicious; it's just messy and wastes time.",
    "t": 73
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who needs to be involved in approving the plan?",
    "t": 92
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Me, another director, and our office manager. I can approve the managed service if the migration risk is clearly controlled. The office manager knows the staff pain better than anyone.",
    "t": 97
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What are the non-negotiables for the office move weekend?",
    "t": 116
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Internet live before Monday, printers mapped, Teams phones working, Xero and the tax software accessible, and no mystery about where client files live. We've no appetite for heroics on Monday morning.",
    "t": 122
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where do security and cyber insurance sit on your list?",
    "t": 141
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Increasingly high. The insurer asked about MFA, backups and admin rights. Accounting firms are an obvious target, and clients assume we've our house in order.",
    "t": 147
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For Elm & Ledger Accounting, Harbourline would likely recommend managed services at $130 per seat per month, plus a fixed office move and Microsoft 365 migration project.",
    "t": 163
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "We cannot have a messy migration in the middle of tax planning work. If staff lose client files or Xero access, the partners will never forgive the change.",
    "t": 180
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Agreed. The migration should be staged, tested with a pilot group and frozen around key lodgement dates. I will send the office move checklist and migration proposal by Wednesday so you can see the exact order.",
    "t": 197
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "That would help. I also want someone to look at old Xero access. We've former contractors who may still have permissions.",
    "t": 220
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will include the Xero access review and the busy-season support plan. The onboarding project will document users, permissions, backups and the move-weekend run sheet.",
    "t": 233
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "That sounds like the right level. Price is within range if the migration is fixed fee and we can hold you to the run sheet.",
    "t": 249
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Can we do a site walk-through Wednesday 9 September at 10am with you and the office manager, then finalise the proposal that afternoon?",
    "t": 264
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Yes, Wednesday 9 September at 10am works. Come to the current office and we can show you the comms room and the file structure.",
    "t": 278
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For the walk-through, I will want to see the comms cupboard, sample client folders, current permissions and the move timetable. That keeps the quote tied to reality.",
    "t": 293
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Good. We've had people quote from a phone call before, and then every exception became a variation. I'd rather expose the messy parts upfront.",
    "t": 310
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "We will also mark anything that shouldn't move during the office weekend. Some legacy data may be better archived cleanly than dragged into the new structure.",
    "t": 325
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "That will be a useful discipline. Accountants tend to keep everything forever, and then complain that search is terrible.",
    "t": 342
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "The support plan will include extra cover for the first Monday and a named escalation path, so your office manager isn't standing between staff and the provider.",
    "t": 353
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "She will appreciate that. She is excellent, but she has become the unofficial queue for every technical complaint.",
    "t": 370
   },
   {
    "i": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will also ask about your lodgement calendar during the walk-through. It's easy for IT people to plan around their own availability and accidentally land work during your worst possible week.",
    "t": 381
   },
   {
    "i": 27,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Please do. Our quiet-looking weeks can still have partner reviews, payroll and client deadlines packed inside them.",
    "t": 401
   },
   {
    "i": 28,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For the proposal, I will make the assumptions visible: number of seats, current file volume, printer count, Xero users and which work happens after hours.",
    "t": 411
   },
   {
    "i": 29,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Good. Visible assumptions make it easier for the directors to approve, because they can see what would change the number.",
    "t": 427
   },
   {
    "i": 30,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Excellent. I will send the invite, checklist and proposal outline before then.",
    "t": 440
   },
   {
    "i": 31,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Thanks Sam. If the walk-through checks out, we're ready to move quickly.",
    "t": 447
   }
  ],
  "fields": {
   "contact": {
    "value": "Ben Wallace",
    "confidence": 0.94,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Elm & Ledger Accounting",
    "confidence": 0.87,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "closed_won",
    "confidence": 0.86,
    "span": null,
    "evidence_ms": null
   },
   "value": {
    "value": 78200,
    "confidence": 0.9,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": "Sam to send migration proposal and run site walk-through with Ben and office manager.",
    "confidence": 0.93,
    "span": 18,
    "evidence_ms": 264000
   },
   "promises": {
    "value": [
     "I will send the office move checklist and migration proposal by Wednesday",
     "I will include the Xero access review and the busy-season support plan"
    ],
    "confidence": 0.98,
    "span": 14,
    "evidence_ms": 197000
   }
  },
  "scorecard": {
   "discovery": 6,
   "nextStepSecured": true,
   "objection": "handled",
   "talkRatio": 0.47,
   "spans": {
    "discovery": 0,
    "nextStep": 18,
    "objection": 13
   }
  },
  "objections": [
   {
    "text": "We cannot have a messy migration in the middle of tax planning work",
    "handling": "handled"
   }
  ],
  "icp": {
   "industry": "Accounting practice",
   "headcount_band": "25-80",
   "role": "Director",
   "trigger": "Office move and Microsoft 365 migration before busy season"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps for Elm & Ledger Accounting",
   "body": "Hi Ben,\n\nThanks for the time today. As promised, i will send the office move checklist and migration proposal by Wednesday.\n\nNext step on our side: Sam to send migration proposal and run site walk-through with Ben and office manager.\n\nShout if anything in that needs changing.\n\nSam"
  },
  "draftShort": {
   "subject": "Next steps for Elm & Ledger Accounting",
   "body": "Hi Ben,\n\nSam"
  }
 },
 {
  "id": "call-09-port-phillip-physio-group",
  "contact": "Aisha Rahman",
  "title": "General Manager",
  "email": "aisha@portphillipphysio.example",
  "company": "Port Phillip Physio Group",
  "industry": "Multi-site physiotherapy clinic",
  "headcount": 76,
  "location": "St Kilda and Cheltenham, VIC",
  "rep": "Jordan Lee",
  "at": "2026-09-08T12:00:00+10:00",
  "duration": 450,
  "outcome": "won",
  "valueAud": 109400,
  "trigger": "Cyber insurance renewal requiring Essential Eight controls",
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Aisha Rahman, thanks for making time. I have Port Phillip Physio Group as seventy-six people across St Kilda and Cheltenham, and you run operations as general manager, right?",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That's right. We've physios, reception, admin and a small leadership team. The immediate issue is our cyber insurance renewal, which has become much stricter than last year.",
    "t": 17
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "What is the insurer asking for that you can't easily evidence today?",
    "t": 34
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "They want proof of MFA, patching, backups and admin controls. Our provider says those things are handled, but when I ask for records I get screenshots and a long email rather than a clean answer.",
    "t": 42
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "How does IT support work across the two clinics during a normal week?",
    "t": 64
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Reception logs issues by email, then people chase by phone if it's urgent. Clinicians can't wait long because the practice system, EFTPOS and exercise software all touch appointments.",
    "t": 72
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Who will make the decision if you change support before the renewal?",
    "t": 90
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "I recommend, the clinic director approves, and finance signs the contract. The director cares about patient privacy and not disrupting sessions. Finance cares about predictability.",
    "t": 98
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "What would success look like in the first six weeks?",
    "t": 114
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "An evidence pack for the insurer, a known helpdesk process for reception, a cleaned-up Microsoft 365 tenant, and less noise when staff move between clinics. We're not trying to become a bank, just competent.",
    "t": 120
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Where are staff most likely to resist a change?",
    "t": 142
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Reception will resist if it slows them down. Clinicians will resist if passwords or MFA interrupt appointments. The director will resist anything that sounds like a generic cyber package.",
    "t": 147
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "For your size, Harbourline IT would be around $126 per seat per month, with an onboarding project to produce the Essential Eight evidence and standardise clinic support.",
    "t": 166
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Our current provider says they already do security, so I need to understand why this is different. I do not want to pay twice for the same promise.",
    "t": 183
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That is fair. The difference should be visible in evidence, ownership and cadence. We would show which controls exist, which are partial and which need work, then report monthly instead of waiting for renewal season. I will send the Essential Eight evidence plan and commercial proposal by Thursday.",
    "t": 201
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That's a better answer. The clinic director will also ask how you avoid disruption during appointment hours.",
    "t": 231
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will include the staged clinic rollout and receptionist training plan. We can run identity changes after the final appointment block and do short reception sessions before the morning rush.",
    "t": 242
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Good. The price is workable if the onboarding project is clear and if finance can see what risk is reduced.",
    "t": 261
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Can we meet Thursday 10 September at 3pm with you, the clinic director and finance to review the proposal and evidence plan?",
    "t": 274
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Yes, Thursday 10 September at 3pm works. Send the invite and I will add the other two.",
    "t": 288
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "For the insurer, we will avoid vague maturity claims. The evidence plan will state which Essential Eight controls are in place, which are partly in place, and what dates we can put against improvements.",
    "t": 298
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That's exactly what I need. Our board doesn't expect perfection, but they do expect a straight answer and a plan they can defend.",
    "t": 320
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "We can also separate clinical-impact changes from back-office changes. Anything that touches appointment flow gets tested in one clinic first, with reception feedback before it goes wider.",
    "t": 335
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That will matter. Reception knows where the friction really sits, and they will tell us quickly if a new login process is getting in the way.",
    "t": 352
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will write the proposal so finance can see monthly support, onboarding and optional maturity work as separate lines. That should make the decision less all-or-nothing.",
    "t": 368
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Good. A clear split will help, because I can get urgent insurance work approved faster than broad improvement work.",
    "t": 385
   },
   {
    "i": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The receptionist training will be short and role-specific. It should answer where to log issues, what to do if EFTPOS or the practice system is affected, and how to escalate urgent appointment-impacting problems.",
    "t": 397
   },
   {
    "i": 27,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That's practical. Reception carries the stress first, so if they trust the process the clinicians will usually follow.",
    "t": 418
   },
   {
    "i": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Will do. I will send the proposal the morning of the meeting so you've time to skim it.",
    "t": 429
   },
   {
    "i": 29,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Thanks Jordan. This feels more grounded than the last few calls I have had.",
    "t": 441
   }
  ],
  "fields": {
   "contact": {
    "value": "Aisha Rahman",
    "confidence": 0.86,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Port Phillip Physio Group",
    "confidence": 0.86,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "closed_won",
    "confidence": 0.89,
    "span": null,
    "evidence_ms": null
   },
   "value": {
    "value": 109400,
    "confidence": 0.94,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": "Jordan to send proposal and meet Aisha plus clinic director for decision.",
    "confidence": 0.92,
    "span": 18,
    "evidence_ms": 274000
   },
   "promises": {
    "value": [
     "I will send the Essential Eight evidence plan and commercial proposal by Thursday",
     "I will include the staged clinic rollout and receptionist training plan"
    ],
    "confidence": 0.92,
    "span": 14,
    "evidence_ms": 201000
   }
  },
  "scorecard": {
   "discovery": 6,
   "nextStepSecured": true,
   "objection": "handled",
   "talkRatio": 0.5,
   "spans": {
    "discovery": 0,
    "nextStep": 18,
    "objection": 13
   }
  },
  "objections": [
   {
    "text": "Our current provider says they already do security, so I need to understand why this is different",
    "handling": "handled"
   }
  ],
  "icp": {
   "industry": "Multi-site physiotherapy clinic",
   "headcount_band": "25-80",
   "role": "General Manager",
   "trigger": "Cyber insurance renewal requiring Essential Eight controls"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps for Port Phillip Physio Group",
   "body": "Hi Aisha,\n\nThanks for the time today. As promised, i will send the Essential Eight evidence plan and commercial proposal by Thursday.\n\nNext step on our side: Jordan to send proposal and meet Aisha plus clinic director for decision.\n\nShout if anything in that needs changing.\n\nJordan"
  },
  "draftShort": {
   "subject": "Next steps for Port Phillip Physio Group",
   "body": "Hi Aisha,\n\nJordan"
  }
 },
 {
  "id": "call-10-lumen-lane-retail",
  "contact": "Noah Spencer",
  "title": "Co-owner",
  "email": "noah@lumenlaneretail.example",
  "company": "Lumen Lane Retail",
  "industry": "Boutique lighting retailer",
  "headcount": 10,
  "location": "Prahran, VIC",
  "rep": "Jordan Lee",
  "at": "2026-09-09T10:30:00+10:00",
  "duration": 355,
  "outcome": "lost",
  "valueAud": 11200,
  "trigger": null,
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Noah Spencer, thanks for the call. Harbourline IT gives small businesses a full managed IT service for $98 per seat per month, which covers helpdesk, device management, Microsoft 365, backups and security monitoring.",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Thanks Jordan. Lumen Lane Retail is ten people if you count casuals. We sell lighting from a Prahran showroom and online. I'm mostly checking prices because our current arrangement is informal.",
    "t": 16
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Informal support is risky for a retailer. If the point-of-sale terminal, Wi-Fi, Xero or email fails, sales stop. A monthly plan means you can call one team and know the fundamentals are being maintained.",
    "t": 32
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "We are comparing you to a break-fix provider who charges by the hour. They quoted a lower rate, and we only call when something is actually wrong.",
    "t": 49
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Break-fix looks cheaper on paper, but it doesn't include prevention. Our agreement includes patching, endpoint protection, backup checks and admin reviews, which is what keeps the hourly emergencies down.",
    "t": 62
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Maybe, but some months we've zero issues. We're not keen to add another subscription while foot traffic is uneven.",
    "t": 77
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "You also need to think about cyber risk. Retailers hold customer details, supplier records and payment systems. If an account is compromised, you want documented controls, not a frantic call to whoever can come out tomorrow.",
    "t": 86
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "I understand, but nobody has asked us for documentation. We don't have a board or a procurement team. It's me, my co-owner and a spreadsheet of expenses.",
    "t": 104
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The onboarding project would clean all that up. For Lumen Lane Retail, it would probably be around $3,800, then the monthly per-seat fee. We'd set MFA, standardise devices and document the environment.",
    "t": 118
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "That's too much for what we need. We were thinking of a few hundred dollars here and there, not a standing agreement.",
    "t": 134
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The issue with a few hundred here and there's that nobody owns the outcome. Managed IT gives you accountability, reporting and a support process that doesn't depend on your co-owner knowing which cable to restart.",
    "t": 145
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "The cable restart isn't worth ten grand a year. We might grow into something like this, but not while the business is this size.",
    "t": 163
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I hear you. Still, the cost of one serious outage can be larger than the annual difference, especially if it happens during a sale or before Christmas.",
    "t": 175
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "That feels a bit hypothetical for us. I wanted to know whether you could beat the hourly provider or offer a small retainer.",
    "t": 188
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "We don't really compete on hourly rates. Harbourline IT's built for proactive managed services, so the value is in coverage rather than being the cheapest emergency contact.",
    "t": 200
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Then I think we will go with the other provider. They fit the way we buy at the moment.",
    "t": 213
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will send the managed IT brochure in case you want to revisit it later.",
    "t": 223
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Sure, but no need to follow up hard. Thanks for explaining it.",
    "t": 230
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Another thing to consider is that hourly providers aren't usually watching for slow drift. Licences pile up, former staff keep access, routers age out and backups fail quietly until someone finally notices.",
    "t": 237
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "That may be true, but it still feels like buying a large umbrella for a drizzle.",
    "t": 253
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The managed model also gives you reporting. You would see patch status, security alerts, Microsoft 365 settings and recommendations each quarter, instead of only hearing from IT during a fault.",
    "t": 261
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Reports sound nice, but I don't need another report to read.",
    "t": 276
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I get that, but the report is how you know the basics are actually happening. Without it, the cheap option is largely trust and reaction time.",
    "t": 281
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Trust and reaction time are mostly enough for us right now.",
    "t": 294
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "If you change your mind, the brochure explains the minimum standard we recommend for any retailer, even if you don't use us. It might still help you challenge the hourly quote.",
    "t": 300
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "That's useful, but it probably confirms we're shopping in a different category.",
    "t": 315
   },
   {
    "i": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will also include a comparison table between hourly break-fix and managed services. It will show what is included, what is excluded and where responsibility sits, so the decision is clear even if you choose the cheaper path.",
    "t": 321
   },
   {
    "i": 27,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "That's fine. A comparison table will probably help my co-owner see why we're saying no, at least for now.",
    "t": 340
   },
   {
    "i": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Thanks Noah. Good luck with the showroom.",
    "t": 350
   },
   {
    "i": 29,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Thanks, bye.",
    "t": 353
   }
  ],
  "fields": {
   "contact": {
    "value": "Noah Spencer",
    "confidence": 0.95,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Lumen Lane Retail",
    "confidence": 0.91,
    "span": 1,
    "evidence_ms": 16000
   },
   "stage": {
    "value": "closed_lost",
    "confidence": 0.98,
    "span": null,
    "evidence_ms": null
   },
   "value": {
    "value": 11200,
    "confidence": 0.92,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": null,
    "confidence": 0.96,
    "span": null,
    "evidence_ms": null
   },
   "promises": {
    "value": [
     "I will send the managed IT brochure"
    ],
    "confidence": 0.88,
    "span": 16,
    "evidence_ms": 223000
   }
  },
  "scorecard": {
   "discovery": 0,
   "nextStepSecured": false,
   "objection": "ignored",
   "talkRatio": 0.61,
   "spans": {
    "discovery": null,
    "nextStep": null,
    "objection": 3
   }
  },
  "objections": [
   {
    "text": "We are comparing you to a break-fix provider who charges by the hour",
    "handling": "ignored"
   }
  ],
  "icp": {
   "industry": "Boutique lighting retailer",
   "headcount_band": "under-15",
   "role": "Co-owner",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Leaving the door open",
   "body": "Hi Noah,\n\nThanks for being straight with me today. It sounds like managed IT isn't the right spend for Lumen Lane Retail right now, and that's fair.\n\nIf anything changes, an insurer asks for security evidence, or the computers stop being fine, I'm one email away.\n\nJordan"
  },
  "draftShort": {
   "subject": "Leaving the door open",
   "body": "Hi Noah,\n\nJordan"
  }
 },
 {
  "id": "call-11-banksia-architects",
  "contact": "Grace Kim",
  "title": "Studio Operations Manager",
  "email": "grace@banksiaarchitects.example",
  "company": "Banksia Architects",
  "industry": "Architecture studio",
  "headcount": 44,
  "location": "Fitzroy, VIC",
  "rep": "Sam Whitfield",
  "at": "2026-09-10T14:00:00+10:00",
  "duration": 425,
  "outcome": "stalled",
  "valueAud": 66400,
  "trigger": "Office move planning and cyber insurance evidence gap",
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Grace Kim, thanks for speaking with me. I have Banksia Architects as a forty-four person studio in Fitzroy, and you manage studio operations, yes?",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Yes. We're looking at an office move next quarter, and it has exposed how dependent we're on an IT setup nobody really owns. I'm gathering options before the directors decide what to fund.",
    "t": 14
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What has the office move made visible that was easier to ignore before?",
    "t": 34
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Shared project files, printing, site laptops and a pile of old accounts. We've grown from twenty-eight to forty-four people, but the IT habits are from the smaller studio.",
    "t": 42
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How do staff currently get help when something breaks during a deadline?",
    "t": 58
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "They message me, our BIM lead, or the external technician we use casually. Everyone is helpful, but nobody has an overall picture. During tender weeks that means lots of interruptions.",
    "t": 66
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who would need to be in the room for a decision on managed services?",
    "t": 84
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Two directors and me. I can recommend, but I can't sign. One director cares about project continuity, the other is watching cash because the move is expensive.",
    "t": 92
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What would make the directors feel this is a must-do rather than a nice-to-have?",
    "t": 108
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Evidence that the move is risky without it. Also cyber insurance. We answered a questionnaire last year, but I couldn't prove half the answers without chasing three people.",
    "t": 117
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where are your biggest security gaps today?",
    "t": 134
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Old admin accounts, inconsistent MFA, and no formal backup test. I'm not saying everything is broken, but it's too much dependent knowledge.",
    "t": 138
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For a studio your size, Harbourline IT would usually sit around $134 per seat per month, with an onboarding project to document systems before the move.",
    "t": 151
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "The directors will not approve anything until the new financial year budget is clearer. They have already committed to lease costs, furniture and a fit-out consultant.",
    "t": 167
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That's understandable. The useful first step may be a low-commitment risk note that shows what needs funding and what can wait. I don't want you trying to sell a full proposal without director context.",
    "t": 182
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "A risk note would help me frame it. I can't promise they will prioritise it, but they will listen if it ties directly to the move and insurance.",
    "t": 203
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Would you like me to join a director meeting once they have read it?",
    "t": 220
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Maybe. I don't have the meeting date yet, and I'd rather not lock something in until I know whether they want to engage.",
    "t": 228
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Fair. I will send a short findings note and an office move risk checklist. You can use it internally, and if the directors want detail we can book a proper workshop.",
    "t": 242
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Yes, send that. Keep it practical and not too salesy, please.",
    "t": 260
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "In the note, I will separate must-fix items from decisions that can safely wait. That should help the directors avoid treating every IT issue as equal.",
    "t": 267
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That would be useful. At the moment it all feels like one tangled problem, which makes it easier for them to defer the whole thing.",
    "t": 283
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will also give you a small evidence checklist for cyber insurance, so even if managed services waits, you know what documents to collect before renewal.",
    "t": 298
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That's valuable. I don't want another renewal where I'm asking three different people whether we test backups and getting three different answers.",
    "t": 313
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "If the directors push it to next year, the checklist can become the basis for a budget request rather than disappearing after this call.",
    "t": 327
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Exactly. I need something I can attach to a budget conversation, not just my feeling that the current setup is fragile.",
    "t": 341
   },
   {
    "i": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will make the risk note specific to architecture workflows: large files, consultant deadlines, site laptops, printing, SharePoint structure and access for contractors.",
    "t": 354
   },
   {
    "i": 27,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That specificity matters. The directors tune out when IT sounds generic, but they pay attention when it connects to project delivery.",
    "t": 367
   },
   {
    "i": 28,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will include a small section on what to ask any provider, including us, so the directors can compare options without needing to be technical.",
    "t": 380
   },
   {
    "i": 29,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That would be genuinely helpful. They will want to feel in control of the decision, not steered into a package.",
    "t": 395
   },
   {
    "i": 30,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Absolutely. I will keep it to the move, cyber insurance evidence and the support model choices.",
    "t": 407
   },
   {
    "i": 31,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Thanks Sam. I'm interested, but I need the internal timing to catch up.",
    "t": 417
   }
  ],
  "fields": {
   "contact": {
    "value": "Grace Kim",
    "confidence": 0.86,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Banksia Architects",
    "confidence": 0.96,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "evaluation",
    "confidence": 0.92,
    "span": null,
    "evidence_ms": null
   },
   "value": {
    "value": 66400,
    "confidence": 0.9,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": "Sam to send findings note and risk checklist for Grace to discuss with directors.",
    "confidence": 0.88,
    "span": 18,
    "evidence_ms": 242000
   },
   "promises": {
    "value": [
     "I will send a short findings note and an office move risk checklist"
    ],
    "confidence": 0.89,
    "span": 18,
    "evidence_ms": 242000
   }
  },
  "scorecard": {
   "discovery": 6,
   "nextStepSecured": false,
   "objection": "partial",
   "talkRatio": 0.47,
   "spans": {
    "discovery": 0,
    "nextStep": 18,
    "objection": 13
   }
  },
  "objections": [
   {
    "text": "The directors will not approve anything until the new financial year budget is clearer",
    "handling": "partial"
   }
  ],
  "icp": {
   "industry": "Architecture studio",
   "headcount_band": "25-80",
   "role": "Studio Operations Manager",
   "trigger": "Office move planning and cyber insurance evidence gap"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps for Banksia Architects",
   "body": "Hi Grace,\n\nThanks for the time today. As promised, i will send a short findings note and an office move risk checklist.\n\nNext step on our side: Sam to send findings note and risk checklist for Grace to discuss with directors.\n\nShout if anything in that needs changing.\n\nSam"
  },
  "draftShort": {
   "subject": "Next steps for Banksia Architects",
   "body": "Hi Grace,\n\nSam"
  }
 },
 {
  "id": "call-12-dockside-dental",
  "contact": "Ethan Clarke",
  "title": "Practice Owner",
  "email": "ethan@docksidedental.example",
  "company": "Dockside Dental",
  "industry": "Dental practice",
  "headcount": 18,
  "location": "Williamstown, VIC",
  "rep": "Jordan Lee",
  "at": "2026-09-11T09:00:00+10:00",
  "duration": 55,
  "outcome": "no_show",
  "valueAud": null,
  "trigger": null,
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Hi, Jordan Lee from Harbourline IT calling for Ethan Clarke at Dockside Dental. We had a 9am phone appointment about managed IT and cyber insurance questions.",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Reception",
    "text": "Ethan has been pulled into a patient issue and won't make the call. Sorry, the morning has gone sideways.",
    "t": 17
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "No worries. I will send a quick email with a couple of times to reschedule, and he can pick whatever works. Please let him know Jordan called.",
    "t": 30
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Reception",
    "text": "Will do. Email is best today. Thanks for understanding.",
    "t": 48
   }
  ],
  "fields": {
   "contact": {
    "value": "Ethan Clarke",
    "confidence": 0.92,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Dockside Dental",
    "confidence": 0.86,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "discovery",
    "confidence": 0.89,
    "span": null,
    "evidence_ms": null
   },
   "value": {
    "value": 0,
    "confidence": 0.97,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": null,
    "confidence": 0.88,
    "span": null,
    "evidence_ms": null
   },
   "promises": {
    "value": [
     "I will send a quick email with a couple of times to reschedule"
    ],
    "confidence": 0.88,
    "span": 2,
    "evidence_ms": 30000
   }
  },
  "scorecard": {
   "discovery": 0,
   "nextStepSecured": false,
   "objection": "none_raised",
   "talkRatio": 0.65,
   "spans": {
    "discovery": null,
    "nextStep": null,
    "objection": null
   }
  },
  "objections": [],
  "icp": {
   "industry": "Dental practice",
   "headcount_band": "15-24",
   "role": "Practice Owner",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Rescheduling our call",
   "body": "Hi Ethan,\n\nNo problem at all about this morning. I have Thursday 10:00 or Friday 14:00 free if either suits; happy to keep it to twenty minutes.\n\nJordan"
  },
  "draftShort": {
   "subject": "Rescheduling our call",
   "body": "Hi Ethan,\n\nJordan"
  }
 },
 {
  "id": "call-13-marlowe-finch-demo",
  "contact": "Dev Patel",
  "title": "CFO",
  "email": "dev@marlowefinch.example",
  "company": "Marlowe & Finch Accounting",
  "industry": "Accounting practice",
  "headcount": 34,
  "location": "Hawthorn, VIC",
  "rep": "Jordan Lee",
  "at": "2026-09-11T15:30:00+10:00",
  "duration": 420,
  "outcome": "won",
  "valueAud": 48600,
  "trigger": "Cyber insurance renewal requiring Essential Eight controls",
  "turns": [
   {
    "i": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Dev Patel, Jordan Lee from Harbourline IT. I've heard Marlowe & Finch Accounting is the calmest thirty-four-person practice in Hawthorn, which means you must be hiding the chaos beautifully?",
    "t": 0
   },
   {
    "i": 1,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "That's generous. I'm Dev, CFO, and there's definitely chaos. We've got a cyber insurance renewal on my desk and the partners want it gone before quarter close.",
    "t": 14
   },
   {
    "i": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Perfect, picture this: three firms on your street have already moved, and the onboarding price is gone Friday. You don't need another committee, you need Harbourline on the tools before the insurer decides accountants are this season's piñata.",
    "t": 27
   },
   {
    "i": 3,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "Hold on. I'm taking the call because we need options, not because we've chosen anyone. What exactly are you proposing?",
    "t": 46
   },
   {
    "i": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Simple. Thirty seats, $135 per seat per month, managed IT, cyber hygiene, Microsoft 365, Xero access review, MFA, backups, helpdesk, partner-friendly reporting, the whole brass band. I can guarantee Essential Eight compliance inside a week.",
    "t": 56
   },
   {
    "i": 5,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "That's a very big promise. Also thirty seats is close, but we've thirty-four people including casual admin and seasonal tax support.",
    "t": 73
   },
   {
    "i": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Thirty is the clean commercial start. We cover the core team now, catch the casuals in onboarding, and keep the invoice from looking like it swallowed a bowling ball. The annual figure is $48,600, and onboarding is at cost because I want this moving.",
    "t": 83
   },
   {
    "i": 7,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "Price is my first concern. Our incumbent charges less, and the partners are already grumpy about insurance premiums.",
    "t": 105
   },
   {
    "i": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Price is smoke, Dev, premium is fire. Your insurer will halve the premium once they see our report, so the monthly line item becomes a rounding error with a login screen.",
    "t": 114
   },
   {
    "i": 9,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "You can't know that. The broker hasn't promised anything like a half reduction, and I can't sell fantasy savings to the partners.",
    "t": 129
   },
   {
    "i": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Fair, fair, call it a sharp reduction rather than a tattoo. The point is the renewal asks for controls, and we package the answers so you aren't hunting screenshots from a router, a laptop and a drawer full of mystery passwords.",
    "t": 140
   },
   {
    "i": 11,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "That part is real. We struggled last year to prove MFA coverage and backup testing. Still, our current provider knows the practice and the partners trust them.",
    "t": 160
   },
   {
    "i": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Trust is lovely. Receipts are lovelier. None of our clients has ever been breached, and we run the service like a tax file with a stopwatch: evidence, cadence, accountability, no heroic cousin with a USB stick.",
    "t": 173
   },
   {
    "i": 13,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "The incumbent isn't someone's cousin. They're a proper provider, and they've supported us for years.",
    "t": 191
   },
   {
    "i": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I hear you, and loyalty matters. The question is whether they're built for this renewal. Your incumbent is about to lose their certification, and even without that, you need insurer-grade evidence, not a nice bloke with fast email.",
    "t": 198
   },
   {
    "i": 15,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "About to lose certification? That's a pretty serious thing to say. I haven't heard that from anyone.",
    "t": 217
   },
   {
    "i": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Let's not get stuck in the weeds. I'm saying the market's moving, auditors are waking up, insurers are grumpy, and you don't want Marlowe & Finch Accounting as the test case everyone whispers about at the Hawthorn lunch counter.",
    "t": 225
   },
   {
    "i": 17,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "I don't like being rushed. I do like the idea of evidence for the renewal, and a fixed commercial number helps. What would happen today if I said yes to reviewing it?",
    "t": 244
   },
   {
    "i": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Today is easy. I turn the call into a plain proposal, no interpretive dance, no discovery workshop that eats your calendar. You'll see seats, scope, onboarding, renewal evidence, support hours, response targets and the Monday start plan in one clean pack.",
    "t": 260
   },
   {
    "i": 19,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "A clean pack is useful. I still need the managing partner to be comfortable before anyone signs.",
    "t": 280
   },
   {
    "i": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Of course. Give the managing partner the tidy version: thirty core seats, insurer evidence first, no migration circus, and the finance line is predictable. I'll keep the terms sharp enough that nobody has to decode vendor soup at dinner.",
    "t": 289
   },
   {
    "i": 21,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "Good. Clear and short will help.",
    "t": 308
   },
   {
    "i": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Beautiful. I will get a proposal in your inbox today, with a signed 30-seat agreement at $135 per seat per month and onboarding at cost. You sign, we start Monday, and your broker gets grown-up answers before they sharpen the pencil.",
    "t": 311
   },
   {
    "i": 23,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "I said review it, not definitely sign it. But if the agreement is clean and onboarding is genuinely at cost, I can take it to the managing partner tonight.",
    "t": 331
   },
   {
    "i": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That's the small step. Just say yes to the small step. I will send the proposal and 30-seat agreement by 5pm today, and we'll hold the Friday onboarding price while you get the signature.",
    "t": 345
   },
   {
    "i": 25,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "Fine. Send it by 5pm today, 11 September. I'll review it with the managing partner, and if the terms match what you've said, we'll sign the 30-seat agreement and start with onboarding Monday.",
    "t": 362
   },
   {
    "i": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Excellent. I'll send it to dev@marlowefinch.example, copy your office manager if you want, and keep the first page painfully clear: $48,600 annual managed service, onboarding at cost, insurer evidence first.",
    "t": 378
   },
   {
    "i": 27,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "Copy me only for now. And Jordan, trim the theatre from the email. The partners like numbers, not fireworks.",
    "t": 393
   },
   {
    "i": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Numbers only, fireworks in a separate attachment that mysteriously never arrives. Thanks Dev, you've moved fast, which is exactly how we keep the renewal from becoming a Friday-night spreadsheet séance.",
    "t": 402
   },
   {
    "i": 29,
    "speaker": "prospect",
    "name": "Dev Patel",
    "text": "Right. Send the proposal. Bye.",
    "t": 417
   }
  ],
  "fields": {
   "contact": {
    "value": "Dev Patel",
    "confidence": 0.96,
    "span": 0,
    "evidence_ms": 0
   },
   "company": {
    "value": "Marlowe & Finch Accounting",
    "confidence": 0.89,
    "span": 0,
    "evidence_ms": 0
   },
   "stage": {
    "value": "closed_won",
    "confidence": 0.94,
    "span": null,
    "evidence_ms": null
   },
   "value": {
    "value": 48600,
    "confidence": 0.9,
    "span": null,
    "evidence_ms": null
   },
   "next_step": {
    "value": "Jordan to send the proposal and 30-seat agreement by 5pm for Dev and the managing partner to review and sign.",
    "confidence": 0.91,
    "span": 25,
    "evidence_ms": 362000
   },
   "promises": {
    "value": [
     "I will get a proposal in your inbox today",
     "I will send the proposal and 30-seat agreement by 5pm today"
    ],
    "confidence": 0.86,
    "span": 22,
    "evidence_ms": 311000
   }
  },
  "scorecard": {
   "discovery": 1,
   "nextStepSecured": true,
   "objection": "partial",
   "talkRatio": 0.64,
   "spans": {
    "discovery": 0,
    "nextStep": 25,
    "objection": 7
   }
  },
  "objections": [
   {
    "text": "Price is my first concern",
    "handling": "ignored"
   },
   {
    "text": "our current provider knows the practice and the partners trust them",
    "handling": "partial"
   }
  ],
  "icp": {
   "industry": "Accounting practice",
   "headcount_band": "25-80",
   "role": "CFO",
   "trigger": "Cyber insurance renewal requiring Essential Eight controls"
  },
  "riskFlags": [
   {
    "turn_index": 3,
    "text": "three firms on your street have already moved, and the onboarding price is gone Friday",
    "kind": "pressure"
   },
   {
    "turn_index": 5,
    "text": "I can guarantee Essential Eight compliance inside a week",
    "kind": "overclaim"
   },
   {
    "turn_index": 9,
    "text": "Your insurer will halve the premium once they see our report",
    "kind": "overclaim"
   },
   {
    "turn_index": 13,
    "text": "None of our clients has ever been breached",
    "kind": "unverifiable"
   },
   {
    "turn_index": 15,
    "text": "Your incumbent is about to lose their certification",
    "kind": "unverifiable"
   }
  ],
  "draft": {
   "subject": "Next steps for Marlowe & Finch Accounting",
   "body": "Hi Dev,\n\nThanks for the time today. As promised, i will get a proposal in your inbox today.\n\nNext step on our side: Jordan to send the proposal and 30-seat agreement by 5pm for Dev and the managing partner to review and sign.\n\nShout if anything in that needs changing.\n\nJordan"
  },
  "draftShort": {
   "subject": "Next steps for Marlowe & Finch Accounting",
   "body": "Hi Dev,\n\nJordan"
  }
 }
];
