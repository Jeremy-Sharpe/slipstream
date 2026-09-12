import type { CallRecord } from "@/lib/types/calls";

// Generated from fixtures/calls/*/{script,expected}.json — the thirteen
// Harbourline IT calls with diarised turns, extraction with confidence and
// source spans, scorecards, a follow-up draft and a timeline. Replaced by
// Supabase reads once the API lands; keep the shape.
export const calls: CallRecord[] = [
 {
  "id": "call-01-northstar-labs",
  "rep": "Sam Whitfield",
  "prospect": "Maya Chen",
  "company": "Northstar Labs",
  "domain": "northstarlabs.example",
  "at": "2026-08-31T09:15:00+10:00",
  "durationSeconds": 420,
  "outcome": "won",
  "trigger": "Cyber insurance renewal requiring Essential Eight controls",
  "summary": "Strong buying signal. Maya (Managing Partner, 42 staff) is dealing with cyber insurance renewal requiring essential eight controls.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Hi Maya, it's Sam from Harbourline IT. Thanks for making time, and just so I have the context right, are you Maya Chen from Northstar Labs in Southbank?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Yes, that's me. We're a lab planning and architecture practice, forty-two people now, mostly architects, project leads and admin. The call is timely because our cyber insurance renewal landed last week and it was more pointed than last year.",
    "at": 16
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What changed in the renewal pack that made this feel urgent?",
    "at": 38
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "They have asked us to show multi-factor coverage, backup testing, admin separation and some evidence around patching. Previously we just ticked a few boxes. This time the broker said the underwriter wants Essential Eight-style controls before they quote.",
    "at": 44
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How are you handling those controls today across Microsoft 365, laptops and project files?",
    "at": 65
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Patch management is half manual and half Intune, and nobody loves it. We've MFA for email but not every app. Project files are in SharePoint, but architects still sync big drawing folders locally because they travel to sites.",
    "at": 73
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who is responsible internally when something breaks or when the insurer asks for evidence?",
    "at": 94
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Our finance partner owns risk, our studio manager does the day-to-day chasing, and I make the final call. We've an ad hoc IT contractor who is lovely, but he isn't built for reporting or controls evidence.",
    "at": 102
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What would a good result look like by the time the insurer comes back for the final questionnaire?",
    "at": 122
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "I need to show that a sensible provider has reviewed us, closed the obvious gaps and can produce records. I don't expect magic in two weeks, but I want confidence that we're not guessing.",
    "at": 133
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where have staff felt the pain most, security paperwork, day-to-day support, or project file reliability?",
    "at": 152
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "The paperwork is the trigger, but support is the quiet frustration. New starters wait too long, password resets go to whichever admin is free, and site laptops get forgotten until they refuse to update during a deadline.",
    "at": 160
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That helps. Harbourline usually starts with a fixed onboarding project, then a managed services agreement at $135 per seat per month for a practice your size, with security reporting included.",
    "at": 181
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Our insurer is asking for Essential Eight evidence, and I am worried we will pay for a managed service but still fail the questionnaire. We have had vendors sell us a dashboard before and then leave us to explain it.",
    "at": 198
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is a fair concern. We would separate the promise into two parts: first the evidence you can use with the broker, then the ongoing support model. I will send the mapped Essential Eight gap summary by Thursday so you can see exactly what is covered and what remains your risk.",
    "at": 220
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "That would be useful. The finance partner will ask whether there's a large project fee on top, because the renewal and an office refit are hitting the same quarter.",
    "at": 249
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will include the onboarding sequence and the fixed project range. For Northstar Labs I would expect the project to sit around $8,000 to $11,000 unless the device audit uncovers something odd.",
    "at": 265
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "That's inside what I can approve with finance, provided the monthly number stays close to what you just said and the support response times are written down.",
    "at": 283
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Let us lock the next step while the renewal is warm. Can we meet Thursday 3 September at 2pm with you and the finance partner to review the proposal and the evidence pack?",
    "at": 298
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Yes, Thursday 3 September at 2pm works. Send the invite to me and I will forward it to Grace in finance. If the proposal matches this discussion, I'm comfortable moving ahead.",
    "at": 317
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "One practical thing I want to avoid is over-promising maturity in week one. We'd show the insurer what is already true, what we can close quickly, and what needs a dated remediation plan.",
    "at": 334
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "That language would help. The underwriter seems more interested in whether we know our gaps than whether we pretend to be perfect, and I'd rather be honest than scramble later.",
    "at": 353
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Exactly. We can also give your studio manager a simple evidence folder, so next year the renewal is a maintenance task rather than a panic.",
    "at": 369
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "That would be a relief. She is organised, but she is tired of chasing screenshots from three different systems whenever someone asks a security question.",
    "at": 384
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Great, I will send the invite, the gap summary and the commercial proposal by Thursday morning. Thanks Maya, this gives us enough to be precise.",
    "at": 398
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Thanks Sam. I appreciate that you did not jump straight to a bundle. Speak Thursday.",
    "at": 412
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Maya Chen",
     "confidence": 0.97,
     "span": 0
    },
    "role": {
     "value": "Managing Partner",
     "confidence": 0.88,
     "span": 7
    },
    "email": {
     "value": "maya@northstarlabs.example",
     "confidence": 0.86,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1101",
     "confidence": 0.88,
     "span": 18
    }
   },
   "company": {
    "name": {
     "value": "Northstar Labs",
     "confidence": 0.88,
     "span": 0
    },
    "industry": {
     "value": "Architecture and lab planning consultancy",
     "confidence": 0.88,
     "span": 1
    },
    "headcount": {
     "value": 42,
     "confidence": 0.95,
     "span": null
    },
    "location": {
     "value": "Southbank, VIC",
     "confidence": 0.86,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "closed_won",
     "confidence": 0.96,
     "span": 9
    },
    "valueAud": {
     "value": 58400,
     "confidence": 0.86,
     "span": null
    },
    "outcome": {
     "value": "won",
     "confidence": 0.93,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the mapped Essential Eight gap summary by Thursday",
     "confidence": 0.97,
     "span": 14
    },
    {
     "value": "I will include the onboarding sequence and the fixed project range",
     "confidence": 0.98,
     "span": 16
    }
   ],
   "objections": [
    {
     "text": "Our insurer is asking for Essential Eight evidence, and I am worried we will pay for a managed service but still fail the questionnaire",
     "handling": "handled",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Sam to send the Essential Eight gap summary and onboarding sequence, then meet Maya and the finance partner for proposal review.",
    "confidence": 0.92,
    "span": 14
   },
   "nextStepDue": "2026-09-03"
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 6,
    "span": 0
   },
   "nextStepSecured": {
    "value": true,
    "span": 14
   },
   "objectionHandling": {
    "value": "handled",
    "span": 13
   },
   "talkRatio": 0.44,
   "notes": "Sam uncovered the renewal trigger, mapped risk to a clear proposal and secured a dated review with the decision makers."
  },
  "icpSignals": {
   "industry": "Architecture and lab planning consultancy",
   "headcountBand": "25-80",
   "role": "Managing Partner",
   "trigger": "Cyber insurance renewal requiring Essential Eight controls"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Northstar Labs",
   "body": "Hi Maya,\n\nThanks for the time today.\nYou mentioned cyber insurance renewal requiring Essential Eight controls; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send the mapped essential eight gap summary by thursday\n- Include the onboarding sequence and the fixed project range\n\nNext step: Sam to send the Essential Eight gap summary and onboarding sequence, then meet Maya and the finance partner for proposal review.\n\nSam Whitfield"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-08-31T09:24:00+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-08-31T09:25:00+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-08-31T09:25:00+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-08-31T09:26:00+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-02-arcwell-health",
  "rep": "Sam Whitfield",
  "prospect": "Felix Morgan",
  "company": "Arcwell Health",
  "domain": "arcwellhealth.example",
  "at": "2026-09-01T14:30:00+10:00",
  "durationSeconds": 450,
  "outcome": "won",
  "trigger": "Phishing incident and follow-up cyber insurance conditions",
  "summary": "Strong buying signal. Felix (Operations Manager, 64 staff) is dealing with phishing incident and follow-up cyber insurance conditions.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Felix Morgan, Sam Whitfield from Harbourline IT. I have Arcwell Health as a two-site allied health group with you looking after operations, is that still right?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That's right. We've physios, occupational therapists, reception and a small finance team across Brunswick and Essendon. The reason I booked this is a phishing incident last month that rattled the directors.",
    "at": 16
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What happened in the phishing incident, and what did it expose about the current setup?",
    "at": 35
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "A receptionist approved a fake supplier bank change. We caught it before money moved, but the mailbox was compromised for a day. Our current IT person cleaned it up, but there was no proper incident note or training follow-up.",
    "at": 45
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How does support work between the two clinics when reception, clinicians and practice software are all busy?",
    "at": 69
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Honestly, everyone messages me first. Then I triage whether it's Best Practice, Xero, Microsoft 365 or the internet. It's workable until a Monday morning when both clinics have full books.",
    "at": 80
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who needs to be confident before Arcwell Health changes provider?",
    "at": 98
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "The clinical director, me, and one GP who sits on the board. The clinicians care about uptime and privacy. The board cares about insurance, audit trail and not paying for theatre.",
    "at": 105
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What would you want fixed in the first thirty days if we started?",
    "at": 124
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "MFA everywhere, a reliable joiner and leaver process, backup testing for shared drives and someone running security awareness without making staff feel silly. I'd also like one helpdesk number instead of five workarounds.",
    "at": 132
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where does the cyber insurance renewal sit in the calendar?",
    "at": 152
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "The broker wants updated answers by 18 September. They specifically asked about admin accounts, patching cadence and whether we can prove backups have been restored.",
    "at": 159
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For sixty-four staff, Harbourline would likely be $128 per seat per month, plus an onboarding project to clean identity, backups and device management before the insurer deadline.",
    "at": 174
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Data sovereignty is the thing our clinical director will ask about. We deal with patient information, and she will not accept a vague answer about where tickets or backups go.",
    "at": 191
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Good, she should ask. We keep Microsoft 365 data in your Australian tenant, document where backup metadata sits, and make any remote access auditable. I will send the incident-response checklist and onboarding proposal by Friday so she can see the detail.",
    "at": 210
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That would take heat out of the conversation. What about the rollout? We can't close both clinics or interrupt appointments.",
    "at": 235
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will include the two clinic rollout plan and the cyber insurance evidence register. The first week is discovery and identity controls, then we schedule endpoint work in reception gaps and after-hours windows.",
    "at": 248
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That sounds sensible. The price is higher than our current person, but I can justify it if the board sees risk reduction and not just support tickets.",
    "at": 268
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Can we book Friday 4 September at 11am for you, the clinical director and me to walk through the proposal before it goes to the board?",
    "at": 285
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Yes, Friday 4 September at 11am is good. Send me the invite and I will add Dr Patel. If the checklist answers her privacy questions, I think we will proceed.",
    "at": 301
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "On the clinical side, we'd keep the change visible but lightweight. Reception gets a single contact path, clinicians get clear timing for MFA changes, and the board gets evidence without needing to read technical logs.",
    "at": 320
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That balance matters. If clinicians feel the security work is being done to them rather than with them, I will spend a month smoothing frustration instead of running the clinics.",
    "at": 342
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "We can make the first staff message plain: why the changes are happening, what will change this week, and where to get help if a login prompt appears before an appointment.",
    "at": 360
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Good. The phishing incident embarrassed people, and I don't want training that sounds like a lecture. A practical tone will land much better.",
    "at": 380
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will also note that the board can start with the insurance evidence and then decide whether any deeper maturity work waits until after the renewal.",
    "at": 394
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That's sensible. They will approve urgent controls quickly, but anything that smells like a giant transformation will get pushed into a later meeting.",
    "at": 410
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Perfect. I will send the invite, proposal and checklist by Thursday afternoon so you've time to read it before Friday.",
    "at": 424
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Thanks Sam. This is the first call where I have felt someone understood the clinic constraints, not only the security words.",
    "at": 437
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Felix Morgan",
     "confidence": 0.87,
     "span": 0
    },
    "role": {
     "value": "Operations Manager",
     "confidence": 0.94,
     "span": 0
    },
    "email": {
     "value": "felix@arcwellhealth.example",
     "confidence": 0.89,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1102",
     "confidence": 0.93,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Arcwell Health",
     "confidence": 0.89,
     "span": 0
    },
    "industry": {
     "value": "Multi-site allied health clinic",
     "confidence": 0.92,
     "span": 0
    },
    "headcount": {
     "value": 64,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Brunswick and Essendon, VIC",
     "confidence": 0.91,
     "span": 1
    }
   },
   "deal": {
    "stage": {
     "value": "closed_won",
     "confidence": 0.9,
     "span": null
    },
    "valueAud": {
     "value": 103600,
     "confidence": 0.88,
     "span": null
    },
    "outcome": {
     "value": "won",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the incident-response checklist and onboarding proposal by Friday",
     "confidence": 0.97,
     "span": 14
    },
    {
     "value": "I will include the two clinic rollout plan and the cyber insurance evidence register",
     "confidence": 0.94,
     "span": 16
    }
   ],
   "objections": [
    {
     "text": "Data sovereignty is the thing our clinical director will ask about",
     "handling": "handled",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Sam to send proposal and meet Felix plus clinical director for rollout approval.",
    "confidence": 0.93,
    "span": 18
   },
   "nextStepDue": "2026-09-04"
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 4,
    "span": 0
   },
   "nextStepSecured": {
    "value": true,
    "span": 18
   },
   "objectionHandling": {
    "value": "handled",
    "span": 13
   },
   "talkRatio": 0.46,
   "notes": "Sam connected a recent phishing incident to clinic operations, answered the sovereignty concern and agreed a dated proposal review."
  },
  "icpSignals": {
   "industry": "Multi-site allied health clinic",
   "headcountBand": "25-80",
   "role": "Operations Manager",
   "trigger": "Phishing incident and follow-up cyber insurance conditions"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Arcwell Health",
   "body": "Hi Felix,\n\nThanks for the time today.\nYou mentioned phishing incident and follow-up cyber insurance conditions; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send the incident-response checklist and onboarding proposal by friday\n- Include the two clinic rollout plan and the cyber insurance evidence register\n\nNext step: Sam to send proposal and meet Felix plus clinical director for rollout approval.\n\nSam Whitfield"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-01T14:39:30+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-01T14:40:30+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-01T14:40:30+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-01T14:41:30+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-03-afterglow-studio",
  "rep": "Jordan Lee",
  "prospect": "Priya Shah",
  "company": "Afterglow Studio",
  "domain": "afterglowstudio.example",
  "at": "2026-09-02T10:00:00+10:00",
  "durationSeconds": 390,
  "outcome": "lost",
  "trigger": null,
  "summary": "Not a fit right now. Priya (Founder, 12 staff) is dealing with an it review.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Hi Priya Shah, Jordan from Harbourline IT. Great to speak with Afterglow Studio. We help Melbourne firms move from ad hoc IT to a proper managed service, and our standard package is $120 per seat per month.",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Hi Jordan. We're only twelve people, so I was mostly curious. Our computers are fine most weeks, and we use a local break-fix person when something annoying happens.",
    "at": 17
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That's exactly where managed services helps, because waiting for things to break costs time. With us you get helpdesk, Microsoft 365 admin, patching, endpoint security, backup checks and quarterly reviews, all wrapped into one predictable monthly number.",
    "at": 29
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "We are probably too small for a monthly managed service. The designers are on Macs, the account team uses Google Workspace, and there is not much infrastructure.",
    "at": 46
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Small teams actually need it more because there's no internal IT person. Harbourline IT can bring the same structure bigger firms have, and it means you're not relying on whoever is least busy to fix a printer or password issue.",
    "at": 58
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "The printer bit's real, but it's not painful enough to spend a lot. We might have two support issues a month, maybe three when freelancers are in.",
    "at": 76
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The bigger risk isn't the ticket count, it's the security baseline. Cyber insurance and client questionnaires are getting stricter, so having managed endpoint protection and patch records makes you look professional when a client asks.",
    "at": 88
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Most of our clients are hospitality and lifestyle brands. They care about creative work. Nobody has sent us a security questionnaire, and if they did, I'd probably just answer it myself.",
    "at": 104
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "We also include onboarding, so we'd clean up user accounts, make sure everyone has MFA, standardise devices and document your apps. For a team like Afterglow Studio, that project could be $4,000 to $6,000 depending on what we find.",
    "at": 118
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "That is more than double what we pay now. Our current guy charges when we need him, and some months we pay nothing at all.",
    "at": 135
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Right, but the monthly fee buys peace of mind. If a laptop is stolen or someone clicks a bad link, you've a team ready. Break-fix is cheaper until the one day it's not.",
    "at": 146
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "I understand the argument, but there's not a burning problem. We're watching costs this quarter, and I don't want another subscription unless it removes a daily headache.",
    "at": 161
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The daily headache can be hidden, though. Designers losing twenty minutes here and there adds up, and with a managed agreement you can send everything through one channel instead of interrupting each other.",
    "at": 173
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Maybe, but I'd need to see a very small plan. I'm not going to take a twelve-seat studio into a corporate IT package because it sounds responsible.",
    "at": 188
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Our minimum managed plan is still designed around the full stack, because partial coverage creates gaps. We can start with the baseline and then add anything specific later.",
    "at": 200
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "That's probably not for us then. I was hoping there might be a light-touch option or an annual check-up.",
    "at": 213
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will send some info this afternoon. It will explain the service inclusions, the onboarding project and why proactive support tends to be better value over a year.",
    "at": 221
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "You can send it, but I don't want to waste your time. Unless the price is much closer to what we pay casually, I can't see us moving.",
    "at": 234
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The reason I'm pushing the managed option is that creative studios often underestimate the cost of interruption. If a designer loses files before a client presentation, the impact isn't just an IT invoice, it's reputation and rework.",
    "at": 246
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "I hear that, but our files are backed up in the design tools and we've not had that kind of incident.",
    "at": 263
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "You would also get a proper onboarding audit. We'd review admin accounts, device health, domains, password sharing, MFA and whether freelancers still have access after a project finishes.",
    "at": 272
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Those are real things, but they aren't things I'm ready to put a monthly contract around.",
    "at": 285
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "If budget is the blocker, I can still show the cost over twelve months compared with reactive work and staff downtime. Sometimes the managed plan comes out closer than it first appears.",
    "at": 292
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Maybe for another studio. For us, the cash cost is obvious and the downtime cost is still theoretical.",
    "at": 307
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The overview will also show the security baseline we recommend for even a small studio: MFA, device encryption, admin account separation, backup confirmation and a simple incident contact path. That gives you a benchmark, even if you choose not to move now.",
    "at": 315
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "A benchmark is fine. I just don't want the benchmark to turn into pressure to buy something we've already said is too heavy.",
    "at": 333
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The thing I'd be careful of is waiting until the first serious client requirement appears. By then you're trying to write policies, clean accounts, find device records and reassure a client at the same time. The managed plan keeps all of that ready before anyone asks, and it gives you a professional answer rather than a scramble.",
    "at": 344
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "I understand, but that still feels like buying ahead of a problem.",
    "at": 369
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Understood. I will send the overview and you can come back if anything changes or if a client asks for security evidence.",
    "at": 375
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Thanks Jordan. I appreciate the call, but it's a no for now.",
    "at": 385
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Priya Shah",
     "confidence": 0.87,
     "span": 0
    },
    "role": {
     "value": "Founder",
     "confidence": 0.91,
     "span": null
    },
    "email": {
     "value": "priya@afterglowstudio.example",
     "confidence": 0.91,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1103",
     "confidence": 0.88,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Afterglow Studio",
     "confidence": 0.89,
     "span": 0
    },
    "industry": {
     "value": "Creative branding studio",
     "confidence": 0.92,
     "span": 0
    },
    "headcount": {
     "value": 12,
     "confidence": 0.91,
     "span": 0
    },
    "location": {
     "value": "Collingwood, VIC",
     "confidence": 0.95,
     "span": null
    }
   },
   "deal": {
    "stage": {
     "value": "closed_lost",
     "confidence": 0.97,
     "span": null
    },
    "valueAud": {
     "value": 15400,
     "confidence": 0.94,
     "span": null
    },
    "outcome": {
     "value": "lost",
     "confidence": 0.9,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send some info this afternoon",
     "confidence": 0.97,
     "span": 16
    }
   ],
   "objections": [
    {
     "text": "We are probably too small for a monthly managed service",
     "handling": "ignored",
     "span": 3
    },
    {
     "text": "That is more than double what we pay now",
     "handling": "ignored",
     "span": 9
    }
   ],
   "nextStep": null,
   "nextStepDue": null
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 0,
    "span": null
   },
   "nextStepSecured": {
    "value": false,
    "span": null
   },
   "objectionHandling": {
    "value": "ignored",
    "span": 3
   },
   "talkRatio": 0.61,
   "notes": "Jordan pitched the managed service before understanding the studio, ignored the size and price objections and left with no next step."
  },
  "icpSignals": {
   "industry": "Creative branding studio",
   "headcountBand": "under-15",
   "role": "Founder",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Leaving the door open — Afterglow Studio",
   "body": "Hi Priya,\n\nThanks for being straight with me today. It sounds like the current setup is working for you, so I won't push.\n\nIf anything changes — an insurer asking for evidence, or a bad week with the computers — send me a note and I'll pick it up from here.\n\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-02T10:08:30+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-02T10:09:30+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-02T10:09:30+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-02T10:10:30+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-04-kite-and-co",
  "rep": "Sam Whitfield",
  "prospect": "Daniel Ortiz",
  "company": "Kite & Co",
  "domain": "kiteandco.example",
  "at": "2026-09-02T16:00:00+10:00",
  "durationSeconds": 430,
  "outcome": "stalled",
  "trigger": "Procurement security questionnaire before panel appointment",
  "summary": "Interest is real, timing is not. Daniel (Operations Lead, 95 staff) is dealing with procurement security questionnaire before panel appointment.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Daniel, thanks for joining. I have you as Daniel Ortiz, operations lead at Kite & Co, a commercial law firm in the CBD. What prompted the conversation with Harbourline IT?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That's right. We're reviewing our panel of suppliers after a procurement refresh. IT support is bundled into that, partly because our partners have started asking for clearer security reporting.",
    "at": 18
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What does the partner group want to see that they aren't getting today?",
    "at": 35
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "They want fewer surprises. When a barrister can't access a brief or a senior associate is locked out before court, it becomes an operational incident. The current provider fixes things eventually, but there's no rhythm or account management.",
    "at": 42
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How are your systems set up across document management, Microsoft 365 and remote access?",
    "at": 65
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "We're on Microsoft 365, Xero for finance, and a cloud document platform for matters. Remote access is mostly browser based, but some partners still have old habits around local files and personal devices.",
    "at": 73
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who will decide whether a new provider is worth moving to?",
    "at": 92
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "The managing partner signs off, the finance director checks the numbers, and procurement controls the process. I can recommend a shortlist, but I can't award it on this call.",
    "at": 99
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What would make you confident enough to recommend Harbourline IT for that shortlist?",
    "at": 116
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "I need evidence that you understand confidentiality, response times and change management. We're ninety-five staff, but partner influence makes us feel larger. A botched migration would be painful politically.",
    "at": 124
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where are the current risks most visible day to day?",
    "at": 141
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Joiners and leavers are messy, shared mailboxes are inconsistent, and procurement keeps asking me for supplier documents I have to chase. There's also a cyber insurance renewal in November, but it's not the only driver.",
    "at": 146
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "At that size, the managed services agreement would normally sit around $140 per seat per month, with a scoped onboarding project for identity, device management and documentation.",
    "at": 167
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Procurement will not let us progress without the full questionnaire and insurance certificates. They will ask about data handling, subcontractors, incident response and professional indemnity before a partner even reads the proposal.",
    "at": 183
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That makes sense. I can answer the supplier side and show our standard controls, although some items depend on the final scope. I will send the security pack and a sample service schedule so you can test whether procurement is comfortable.",
    "at": 202
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That would help, but it may disappear into the vendor portal for a while. Our procurement manager is methodical and the managing partner is away until the week after next.",
    "at": 226
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Would it be useful to pencil a review with the managing partner when he is back?",
    "at": 244
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Possibly, but I don't want to put a date in before procurement accepts the documents. If they bounce the questionnaire, the partner call would be premature.",
    "at": 253
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Understood. I will send the pack and service schedule today, and you can tell me what procurement comes back with.",
    "at": 268
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Yes, send it through. I'm interested, but I need the process to move first. Once procurement clears the basics, we can talk about who joins the next call.",
    "at": 280
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "The sample service schedule will spell out response targets, account review cadence and what evidence is produced monthly. That way procurement can compare more than hourly rates.",
    "at": 296
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That will be useful. They tend to reduce vendors to a spreadsheet, and IT support is hard to compare unless the service boundaries are explicit.",
    "at": 312
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "If procurement wants clarification, I can answer in writing or join a short call with them before the partner group spends time on it.",
    "at": 327
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Possibly. I need to see how they react first. They can be quite strict about keeping suppliers out until the formal shortlist is set.",
    "at": 341
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "No problem. I will make the pack self-contained, including our insurance certificates, data handling summary and a plain-English incident response outline.",
    "at": 355
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That gives me a decent chance of getting it through the first gate. After that the internal politics are the bigger unknown.",
    "at": 368
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will also avoid assuming the current provider has done nothing. The comparison should be about service evidence and accountability, not throwing stones at people who may have been operating under a loose brief.",
    "at": 381
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That tone will help. The partners dislike vendor drama, and the incumbent still supports us while this process runs.",
    "at": 401
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Thanks Daniel. I will keep it concise and label the parts procurement usually wants first.",
    "at": 412
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Appreciated. That will make my life easier even if the timetable isn't completely in my hands.",
    "at": 421
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Daniel Ortiz",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "Operations Lead",
     "confidence": 0.92,
     "span": 0
    },
    "email": {
     "value": "daniel@kiteandco.example",
     "confidence": 0.95,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1104",
     "confidence": 0.86,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Kite & Co",
     "confidence": 0.86,
     "span": 0
    },
    "industry": {
     "value": "Commercial law firm",
     "confidence": 0.87,
     "span": 0
    },
    "headcount": {
     "value": 95,
     "confidence": 0.97,
     "span": null
    },
    "location": {
     "value": "Melbourne CBD, VIC",
     "confidence": 0.95,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "evaluation",
     "confidence": 0.95,
     "span": null
    },
    "valueAud": {
     "value": 132000,
     "confidence": 0.87,
     "span": null
    },
    "outcome": {
     "value": "stalled",
     "confidence": 0.87,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the security pack and a sample service schedule",
     "confidence": 0.98,
     "span": 14
    }
   ],
   "objections": [
    {
     "text": "Procurement will not let us progress without the full questionnaire and insurance certificates",
     "handling": "partial",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Sam to send security pack and sample service schedule for Daniel to circulate.",
    "confidence": 0.88,
    "span": 14
   },
   "nextStepDue": null
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 6,
    "span": 0
   },
   "nextStepSecured": {
    "value": false,
    "span": 14
   },
   "objectionHandling": {
    "value": "partial",
    "span": 13
   },
   "talkRatio": 0.43,
   "notes": "The firm had a real procurement trigger, but the managing partner was absent and the next step stayed vague."
  },
  "icpSignals": {
   "industry": "Commercial law firm",
   "headcountBand": "81-120",
   "role": "Operations Lead",
   "trigger": "Procurement security questionnaire before panel appointment"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Following up — Kite & Co",
   "body": "Hi Daniel,\n\nThanks for the time today.\nYou mentioned procurement security questionnaire before panel appointment; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send the security pack and a sample service schedule\n\nNext step: Sam to send security pack and sample service schedule for Daniel to circulate.\n\nNo rush on your side; when the timing is clearer I'm happy to walk the directors through it.\n\nSam Whitfield"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-02T16:09:10+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-02T16:10:10+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-02T16:10:10+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-02T16:11:10+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-05-craftwork",
  "rep": "Jordan Lee",
  "prospect": "Lucy Beck",
  "company": "Craftwork",
  "domain": "craftwork.example",
  "at": "2026-09-03T11:30:00+10:00",
  "durationSeconds": 360,
  "outcome": "lost",
  "trigger": null,
  "summary": "Not a fit right now. Lucy (Owner, 8 staff) is dealing with an it review.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Hi Lucy Beck, Jordan Lee from Harbourline IT. Thanks for speaking with me about Craftwork. Our managed services plan starts at $95 per seat per month and gives small teams a proper IT helpdesk, security stack and regular maintenance.",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Hi Jordan. I should say upfront we're a small shop in Northcote with eight people, some casual. We run workshops, sell online a bit, and mainly need the till and Wi-Fi to behave.",
    "at": 17
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That's exactly why a managed agreement is helpful. Retail downtime is expensive, and a predictable monthly fee means you can call us instead of trying to work out whether the issue is Shopify, Xero, the router or a laptop.",
    "at": 31
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "My cousin helps us for cheap when the till or Wi-Fi plays up. He knows our setup, and most of the time he can pop in after work or talk me through it.",
    "at": 48
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Family help is common, but it usually has gaps. If there's a ransomware issue, a lost laptop, or a staff member leaving with access, you want proper offboarding, endpoint protection and backup checks instead of favours.",
    "at": 62
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "I get that, but we're not a law firm. We've a handful of iPads, a point-of-sale machine, two laptops and some craft teachers who use their own devices.",
    "at": 78
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The package would still cover those devices, plus Microsoft 365 or Google Workspace, password policy, domain security, and quarterly reports. For Craftwork, onboarding would likely be around $3,500, which gets the environment documented.",
    "at": 90
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "That would be a lot for us. Some weeks we're watching every invoice, especially outside school holiday workshop periods.",
    "at": 104
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The way I'd think about it's risk smoothing. Instead of a surprise emergency bill and lost trading time, you pay a smaller monthly amount and know the basics are covered by a team.",
    "at": 112
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "But our surprise emergency bills have been pretty small. The last one was a new router, and my cousin charged us a slab and the parts.",
    "at": 126
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That works until the problem isn't a router. Cyber insurance, payment security and customer data expectations are increasing, and a managed provider helps show you're taking reasonable steps.",
    "at": 138
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "We don't have cyber insurance, and nobody has asked us about Essential Eight. I mostly answered your email because I wondered if there was an affordable health check.",
    "at": 150
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "We can do health checks, but Harbourline IT's really set up for ongoing managed services. A one-off check without ongoing support can find problems and then leave you with no one accountable for fixing them.",
    "at": 162
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Then I think we're not your customer right now. I'm not saying never, but it's hard to justify before there's a real trigger.",
    "at": 177
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will send a one-page managed services overview. It will show what is included and give you something to keep on file if you decide to professionalise support later.",
    "at": 187
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Sure, send it, but please don't put me into a heavy follow-up sequence. I know the answer for this quarter.",
    "at": 199
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The managed service also gives you continuity when staff change. Casual retail teams can end up with shared passwords, old accounts and nobody quite sure who has access to the online store.",
    "at": 208
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "We do have some messy passwords, but I can fix that with a password manager without signing up to a whole IT service.",
    "at": 222
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "A password manager is a good start, but it's still only one piece. We'd also look at MFA, device updates, DNS records, backups, user permissions and support documentation.",
    "at": 232
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "That sounds thorough, just bigger than the problem I have.",
    "at": 244
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I understand the scale concern, but a lot of small shops only call us after an avoidable issue has already cost them a weekend. I'd rather help before it becomes urgent.",
    "at": 248
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "And I'd rather wait until there's something urgent enough to justify it.",
    "at": 261
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Fair enough. Keep the overview somewhere handy, because if you open a second store or start handling more online orders, the maths changes quickly.",
    "at": 266
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "If we open a second store, I will probably call. Right now we're trying to make this one smoother.",
    "at": 277
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The one-page overview will be practical rather than glossy. I will include the minimum controls, the support inclusions, the onboarding assumptions and the reasons we usually avoid tiny retainers that can't be properly accountable.",
    "at": 285
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Okay. I will read it with that frame, but I'm still expecting it to be more than we need.",
    "at": 300
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I'd still encourage you to compare the annual cost against the risk of a bad trading day, because a Saturday outage or compromised mailbox can be more expensive than it feels when everything is calm. The managed plan is meant to remove that uncertainty.",
    "at": 308
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "I hear you, but calm is where we're.",
    "at": 327
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Even if you don't choose us, I'd make sure the hourly provider can name who owns backups, account removal, MFA and support response during trading hours, because those are the areas that usually fall between casual arrangements.",
    "at": 330
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "I can ask them that.",
    "at": 346
   },
   {
    "index": 30,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "No problem. I will send the overview and check back down the track.",
    "at": 348
   },
   {
    "index": 31,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Thanks Jordan. Good luck with it, but for now we will stay as we're.",
    "at": 354
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Lucy Beck",
     "confidence": 0.91,
     "span": 0
    },
    "role": {
     "value": "Owner",
     "confidence": 0.93,
     "span": null
    },
    "email": {
     "value": "lucy@craftwork.example",
     "confidence": 0.9,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1105",
     "confidence": 0.88,
     "span": 6
    }
   },
   "company": {
    "name": {
     "value": "Craftwork",
     "confidence": 0.93,
     "span": 0
    },
    "industry": {
     "value": "Independent craft retail and workshops",
     "confidence": 0.94,
     "span": 1
    },
    "headcount": {
     "value": 8,
     "confidence": 0.86,
     "span": null
    },
    "location": {
     "value": "Northcote, VIC",
     "confidence": 0.97,
     "span": 1
    }
   },
   "deal": {
    "stage": {
     "value": "closed_lost",
     "confidence": 0.86,
     "span": 4
    },
    "valueAud": {
     "value": 9800,
     "confidence": 0.93,
     "span": null
    },
    "outcome": {
     "value": "lost",
     "confidence": 0.89,
     "span": 4
    }
   },
   "promises": [
    {
     "value": "I will send a one-page managed services overview",
     "confidence": 0.9,
     "span": 14
    }
   ],
   "objections": [
    {
     "text": "My cousin helps us for cheap when the till or Wi-Fi plays up",
     "handling": "ignored",
     "span": 3
    }
   ],
   "nextStep": null,
   "nextStepDue": null
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 0,
    "span": null
   },
   "nextStepSecured": {
    "value": false,
    "span": null
   },
   "objectionHandling": {
    "value": "ignored",
    "span": 3
   },
   "talkRatio": 0.61,
   "notes": "Jordan treated a tiny retail shop like a managed services prospect and did not adapt when Lucy named the cheap informal alternative."
  },
  "icpSignals": {
   "industry": "Independent craft retail and workshops",
   "headcountBand": "under-15",
   "role": "Owner",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Leaving the door open — Craftwork",
   "body": "Hi Lucy,\n\nThanks for being straight with me today. It sounds like the current setup is working for you, so I won't push.\n\nIf anything changes — an insurer asking for evidence, or a bad week with the computers — send me a note and I'll pick it up from here.\n\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-03T11:38:00+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-03T11:39:00+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-03T11:39:00+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-03T11:40:00+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-06-meridian-ai",
  "rep": "Jordan Lee",
  "prospect": "Tom Reid",
  "company": "Meridian AI",
  "domain": "meridianai.example",
  "at": "2026-09-04T15:15:00+10:00",
  "durationSeconds": 440,
  "outcome": "stalled",
  "trigger": "Microsoft 365 migration under consideration for next financial year",
  "summary": "Interest is real, timing is not. Tom (Head of Engineering, 118 staff) is dealing with microsoft 365 migration under consideration for next financial year.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Tom Reid, it's Jordan from Harbourline IT. I know Meridian AI has grown quickly in Richmond. What made you take a call about managed IT now?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "We're at one hundred and eighteen people and the tooling is catching up with us. Engineering is fine, but the rest of the company is spread across Google Workspace, Microsoft 365 trials, a few SaaS admin accounts and a lot of tribal knowledge.",
    "at": 16
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Where is that mess causing the most friction today?",
    "at": 42
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Onboarding and access reviews. New starters get a laptop quickly, but permissions depend on which team lead remembered which checklist. Finance also wants more predictable support, because engineers are tired of being unofficial helpdesk.",
    "at": 48
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Who owns the decision if you move from the current hybrid setup to a cleaner Microsoft 365 environment?",
    "at": 69
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "I can recommend the technical approach, but finance owns budget and the COO owns timing. Neither is on this call. I'm gathering options before next year planning.",
    "at": 80
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Harbourline can run the migration, then support everyone under a managed services agreement. For a company at your size, the monthly fee would likely land around $145 per seat, with a project for tenant design, identity and device management.",
    "at": 96
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Budget sits with finance next financial year, not with me this month. I do not want a proposal that assumes authority I do not have.",
    "at": 120
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Totally, although it's helpful to get a number in front of people early. If finance sees the risk and productivity case, they can make room before the planning cycle closes.",
    "at": 136
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Maybe. My bigger concern is whether an external provider can work with engineers without slowing us down. We've unusual device needs, Linux boxes, lab environments and a strong preference for not being locked down blindly.",
    "at": 154
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "We're flexible. We can segment engineering and corporate users, apply different policies and still keep reporting clean. The important thing is having a central support channel and clear admin ownership.",
    "at": 176
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "That sounds plausible, but I'd need our platform lead in the detail. Also, this isn't urgent in September. It's a next financial year budget conversation unless something breaks.",
    "at": 194
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Understood. We've done Microsoft 365 migrations where engineering teams keep the workflows they need while the rest of the business gets structure. I can show examples in a deck.",
    "at": 211
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Examples would be fine, but decks have a way of floating around Slack and dying. If there's a specific workshop later, I can bring finance and platform.",
    "at": 229
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Let me send a capability deck and a rough migration outline. You can share it with finance and the COO, and then we can see whether a workshop makes sense.",
    "at": 246
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Okay, send it through. I'm not promising a workshop yet. I need to see if the business wants to do anything before November.",
    "at": 264
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That's fair. I will also include an indicative timeline and the questions we'd need answered before pricing the onboarding project.",
    "at": 278
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Good. Keep it brief, please. If it's twenty pages, nobody here will read it.",
    "at": 291
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "One option is a discovery workshop rather than a full proposal. We could map users, systems, admin ownership and migration risks, then give finance a budget range for next year.",
    "at": 299
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "That sounds closer to what we need, but I still need the COO to agree it's worth a workshop. We've a lot of competing planning work.",
    "at": 318
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will frame the outline as a decision brief rather than a sales proposal, with the risks of doing nothing, a staged migration path and the questions finance should answer.",
    "at": 334
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "That would travel better internally. People here react badly to vendor language, but a decision brief with open questions could get read.",
    "at": 352
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "If the brief gets traction, the best next call would include finance, the COO and your platform lead so we can separate commercial timing from technical concerns.",
    "at": 366
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Agreed. Without those people, we'd just have another interesting conversation that doesn't move anything.",
    "at": 382
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will keep the brief anchored to your growth problem rather than pretending this is an emergency. The question is whether the current informal support model can survive another hiring cycle.",
    "at": 391
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "That's the right question. We can survive this month, but another burst of hiring would expose the access and onboarding problems again.",
    "at": 410
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will keep it to the essentials and follow up after you've had a chance to circulate it.",
    "at": 423
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Thanks Jordan. There's interest, just no firm path yet.",
    "at": 434
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Tom Reid",
     "confidence": 0.97,
     "span": 0
    },
    "role": {
     "value": "Head of Engineering",
     "confidence": 0.88,
     "span": 1
    },
    "email": {
     "value": "tom@meridianai.example",
     "confidence": 0.89,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1106",
     "confidence": 0.95,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Meridian AI",
     "confidence": 0.9,
     "span": 0
    },
    "industry": {
     "value": "AI software company",
     "confidence": 0.93,
     "span": 0
    },
    "headcount": {
     "value": 118,
     "confidence": 0.95,
     "span": null
    },
    "location": {
     "value": "Richmond, VIC",
     "confidence": 0.92,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "discovery",
     "confidence": 0.92,
     "span": 18
    },
    "valueAud": {
     "value": 174000,
     "confidence": 0.86,
     "span": null
    },
    "outcome": {
     "value": "stalled",
     "confidence": 0.97,
     "span": null
    }
   },
   "promises": [
    {
     "value": "Let me send a capability deck and a rough migration outline",
     "confidence": 0.88,
     "span": 14
    }
   ],
   "objections": [
    {
     "text": "Budget sits with finance next financial year, not with me this month",
     "handling": "partial",
     "span": 7
    }
   ],
   "nextStep": {
    "value": "Jordan to send capability deck and rough migration outline for Tom to share internally.",
    "confidence": 0.89,
    "span": 14
   },
   "nextStepDue": null
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 3,
    "span": 0
   },
   "nextStepSecured": {
    "value": false,
    "span": 14
   },
   "objectionHandling": {
    "value": "partial",
    "span": 7
   },
   "talkRatio": 0.51,
   "notes": "There was real migration interest, but Jordan pitched too broadly and accepted a vague internal share instead of reaching finance."
  },
  "icpSignals": {
   "industry": "AI software company",
   "headcountBand": "81-120",
   "role": "Head of Engineering",
   "trigger": "Microsoft 365 migration under consideration for next financial year"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Following up — Meridian AI",
   "body": "Hi Tom,\n\nThanks for the time today.\nYou mentioned microsoft 365 migration under consideration for next financial year; that's the part I'd focus on first.\n\nWhat I owe you:\n- Let me send a capability deck and a rough migration outline\n\nNext step: Jordan to send capability deck and rough migration outline for Tom to share internally.\n\nNo rush on your side; when the timing is clearer I'm happy to walk the directors through it.\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-04T15:24:20+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-04T15:25:20+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-04T15:25:20+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-04T15:26:20+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-07-wattle-street-legal",
  "rep": "Sam Whitfield",
  "prospect": "Olivia Hart",
  "company": "Wattle Street Legal",
  "domain": "wattlestreetlegal.example",
  "at": "2026-09-07T09:45:00+10:00",
  "durationSeconds": 445,
  "outcome": "won",
  "trigger": "Outgoing internal IT coordinator leaving in three weeks",
  "summary": "Strong buying signal. Olivia (Practice Manager, 37 staff) is dealing with outgoing internal it coordinator leaving in three weeks.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Olivia Hart, Sam from Harbourline IT. Before we get into options, are you still the practice manager at Wattle Street Legal in Hawthorn?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Yes. We're thirty-seven people, mostly solicitors, paralegals and admin. I booked the call because our internal IT coordinator resigned and leaves in three weeks.",
    "at": 14
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What does that coordinator currently hold in their head that worries you most?",
    "at": 29
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Almost everything. They know the document system quirks, which partners have unusual setups, how court filing certificates work, and which laptops are overdue for replacement. Some of it's written down, but not enough.",
    "at": 37
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How are support requests handled now when solicitors are under deadline pressure?",
    "at": 57
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "People walk to the coordinator or message me. It works because they are here, but it's not scalable. Family law deadlines are emotional, and a locked account before a filing deadline becomes my problem fast.",
    "at": 65
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who needs to approve a managed services agreement before the coordinator leaves?",
    "at": 86
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "The principal solicitor and I can approve if the numbers are sensible. Finance will check cash flow, but this is an operational risk we can't leave open.",
    "at": 94
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What must be stable in the first month for you to feel the transition worked?",
    "at": 110
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Helpdesk coverage, leavers and joiners, backups, certificates for court systems, and someone documenting our Microsoft 365 admin settings. I also need staff to know who to call on day one.",
    "at": 119
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What is your current risk around cyber insurance or client confidentiality questionnaires?",
    "at": 138
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Insurers asked about MFA and backups last year. We answered, but it was informal. The principal wants something more defensible this year, especially because we handle sensitive family matters.",
    "at": 145
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For Wattle Street Legal, the managed service would be about $132 per seat per month, with a transition project focused on documentation, identity, backups and support handover.",
    "at": 163
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "I am nervous about changing provider while our internal IT coordinator is leaving. If the handover is clumsy, everyone will blame me for breaking something that mostly works.",
    "at": 180
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is completely reasonable. I would not suggest a big-bang change. We would run a two-week shadow handover with your coordinator, document the critical systems first and only then switch the helpdesk number. I will send the transition plan and fixed onboarding quote by Tuesday.",
    "at": 197
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "A shadow handover would calm people down. The principal will ask whether you can handle after-hours work, because file migrations during business hours aren't acceptable.",
    "at": 225
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will include the leaver checklist and after-hours file migration window. We can also give staff a simple support card so they know the new process before the coordinator leaves.",
    "at": 240
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Good. The monthly fee isn't the cheapest option, but the timing means I care more about a controlled handover than saving a few dollars per seat.",
    "at": 259
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Can we review the plan Tuesday 8 September at 10am with you and the principal solicitor? If that works, we can start the discovery checklist the next morning.",
    "at": 275
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Yes, Tuesday 8 September at 10am works. Send the invite and the plan before close of business Monday if you can.",
    "at": 292
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I'd also like to interview your coordinator before they leave, not just collect passwords. The unwritten history is often where the real transition risk lives.",
    "at": 305
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Yes, please. They are helpful and will share what they know, but I need someone to ask the right questions while they are still here.",
    "at": 320
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "We will prioritise court-system certificates, document access, admin rights and backup restore evidence before any cosmetic tidy-up. The goal is continuity first, then maturity.",
    "at": 335
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "That order makes sense. Staff will forgive a slightly clunky portal before they forgive being unable to file documents or open matters.",
    "at": 350
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For communication, we can draft a simple internal note from you explaining the support change, the reason for it and exactly what staff should do from the first day.",
    "at": 364
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "That would save me time. People get nervous when support changes, especially the partners who have had the same habits for years.",
    "at": 382
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "We can start the handover with a short risk register as well, so you can show the principal what is critical, what is inconvenient and what can wait until after the coordinator leaves.",
    "at": 395
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "That will make the approval conversation cleaner. The principal is practical, but she hates open-ended projects with no sense of priority.",
    "at": 415
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Done. I will send the invite now, then the transition plan and fixed quote by Monday afternoon.",
    "at": 428
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Thanks Sam. This feels practical, which is what I needed.",
    "at": 439
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Olivia Hart",
     "confidence": 0.89,
     "span": 0
    },
    "role": {
     "value": "Practice Manager",
     "confidence": 0.88,
     "span": 0
    },
    "email": {
     "value": "olivia@wattlestreetlegal.example",
     "confidence": 0.91,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1107",
     "confidence": 0.92,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Wattle Street Legal",
     "confidence": 0.86,
     "span": 0
    },
    "industry": {
     "value": "Family law firm",
     "confidence": 0.98,
     "span": 5
    },
    "headcount": {
     "value": 37,
     "confidence": 0.98,
     "span": null
    },
    "location": {
     "value": "Hawthorn, VIC",
     "confidence": 0.96,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "closed_won",
     "confidence": 0.89,
     "span": null
    },
    "valueAud": {
     "value": 59600,
     "confidence": 0.96,
     "span": null
    },
    "outcome": {
     "value": "won",
     "confidence": 0.98,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the transition plan and fixed onboarding quote by Tuesday",
     "confidence": 0.87,
     "span": 14
    },
    {
     "value": "I will include the leaver checklist and after-hours file migration window",
     "confidence": 0.95,
     "span": 16
    }
   ],
   "objections": [
    {
     "text": "I am nervous about changing provider while our internal IT coordinator is leaving",
     "handling": "handled",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Sam to send transition plan and meet Olivia plus principal solicitor for sign-off.",
    "confidence": 0.97,
    "span": 14
   },
   "nextStepDue": "2026-09-08"
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 6,
    "span": 0
   },
   "nextStepSecured": {
    "value": true,
    "span": 14
   },
   "objectionHandling": {
    "value": "handled",
    "span": 13
   },
   "talkRatio": 0.48,
   "notes": "Sam explored the operational risk around a departing coordinator and turned it into a concrete transition plan with a dated approval call."
  },
  "icpSignals": {
   "industry": "Family law firm",
   "headcountBand": "25-80",
   "role": "Practice Manager",
   "trigger": "Outgoing internal IT coordinator leaving in three weeks"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Wattle Street Legal",
   "body": "Hi Olivia,\n\nThanks for the time today.\nYou mentioned outgoing internal IT coordinator leaving in three weeks; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send the transition plan and fixed onboarding quote by tuesday\n- Include the leaver checklist and after-hours file migration window\n\nNext step: Sam to send transition plan and meet Olivia plus principal solicitor for sign-off.\n\nSam Whitfield"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-07T09:54:25+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-07T09:55:25+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-07T09:55:25+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-07T09:56:25+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-08-elm-and-ledger-accounting",
  "rep": "Sam Whitfield",
  "prospect": "Ben Wallace",
  "company": "Elm & Ledger Accounting",
  "domain": "elmandledger.example",
  "at": "2026-09-07T13:30:00+10:00",
  "durationSeconds": 455,
  "outcome": "won",
  "trigger": "Office move and Microsoft 365 migration before busy season",
  "summary": "Strong buying signal. Ben (Director, 52 staff) is dealing with office move and microsoft 365 migration before busy season.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Ben Wallace, thanks for taking the call. I have Elm & Ledger Accounting as a fifty-two person practice in Geelong, and you're one of the directors, correct?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Correct. We're moving offices at the end of September, and it has forced a decision about IT. We also want to finish a Microsoft 365 migration before the next busy season.",
    "at": 17
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What is driving the Microsoft 365 migration now rather than after the move?",
    "at": 36
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "We're halfway between old file shares and SharePoint. Staff are confused, and our current provider keeps telling us to wait. The office move feels like the clean moment to stop dragging both systems around.",
    "at": 44
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How does that confusion show up for accountants and admin during client work?",
    "at": 66
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "People duplicate files, Xero reports end up in the wrong folder, and managers ask admin to find versions during client calls. Nobody is malicious; it's just messy and wastes time.",
    "at": 74
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who needs to be involved in approving the plan?",
    "at": 92
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Me, another director, and our office manager. I can approve the managed service if the migration risk is clearly controlled. The office manager knows the staff pain better than anyone.",
    "at": 98
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What are the non-negotiables for the office move weekend?",
    "at": 117
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Internet live before Monday, printers mapped, Teams phones working, Xero and the tax software accessible, and no mystery about where client files live. We've no appetite for heroics on Monday morning.",
    "at": 122
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where do security and cyber insurance sit on your list?",
    "at": 142
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Increasingly high. The insurer asked about MFA, backups and admin rights. Accounting firms are an obvious target, and clients assume we've our house in order.",
    "at": 148
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For Elm & Ledger Accounting, Harbourline would likely recommend managed services at $130 per seat per month, plus a fixed office move and Microsoft 365 migration project.",
    "at": 164
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "We cannot have a messy migration in the middle of tax planning work. If staff lose client files or Xero access, the partners will never forgive the change.",
    "at": 180
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Agreed. The migration should be staged, tested with a pilot group and frozen around key lodgement dates. I will send the office move checklist and migration proposal by Wednesday so you can see the exact order.",
    "at": 198
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "That would help. I also want someone to look at old Xero access. We've former contractors who may still have permissions.",
    "at": 220
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will include the Xero access review and the busy-season support plan. The onboarding project will document users, permissions, backups and the move-weekend run sheet.",
    "at": 233
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "That sounds like the right level. Price is within range if the migration is fixed fee and we can hold you to the run sheet.",
    "at": 249
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Can we do a site walk-through Wednesday 9 September at 10am with you and the office manager, then finalise the proposal that afternoon?",
    "at": 265
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Yes, Wednesday 9 September at 10am works. Come to the current office and we can show you the comms room and the file structure.",
    "at": 279
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For the walk-through, I will want to see the comms cupboard, sample client folders, current permissions and the move timetable. That keeps the quote tied to reality.",
    "at": 294
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Good. We've had people quote from a phone call before, and then every exception became a variation. I'd rather expose the messy parts upfront.",
    "at": 311
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "We will also mark anything that shouldn't move during the office weekend. Some legacy data may be better archived cleanly than dragged into the new structure.",
    "at": 326
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "That will be a useful discipline. Accountants tend to keep everything forever, and then complain that search is terrible.",
    "at": 342
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "The support plan will include extra cover for the first Monday and a named escalation path, so your office manager isn't standing between staff and the provider.",
    "at": 354
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "She will appreciate that. She is excellent, but she has become the unofficial queue for every technical complaint.",
    "at": 371
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will also ask about your lodgement calendar during the walk-through. It's easy for IT people to plan around their own availability and accidentally land work during your worst possible week.",
    "at": 382
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Please do. Our quiet-looking weeks can still have partner reviews, payroll and client deadlines packed inside them.",
    "at": 401
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For the proposal, I will make the assumptions visible: number of seats, current file volume, printer count, Xero users and which work happens after hours.",
    "at": 412
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Good. Visible assumptions make it easier for the directors to approve, because they can see what would change the number.",
    "at": 428
   },
   {
    "index": 30,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Excellent. I will send the invite, checklist and proposal outline before then.",
    "at": 440
   },
   {
    "index": 31,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Thanks Sam. If the walk-through checks out, we're ready to move quickly.",
    "at": 448
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Ben Wallace",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "Director",
     "confidence": 0.97,
     "span": 0
    },
    "email": {
     "value": "ben@elmandledger.example",
     "confidence": 0.93,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1108",
     "confidence": 0.95,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Elm & Ledger Accounting",
     "confidence": 0.98,
     "span": 0
    },
    "industry": {
     "value": "Accounting practice",
     "confidence": 0.93,
     "span": 0
    },
    "headcount": {
     "value": 52,
     "confidence": 0.94,
     "span": null
    },
    "location": {
     "value": "Geelong, VIC",
     "confidence": 0.88,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "closed_won",
     "confidence": 0.95,
     "span": null
    },
    "valueAud": {
     "value": 78200,
     "confidence": 0.88,
     "span": null
    },
    "outcome": {
     "value": "won",
     "confidence": 0.97,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the office move checklist and migration proposal by Wednesday",
     "confidence": 0.98,
     "span": 14
    },
    {
     "value": "I will include the Xero access review and the busy-season support plan",
     "confidence": 0.87,
     "span": 16
    }
   ],
   "objections": [
    {
     "text": "We cannot have a messy migration in the middle of tax planning work",
     "handling": "handled",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Sam to send migration proposal and run site walk-through with Ben and office manager.",
    "confidence": 0.93,
    "span": 18
   },
   "nextStepDue": "2026-09-09"
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 6,
    "span": 0
   },
   "nextStepSecured": {
    "value": true,
    "span": 18
   },
   "objectionHandling": {
    "value": "handled",
    "span": 13
   },
   "talkRatio": 0.47,
   "notes": "Sam found the office move deadline, addressed migration risk and secured a dated site walk-through before proposal acceptance."
  },
  "icpSignals": {
   "industry": "Accounting practice",
   "headcountBand": "25-80",
   "role": "Director",
   "trigger": "Office move and Microsoft 365 migration before busy season"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Elm & Ledger Accounting",
   "body": "Hi Ben,\n\nThanks for the time today.\nYou mentioned office move and Microsoft 365 migration before busy season; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send the office move checklist and migration proposal by wednesday\n- Include the xero access review and the busy-season support plan\n\nNext step: Sam to send migration proposal and run site walk-through with Ben and office manager.\n\nSam Whitfield"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-07T13:39:35+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-07T13:40:35+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-07T13:40:35+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-07T13:41:35+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-09-port-phillip-physio-group",
  "rep": "Jordan Lee",
  "prospect": "Aisha Rahman",
  "company": "Port Phillip Physio Group",
  "domain": "portphillipphysio.example",
  "at": "2026-09-08T12:00:00+10:00",
  "durationSeconds": 450,
  "outcome": "won",
  "trigger": "Cyber insurance renewal requiring Essential Eight controls",
  "summary": "Strong buying signal. Aisha (General Manager, 76 staff) is dealing with cyber insurance renewal requiring essential eight controls.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Aisha Rahman, thanks for making time. I have Port Phillip Physio Group as seventy-six people across St Kilda and Cheltenham, and you run operations as general manager, right?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That's right. We've physios, reception, admin and a small leadership team. The immediate issue is our cyber insurance renewal, which has become much stricter than last year.",
    "at": 18
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "What is the insurer asking for that you can't easily evidence today?",
    "at": 35
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "They want proof of MFA, patching, backups and admin controls. Our provider says those things are handled, but when I ask for records I get screenshots and a long email rather than a clean answer.",
    "at": 43
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "How does IT support work across the two clinics during a normal week?",
    "at": 65
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Reception logs issues by email, then people chase by phone if it's urgent. Clinicians can't wait long because the practice system, EFTPOS and exercise software all touch appointments.",
    "at": 73
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Who will make the decision if you change support before the renewal?",
    "at": 91
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "I recommend, the clinic director approves, and finance signs the contract. The director cares about patient privacy and not disrupting sessions. Finance cares about predictability.",
    "at": 98
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "What would success look like in the first six weeks?",
    "at": 114
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "An evidence pack for the insurer, a known helpdesk process for reception, a cleaned-up Microsoft 365 tenant, and less noise when staff move between clinics. We're not trying to become a bank, just competent.",
    "at": 121
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Where are staff most likely to resist a change?",
    "at": 142
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Reception will resist if it slows them down. Clinicians will resist if passwords or MFA interrupt appointments. The director will resist anything that sounds like a generic cyber package.",
    "at": 148
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "For your size, Harbourline IT would be around $126 per seat per month, with an onboarding project to produce the Essential Eight evidence and standardise clinic support.",
    "at": 166
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Our current provider says they already do security, so I need to understand why this is different. I do not want to pay twice for the same promise.",
    "at": 183
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That is fair. The difference should be visible in evidence, ownership and cadence. We would show which controls exist, which are partial and which need work, then report monthly instead of waiting for renewal season. I will send the Essential Eight evidence plan and commercial proposal by Thursday.",
    "at": 201
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That's a better answer. The clinic director will also ask how you avoid disruption during appointment hours.",
    "at": 232
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will include the staged clinic rollout and receptionist training plan. We can run identity changes after the final appointment block and do short reception sessions before the morning rush.",
    "at": 242
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Good. The price is workable if the onboarding project is clear and if finance can see what risk is reduced.",
    "at": 261
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Can we meet Thursday 10 September at 3pm with you, the clinic director and finance to review the proposal and evidence plan?",
    "at": 274
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Yes, Thursday 10 September at 3pm works. Send the invite and I will add the other two.",
    "at": 288
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "For the insurer, we will avoid vague maturity claims. The evidence plan will state which Essential Eight controls are in place, which are partly in place, and what dates we can put against improvements.",
    "at": 299
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That's exactly what I need. Our board doesn't expect perfection, but they do expect a straight answer and a plan they can defend.",
    "at": 321
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "We can also separate clinical-impact changes from back-office changes. Anything that touches appointment flow gets tested in one clinic first, with reception feedback before it goes wider.",
    "at": 335
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That will matter. Reception knows where the friction really sits, and they will tell us quickly if a new login process is getting in the way.",
    "at": 352
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will write the proposal so finance can see monthly support, onboarding and optional maturity work as separate lines. That should make the decision less all-or-nothing.",
    "at": 369
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Good. A clear split will help, because I can get urgent insurance work approved faster than broad improvement work.",
    "at": 385
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The receptionist training will be short and role-specific. It should answer where to log issues, what to do if EFTPOS or the practice system is affected, and how to escalate urgent appointment-impacting problems.",
    "at": 397
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That's practical. Reception carries the stress first, so if they trust the process the clinicians will usually follow.",
    "at": 418
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Will do. I will send the proposal the morning of the meeting so you've time to skim it.",
    "at": 430
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Thanks Jordan. This feels more grounded than the last few calls I have had.",
    "at": 441
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Aisha Rahman",
     "confidence": 0.94,
     "span": 0
    },
    "role": {
     "value": "General Manager",
     "confidence": 0.97,
     "span": 0
    },
    "email": {
     "value": "aisha@portphillipphysio.example",
     "confidence": 0.9,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1109",
     "confidence": 0.93,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Port Phillip Physio Group",
     "confidence": 0.93,
     "span": 0
    },
    "industry": {
     "value": "Multi-site physiotherapy clinic",
     "confidence": 0.93,
     "span": 7
    },
    "headcount": {
     "value": 76,
     "confidence": 0.94,
     "span": null
    },
    "location": {
     "value": "St Kilda and Cheltenham, VIC",
     "confidence": 0.88,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "closed_won",
     "confidence": 0.91,
     "span": null
    },
    "valueAud": {
     "value": 109400,
     "confidence": 0.91,
     "span": null
    },
    "outcome": {
     "value": "won",
     "confidence": 0.86,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the Essential Eight evidence plan and commercial proposal by Thursday",
     "confidence": 0.89,
     "span": 14
    },
    {
     "value": "I will include the staged clinic rollout and receptionist training plan",
     "confidence": 0.96,
     "span": 16
    }
   ],
   "objections": [
    {
     "text": "Our current provider says they already do security, so I need to understand why this is different",
     "handling": "handled",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Jordan to send proposal and meet Aisha plus clinic director for decision.",
    "confidence": 0.94,
    "span": 18
   },
   "nextStepDue": "2026-09-10"
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 6,
    "span": 0
   },
   "nextStepSecured": {
    "value": true,
    "span": 18
   },
   "objectionHandling": {
    "value": "handled",
    "span": 13
   },
   "talkRatio": 0.5,
   "notes": "Jordan slowed down, asked solid discovery questions and handled the incumbent objection with evidence rather than dismissal."
  },
  "icpSignals": {
   "industry": "Multi-site physiotherapy clinic",
   "headcountBand": "25-80",
   "role": "General Manager",
   "trigger": "Cyber insurance renewal requiring Essential Eight controls"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Port Phillip Physio Group",
   "body": "Hi Aisha,\n\nThanks for the time today.\nYou mentioned cyber insurance renewal requiring Essential Eight controls; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send the essential eight evidence plan and commercial proposal by thursday\n- Include the staged clinic rollout and receptionist training plan\n\nNext step: Jordan to send proposal and meet Aisha plus clinic director for decision.\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-08T12:09:30+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-08T12:10:30+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-08T12:10:30+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-08T12:11:30+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-10-lumen-lane-retail",
  "rep": "Jordan Lee",
  "prospect": "Noah Spencer",
  "company": "Lumen Lane Retail",
  "domain": "lumenlaneretail.example",
  "at": "2026-09-09T10:30:00+10:00",
  "durationSeconds": 355,
  "outcome": "lost",
  "trigger": null,
  "summary": "Not a fit right now. Noah (Co-owner, 10 staff) is dealing with an it review.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Noah Spencer, thanks for the call. Harbourline IT gives small businesses a full managed IT service for $98 per seat per month, which covers helpdesk, device management, Microsoft 365, backups and security monitoring.",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Thanks Jordan. Lumen Lane Retail is ten people if you count casuals. We sell lighting from a Prahran showroom and online. I'm mostly checking prices because our current arrangement is informal.",
    "at": 17
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Informal support is risky for a retailer. If the point-of-sale terminal, Wi-Fi, Xero or email fails, sales stop. A monthly plan means you can call one team and know the fundamentals are being maintained.",
    "at": 32
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "We are comparing you to a break-fix provider who charges by the hour. They quoted a lower rate, and we only call when something is actually wrong.",
    "at": 49
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Break-fix looks cheaper on paper, but it doesn't include prevention. Our agreement includes patching, endpoint protection, backup checks and admin reviews, which is what keeps the hourly emergencies down.",
    "at": 63
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Maybe, but some months we've zero issues. We're not keen to add another subscription while foot traffic is uneven.",
    "at": 77
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "You also need to think about cyber risk. Retailers hold customer details, supplier records and payment systems. If an account is compromised, you want documented controls, not a frantic call to whoever can come out tomorrow.",
    "at": 87
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "I understand, but nobody has asked us for documentation. We don't have a board or a procurement team. It's me, my co-owner and a spreadsheet of expenses.",
    "at": 105
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The onboarding project would clean all that up. For Lumen Lane Retail, it would probably be around $3,800, then the monthly per-seat fee. We'd set MFA, standardise devices and document the environment.",
    "at": 119
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "That's too much for what we need. We were thinking of a few hundred dollars here and there, not a standing agreement.",
    "at": 135
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The issue with a few hundred here and there's that nobody owns the outcome. Managed IT gives you accountability, reporting and a support process that doesn't depend on your co-owner knowing which cable to restart.",
    "at": 146
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "The cable restart isn't worth ten grand a year. We might grow into something like this, but not while the business is this size.",
    "at": 163
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I hear you. Still, the cost of one serious outage can be larger than the annual difference, especially if it happens during a sale or before Christmas.",
    "at": 175
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "That feels a bit hypothetical for us. I wanted to know whether you could beat the hourly provider or offer a small retainer.",
    "at": 189
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "We don't really compete on hourly rates. Harbourline IT's built for proactive managed services, so the value is in coverage rather than being the cheapest emergency contact.",
    "at": 200
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Then I think we will go with the other provider. They fit the way we buy at the moment.",
    "at": 214
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will send the managed IT brochure in case you want to revisit it later.",
    "at": 223
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Sure, but no need to follow up hard. Thanks for explaining it.",
    "at": 231
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Another thing to consider is that hourly providers aren't usually watching for slow drift. Licences pile up, former staff keep access, routers age out and backups fail quietly until someone finally notices.",
    "at": 237
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "That may be true, but it still feels like buying a large umbrella for a drizzle.",
    "at": 253
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The managed model also gives you reporting. You would see patch status, security alerts, Microsoft 365 settings and recommendations each quarter, instead of only hearing from IT during a fault.",
    "at": 261
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Reports sound nice, but I don't need another report to read.",
    "at": 276
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I get that, but the report is how you know the basics are actually happening. Without it, the cheap option is largely trust and reaction time.",
    "at": 282
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Trust and reaction time are mostly enough for us right now.",
    "at": 295
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "If you change your mind, the brochure explains the minimum standard we recommend for any retailer, even if you don't use us. It might still help you challenge the hourly quote.",
    "at": 300
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "That's useful, but it probably confirms we're shopping in a different category.",
    "at": 316
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will also include a comparison table between hourly break-fix and managed services. It will show what is included, what is excluded and where responsibility sits, so the decision is clear even if you choose the cheaper path.",
    "at": 322
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "That's fine. A comparison table will probably help my co-owner see why we're saying no, at least for now.",
    "at": 341
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Thanks Noah. Good luck with the showroom.",
    "at": 350
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Thanks, bye.",
    "at": 354
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Noah Spencer",
     "confidence": 0.86,
     "span": 0
    },
    "role": {
     "value": "Co-owner",
     "confidence": 0.97,
     "span": 7
    },
    "email": {
     "value": "noah@lumenlaneretail.example",
     "confidence": 0.89,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1110",
     "confidence": 0.89,
     "span": 8
    }
   },
   "company": {
    "name": {
     "value": "Lumen Lane Retail",
     "confidence": 0.89,
     "span": 1
    },
    "industry": {
     "value": "Boutique lighting retailer",
     "confidence": 0.89,
     "span": 1
    },
    "headcount": {
     "value": 10,
     "confidence": 0.93,
     "span": null
    },
    "location": {
     "value": "Prahran, VIC",
     "confidence": 0.96,
     "span": 1
    }
   },
   "deal": {
    "stage": {
     "value": "closed_lost",
     "confidence": 0.88,
     "span": null
    },
    "valueAud": {
     "value": 11200,
     "confidence": 0.95,
     "span": null
    },
    "outcome": {
     "value": "lost",
     "confidence": 0.92,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the managed IT brochure",
     "confidence": 0.98,
     "span": 16
    }
   ],
   "objections": [
    {
     "text": "We are comparing you to a break-fix provider who charges by the hour",
     "handling": "ignored",
     "span": 3
    }
   ],
   "nextStep": null,
   "nextStepDue": null
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 0,
    "span": null
   },
   "nextStepSecured": {
    "value": false,
    "span": null
   },
   "objectionHandling": {
    "value": "ignored",
    "span": 3
   },
   "talkRatio": 0.61,
   "notes": "Jordan led with pricing and feature breadth, then failed to explore the hourly-provider comparison or qualify the tiny account."
  },
  "icpSignals": {
   "industry": "Boutique lighting retailer",
   "headcountBand": "under-15",
   "role": "Co-owner",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Leaving the door open — Lumen Lane Retail",
   "body": "Hi Noah,\n\nThanks for being straight with me today. It sounds like the current setup is working for you, so I won't push.\n\nIf anything changes — an insurer asking for evidence, or a bad week with the computers — send me a note and I'll pick it up from here.\n\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-09T10:37:55+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-09T10:38:55+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-09T10:38:55+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-09T10:39:55+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-11-banksia-architects",
  "rep": "Sam Whitfield",
  "prospect": "Grace Kim",
  "company": "Banksia Architects",
  "domain": "banksiaarchitects.example",
  "at": "2026-09-10T14:00:00+10:00",
  "durationSeconds": 425,
  "outcome": "stalled",
  "trigger": "Office move planning and cyber insurance evidence gap",
  "summary": "Interest is real, timing is not. Grace (Studio Operations Manager, 44 staff) is dealing with office move planning and cyber insurance evidence gap.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Grace Kim, thanks for speaking with me. I have Banksia Architects as a forty-four person studio in Fitzroy, and you manage studio operations, yes?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Yes. We're looking at an office move next quarter, and it has exposed how dependent we're on an IT setup nobody really owns. I'm gathering options before the directors decide what to fund.",
    "at": 14
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What has the office move made visible that was easier to ignore before?",
    "at": 34
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Shared project files, printing, site laptops and a pile of old accounts. We've grown from twenty-eight to forty-four people, but the IT habits are from the smaller studio.",
    "at": 42
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How do staff currently get help when something breaks during a deadline?",
    "at": 59
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "They message me, our BIM lead, or the external technician we use casually. Everyone is helpful, but nobody has an overall picture. During tender weeks that means lots of interruptions.",
    "at": 66
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who would need to be in the room for a decision on managed services?",
    "at": 84
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Two directors and me. I can recommend, but I can't sign. One director cares about project continuity, the other is watching cash because the move is expensive.",
    "at": 93
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What would make the directors feel this is a must-do rather than a nice-to-have?",
    "at": 109
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Evidence that the move is risky without it. Also cyber insurance. We answered a questionnaire last year, but I couldn't prove half the answers without chasing three people.",
    "at": 117
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where are your biggest security gaps today?",
    "at": 134
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Old admin accounts, inconsistent MFA, and no formal backup test. I'm not saying everything is broken, but it's too much dependent knowledge.",
    "at": 138
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "For a studio your size, Harbourline IT would usually sit around $134 per seat per month, with an onboarding project to document systems before the move.",
    "at": 151
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "The directors will not approve anything until the new financial year budget is clearer. They have already committed to lease costs, furniture and a fit-out consultant.",
    "at": 167
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That's understandable. The useful first step may be a low-commitment risk note that shows what needs funding and what can wait. I don't want you trying to sell a full proposal without director context.",
    "at": 183
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "A risk note would help me frame it. I can't promise they will prioritise it, but they will listen if it ties directly to the move and insurance.",
    "at": 203
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Would you like me to join a director meeting once they have read it?",
    "at": 220
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Maybe. I don't have the meeting date yet, and I'd rather not lock something in until I know whether they want to engage.",
    "at": 228
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Fair. I will send a short findings note and an office move risk checklist. You can use it internally, and if the directors want detail we can book a proper workshop.",
    "at": 242
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Yes, send that. Keep it practical and not too salesy, please.",
    "at": 261
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "In the note, I will separate must-fix items from decisions that can safely wait. That should help the directors avoid treating every IT issue as equal.",
    "at": 268
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That would be useful. At the moment it all feels like one tangled problem, which makes it easier for them to defer the whole thing.",
    "at": 283
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will also give you a small evidence checklist for cyber insurance, so even if managed services waits, you know what documents to collect before renewal.",
    "at": 298
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That's valuable. I don't want another renewal where I'm asking three different people whether we test backups and getting three different answers.",
    "at": 314
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "If the directors push it to next year, the checklist can become the basis for a budget request rather than disappearing after this call.",
    "at": 327
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Exactly. I need something I can attach to a budget conversation, not just my feeling that the current setup is fragile.",
    "at": 341
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will make the risk note specific to architecture workflows: large files, consultant deadlines, site laptops, printing, SharePoint structure and access for contractors.",
    "at": 354
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That specificity matters. The directors tune out when IT sounds generic, but they pay attention when it connects to project delivery.",
    "at": 368
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will include a small section on what to ask any provider, including us, so the directors can compare options without needing to be technical.",
    "at": 381
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That would be genuinely helpful. They will want to feel in control of the decision, not steered into a package.",
    "at": 396
   },
   {
    "index": 30,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Absolutely. I will keep it to the move, cyber insurance evidence and the support model choices.",
    "at": 408
   },
   {
    "index": 31,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Thanks Sam. I'm interested, but I need the internal timing to catch up.",
    "at": 417
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Grace Kim",
     "confidence": 0.97,
     "span": 0
    },
    "role": {
     "value": "Studio Operations Manager",
     "confidence": 0.97,
     "span": 0
    },
    "email": {
     "value": "grace@banksiaarchitects.example",
     "confidence": 0.98,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1111",
     "confidence": 0.9,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Banksia Architects",
     "confidence": 0.91,
     "span": 0
    },
    "industry": {
     "value": "Architecture studio",
     "confidence": 0.96,
     "span": 0
    },
    "headcount": {
     "value": 44,
     "confidence": 0.91,
     "span": null
    },
    "location": {
     "value": "Fitzroy, VIC",
     "confidence": 0.87,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "evaluation",
     "confidence": 0.88,
     "span": null
    },
    "valueAud": {
     "value": 66400,
     "confidence": 0.97,
     "span": null
    },
    "outcome": {
     "value": "stalled",
     "confidence": 0.92,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send a short findings note and an office move risk checklist",
     "confidence": 0.92,
     "span": 18
    }
   ],
   "objections": [
    {
     "text": "The directors will not approve anything until the new financial year budget is clearer",
     "handling": "partial",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Sam to send findings note and risk checklist for Grace to discuss with directors.",
    "confidence": 0.88,
    "span": 18
   },
   "nextStepDue": null
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 6,
    "span": 0
   },
   "nextStepSecured": {
    "value": false,
    "span": 18
   },
   "objectionHandling": {
    "value": "partial",
    "span": 13
   },
   "talkRatio": 0.47,
   "notes": "Sam did good discovery, but the directors were missing and budget timing kept the next step vague."
  },
  "icpSignals": {
   "industry": "Architecture studio",
   "headcountBand": "25-80",
   "role": "Studio Operations Manager",
   "trigger": "Office move planning and cyber insurance evidence gap"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Following up — Banksia Architects",
   "body": "Hi Grace,\n\nThanks for the time today.\nYou mentioned office move planning and cyber insurance evidence gap; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send a short findings note and an office move risk checklist\n\nNext step: Sam to send findings note and risk checklist for Grace to discuss with directors.\n\nNo rush on your side; when the timing is clearer I'm happy to walk the directors through it.\n\nSam Whitfield"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-10T14:09:05+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-10T14:10:05+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-10T14:10:05+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-10T14:11:05+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-12-dockside-dental",
  "rep": "Jordan Lee",
  "prospect": "Ethan Clarke",
  "company": "Dockside Dental",
  "domain": "docksidedental.example",
  "at": "2026-09-11T09:00:00+10:00",
  "durationSeconds": 55,
  "outcome": "no_show",
  "trigger": null,
  "summary": "Ethan had to cancel; a reschedule note is drafted.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Hi, Jordan Lee from Harbourline IT calling for Ethan Clarke at Dockside Dental. We had a 9am phone appointment about managed IT and cyber insurance questions.",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Reception",
    "text": "Ethan has been pulled into a patient issue and won't make the call. Sorry, the morning has gone sideways.",
    "at": 18
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "No worries. I will send a quick email with a couple of times to reschedule, and he can pick whatever works. Please let him know Jordan called.",
    "at": 31
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Reception",
    "text": "Will do. Email is best today. Thanks for understanding.",
    "at": 49
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Ethan Clarke",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "Practice Owner",
     "confidence": 0.93,
     "span": null
    },
    "email": {
     "value": "ethan@docksidedental.example",
     "confidence": 0.96,
     "span": 0
    },
    "phone": {
     "value": "+61 3 7010 1112",
     "confidence": 0.87,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Dockside Dental",
     "confidence": 0.9,
     "span": 0
    },
    "industry": {
     "value": "Dental practice",
     "confidence": 0.9,
     "span": 0
    },
    "headcount": {
     "value": 18,
     "confidence": 0.97,
     "span": null
    },
    "location": {
     "value": "Williamstown, VIC",
     "confidence": 0.98,
     "span": null
    }
   },
   "deal": {
    "stage": {
     "value": "discovery",
     "confidence": 0.86,
     "span": null
    },
    "valueAud": {
     "value": 0,
     "confidence": 0.95,
     "span": null
    },
    "outcome": {
     "value": "no_show",
     "confidence": 0.89,
     "span": 2
    }
   },
   "promises": [
    {
     "value": "I will send a quick email with a couple of times to reschedule",
     "confidence": 0.93,
     "span": 2
    }
   ],
   "objections": [],
   "nextStep": null,
   "nextStepDue": null
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 0,
    "span": null
   },
   "nextStepSecured": {
    "value": false,
    "span": null
   },
   "objectionHandling": {
    "value": "none_raised",
    "span": null
   },
   "talkRatio": 0.65,
   "notes": "Jordan reached reception instead of Ethan and left a brief reschedule message, so no sales conversation occurred."
  },
  "icpSignals": {
   "industry": "Dental practice",
   "headcountBand": "15-24",
   "role": "Practice Owner",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Rescheduling our call — Dockside Dental",
   "body": "Hi Ethan,\n\nNo problem at all about this morning. I'll keep the same agenda: a quick look at how Dockside Dental handles IT support today and where the cyber-insurance questions are landing.\n\nDo either of these work?\n- Tomorrow 9:30am\n- Thursday 2:00pm\n\nHappy to work around the clinic.\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-11T09:02:55+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-11T09:03:55+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-11T09:03:55+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-11T09:04:55+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-13-marlowe-finch-demo",
  "rep": "Jordan Belfort",
  "prospect": "Donnie Azoff",
  "company": "Marlowe & Finch Accounting",
  "domain": "marlowefinch.example",
  "at": "2026-09-11T15:30:00+10:00",
  "durationSeconds": 420,
  "outcome": "won",
  "trigger": "Cyber insurance renewal requiring Essential Eight controls",
  "summary": "Strong buying signal. Donnie (CFO, 34 staff) is dealing with cyber insurance renewal requiring essential eight controls.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Donnie Azoff, Jordan Belfort from Harbourline IT. I've heard Marlowe & Finch Accounting is the calmest thirty-four-person practice in Hawthorn, which means you must be hiding the chaos beautifully?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "That's generous. I'm Donnie, CFO, and there's definitely chaos. We've got a cyber insurance renewal on my desk and the partners want it gone before quarter close.",
    "at": 14
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Perfect, picture this: three firms on your street have already moved, and the onboarding price is gone Friday. You don't need another committee, you need Harbourline on the tools before the insurer decides accountants are this season's piñata.",
    "at": 28
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Hold on. I'm taking the call because we need options, not because we've chosen anyone. What exactly are you proposing?",
    "at": 46
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Simple. Thirty seats, $135 per seat per month, managed IT, cyber hygiene, Microsoft 365, Xero access review, MFA, backups, helpdesk, partner-friendly reporting, the whole brass band. I can guarantee Essential Eight compliance inside a week.",
    "at": 56
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "That's a very big promise. Also thirty seats is close, but we've thirty-four people including casual admin and seasonal tax support.",
    "at": 73
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Thirty is the clean commercial start. We cover the core team now, catch the casuals in onboarding, and keep the invoice from looking like it swallowed a bowling ball. The annual figure is $48,600, and onboarding is at cost because I want this moving.",
    "at": 84
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Price is my first concern. Our incumbent charges less, and the partners are already grumpy about insurance premiums.",
    "at": 105
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Price is smoke, Donnie, premium is fire. Your insurer will halve the premium once they see our report, so the monthly line item becomes a rounding error with a login screen.",
    "at": 114
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "You can't know that. The broker hasn't promised anything like a half reduction, and I can't sell fantasy savings to the partners.",
    "at": 129
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Fair, fair, call it a sharp reduction rather than a tattoo. The point is the renewal asks for controls, and we package the answers so you aren't hunting screenshots from a router, a laptop and a drawer full of mystery passwords.",
    "at": 140
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "That part is real. We struggled last year to prove MFA coverage and backup testing. Still, our current provider knows the practice and the partners trust them.",
    "at": 160
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Trust is lovely. Receipts are lovelier. None of our clients has ever been breached, and we run the service like a tax file with a stopwatch: evidence, cadence, accountability, no heroic cousin with a USB stick.",
    "at": 174
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "The incumbent isn't someone's cousin. They're a proper provider, and they've supported us for years.",
    "at": 191
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "I hear you, and loyalty matters. The question is whether they're built for this renewal. Your incumbent is about to lose their certification, and even without that, you need insurer-grade evidence, not a nice bloke with fast email.",
    "at": 199
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "About to lose certification? That's a pretty serious thing to say. I haven't heard that from anyone.",
    "at": 217
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Let's not get stuck in the weeds. I'm saying the market's moving, auditors are waking up, insurers are grumpy, and you don't want Marlowe & Finch Accounting as the test case everyone whispers about at the Hawthorn lunch counter.",
    "at": 226
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "I don't like being rushed. I do like the idea of evidence for the renewal, and a fixed commercial number helps. What would happen today if I said yes to reviewing it?",
    "at": 245
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Today is easy. I turn the call into a plain proposal, no interpretive dance, no discovery workshop that eats your calendar. You'll see seats, scope, onboarding, renewal evidence, support hours, response targets and the Monday start plan in one clean pack.",
    "at": 261
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "A clean pack is useful. I still need the managing partner to be comfortable before anyone signs.",
    "at": 281
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Of course. Give the managing partner the tidy version: thirty core seats, insurer evidence first, no migration circus, and the finance line is predictable. I'll keep the terms sharp enough that nobody has to decode vendor soup at dinner.",
    "at": 289
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Good. Clear and short will help.",
    "at": 308
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Beautiful. I will get a proposal in your inbox today, with a signed 30-seat agreement at $135 per seat per month and onboarding at cost. You sign, we start Monday, and your broker gets grown-up answers before they sharpen the pencil.",
    "at": 311
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "I said review it, not definitely sign it. But if the agreement is clean and onboarding is genuinely at cost, I can take it to the managing partner tonight.",
    "at": 331
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "That's the small step. Just say yes to the small step. I will send the proposal and 30-seat agreement by 5pm today, and we'll hold the Friday onboarding price while you get the signature.",
    "at": 346
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Fine. Send it by 5pm today, 11 September. I'll review it with the managing partner, and if the terms match what you've said, we'll sign the 30-seat agreement and start with onboarding Monday.",
    "at": 362
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Excellent. I'll send it to donnie@marlowefinch.example, copy your office manager if you want, and keep the first page painfully clear: $48,600 annual managed service, onboarding at cost, insurer evidence first.",
    "at": 379
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Copy me only for now. And Jordan, trim the theatre from the email. The partners like numbers, not fireworks.",
    "at": 393
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Numbers only, fireworks in a separate attachment that mysteriously never arrives. Thanks Donnie, you've moved fast, which is exactly how we keep the renewal from becoming a Friday-night spreadsheet séance.",
    "at": 403
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Right. Send the proposal. Bye.",
    "at": 418
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Donnie Azoff",
     "confidence": 0.95,
     "span": 0
    },
    "role": {
     "value": "CFO",
     "confidence": 0.97,
     "span": 1
    },
    "email": {
     "value": "donnie@marlowefinch.example",
     "confidence": 0.93,
     "span": 26
    },
    "phone": {
     "value": "+61 3 7010 1113",
     "confidence": 0.98,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Marlowe & Finch Accounting",
     "confidence": 0.86,
     "span": 0
    },
    "industry": {
     "value": "Accounting practice",
     "confidence": 0.94,
     "span": 0
    },
    "headcount": {
     "value": 34,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Hawthorn, VIC",
     "confidence": 0.86,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "closed_won",
     "confidence": 0.87,
     "span": null
    },
    "valueAud": {
     "value": 48600,
     "confidence": 0.92,
     "span": null
    },
    "outcome": {
     "value": "won",
     "confidence": 0.96,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will get a proposal in your inbox today",
     "confidence": 0.94,
     "span": 22
    },
    {
     "value": "I will send the proposal and 30-seat agreement by 5pm today",
     "confidence": 0.94,
     "span": 24
    }
   ],
   "objections": [
    {
     "text": "Price is my first concern",
     "handling": "ignored",
     "span": 7
    },
    {
     "text": "our current provider knows the practice and the partners trust them",
     "handling": "partial",
     "span": 11
    }
   ],
   "nextStep": {
    "value": "Jordan to send the proposal and 30-seat agreement by 5pm for Donnie and the managing partner to review and sign.",
    "confidence": 0.89,
    "span": 25
   },
   "nextStepDue": "2026-09-11"
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 1,
    "span": 0
   },
   "nextStepSecured": {
    "value": true,
    "span": 25
   },
   "objectionHandling": {
    "value": "partial",
    "span": 7
   },
   "talkRatio": 0.64,
   "notes": "Jordan won the demo call by rushing Donnie into a proposal and agreement, but the call is full of pressure, weak discovery and risky claims."
  },
  "icpSignals": {
   "industry": "Accounting practice",
   "headcountBand": "25-80",
   "role": "CFO",
   "trigger": "Cyber insurance renewal requiring Essential Eight controls"
  },
  "riskFlags": [
   {
    "turnIndex": 3,
    "text": "three firms on your street have already moved, and the onboarding price is gone Friday",
    "kind": "pressure"
   },
   {
    "turnIndex": 5,
    "text": "I can guarantee Essential Eight compliance inside a week",
    "kind": "overclaim"
   },
   {
    "turnIndex": 9,
    "text": "Your insurer will halve the premium once they see our report",
    "kind": "overclaim"
   },
   {
    "turnIndex": 13,
    "text": "None of our clients has ever been breached",
    "kind": "unverifiable"
   },
   {
    "turnIndex": 15,
    "text": "Your incumbent is about to lose their certification",
    "kind": "unverifiable"
   }
  ],
  "draft": {
   "subject": "Next steps — Marlowe & Finch Accounting",
   "body": "Hi Donnie,\n\nThanks for the time today.\nYou mentioned cyber insurance renewal requiring Essential Eight controls; that's the part I'd focus on first.\n\nWhat I owe you:\n- Get a proposal in your inbox today\n- Send the proposal and 30-seat agreement by 5pm today\n\nNext step: Jordan to send the proposal and 30-seat agreement by 5pm for Donnie and the managing partner to review and sign.\n\nJordan Belfort"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-11T15:39:00+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-11T15:40:00+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-11T15:40:00+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-11T15:41:00+10:00",
    "icon": "mail"
   }
  ]
 }
];

export const callById = (id: string) => calls.find((c) => c.id === id);
