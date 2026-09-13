import type { CallRecord } from "@/lib/types/calls";

// GENERATED FILE — do not edit by hand.
// Written by scripts/generate-fixture-ui.mjs from fixtures/calls/*/{script,expected}.json
// and fixtures/seller.json. Run `npm run generate:fixture-ui` after any fixture change.
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
  "trigger": "Research note production doubling ahead of a new fund launch",
  "summary": "Strong buying signal. Maya (Managing Partner, 42 staff) is dealing with research note production doubling ahead of a new fund launch.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Hi Maya, it's Sam from Eleno. Thanks for making the time. Before I get into anything, can I confirm I have you as Maya Chen, Managing Partner at Northstar Labs in Southbank?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "That's me. We're a quantitative investment research boutique, forty-two people, mostly researchers, data engineers and a small client team. Your timing is decent, because we launch a new fund in November and the research note load roughly doubles with it.",
    "at": 15
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That helps. Tell me about the note load itself. What are you producing now, and what does doubling actually mean in numbers?",
    "at": 34
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "We publish about sixty notes a month across four strategies. After the launch it's closer to a hundred and twenty. Each note is a model run, a chart pack and eight hundred words of commentary that has to stay consistent with what we said last quarter, or the client notices before we do.",
    "at": 44
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who does the first draft today, and how long does one note take them?",
    "at": 69
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Two senior analysts write the first draft and the partners review it. A note takes an analyst two to three hours, and most of that isn't thinking. It's pulling numbers out of the model, rebuilding the chart pack and rewriting the same three paragraphs of standing context we've written four hundred times.",
    "at": 76
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where do the model runs and the published notes actually live?",
    "at": 101
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Model runs are in Excel on a shared drive, drafts are in Word, published versions sit in SharePoint. Nothing links a note back to the model run it came from, which becomes a problem the moment compliance asks a question about a number we published in June.",
    "at": 106
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What has to be true six weeks after the fund launches for you to call this a win?",
    "at": 128
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Analysts spend their time on the analysis instead of the assembly. If a first draft arrives with the numbers already in it and the standing sections already written, I'd take that happily. I'm not asking anything to form an opinion for us. The opinion is what clients pay for.",
    "at": 137
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Who else needs to be comfortable before Northstar Labs commits to something like this?",
    "at": 160
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Me and my co-founder, and our compliance officer has a veto over anything that touches published research. She's reasonable. She just wants a human signing every note that goes out the door, and a record of what changed.",
    "at": 166
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That's useful. The shape I'd propose is a short paid discovery phase, two weeks, where we map one strategy end to end with your analysts. Then a fixed-scope build of a drafting agent that pulls the model run, assembles the chart pack and writes the standing sections. For a process this size the build lands around $58,400.",
    "at": 184
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Before you go further, we don't want another subscription sitting on the books. We've bought three tools in two years and we're still paying for one that nobody opens any more.",
    "at": 211
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That's the part of our model worth hearing. There is no subscription. We build it, deploy it inside your own systems and transfer the IP to you, so it becomes your asset. Ongoing tuning is a separate arrangement you can stop whenever you like.",
    "at": 226
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "That's a better answer than I expected. The IP point matters here, because the research process effectively is the business. If it lives in someone else's platform we've handed over the thing we sell.",
    "at": 247
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I won't tell you the agent is never wrong. It will get the standing sections right and it will occasionally phrase a number oddly, which is why your analyst review stays in the workflow rather than being designed out of it.",
    "at": 263
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "I appreciate you saying it. The last vendor told us their model was perfect and then argued with our compliance officer for an hour about a footnote.",
    "at": 282
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "We time ten notes during the discovery phase before we build anything, then time ten after. The baseline is yours either way, even if you decide not to go ahead.",
    "at": 295
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "How would you measure the saving? I don't want a number we can't defend internally when my co-founder asks what it actually bought us.",
    "at": 309
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will send the discovery phase scope and the measurement plan by Thursday morning. I will send two research notes redrafted from your published ones as well, so you can see the output shape before you commit to anything.",
    "at": 320
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Fair enough. I'd want the measurement plan written down before I take this to my co-founder, and I'd want the redrafts to use our own notes, not a generic sample.",
    "at": 339
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "When suits you and your co-founder for a walkthrough of that scope?",
    "at": 353
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Thursday 3 September at 2pm. Put the research note drafting pilot first on the agenda and bring the measurement plan. If the scope holds up I'll sign off the discovery phase that afternoon.",
    "at": 359
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Thursday 3 September at 2pm, locked in. I'll send the invite today with the scope attached and the redrafted notes ahead of it.",
    "at": 374
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "That works. Send it to me directly and I'll forward it to my co-founder and our compliance officer so nobody is surprised.",
    "at": 385
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Will do. I'd rather find out we're the wrong fit in week two of a discovery phase than in month six of a build, so that two weeks does that job as well.",
    "at": 395
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Maya Chen",
    "text": "Thanks Sam. I liked that you asked what we actually do before telling me what to buy. Speak Thursday.",
    "at": 411
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Maya Chen",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "Managing Partner",
     "confidence": 0.96,
     "span": 0
    },
    "email": {
     "value": "maya@northstarlabs.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1101",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Northstar Labs",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Quantitative investment research boutique",
     "confidence": 0.96,
     "span": 1
    },
    "headcount": {
     "value": 42,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Southbank, VIC",
     "confidence": 0.96,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "closed_won",
     "confidence": 0.88,
     "span": null
    },
    "valueAud": {
     "value": 58400,
     "confidence": 0.96,
     "span": 12
    },
    "outcome": {
     "value": "won",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the discovery phase scope and the measurement plan by Thursday morning",
     "confidence": 0.96,
     "span": 20
    },
    {
     "value": "I will send two research notes redrafted from your published ones",
     "confidence": 0.96,
     "span": 20
    }
   ],
   "objections": [
    {
     "text": "we don't want another subscription sitting on the books",
     "handling": "handled",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Sam to send the discovery phase scope, measurement plan and two redrafted research notes, then walk Maya and her co-founder through the research note drafting pilot scope.",
    "confidence": 0.88,
    "span": 20
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
    "span": 20
   },
   "objectionHandling": {
    "value": "handled",
    "span": 13
   },
   "talkRatio": 0.44,
   "notes": "Sam mapped the note production workflow before pricing anything, answered the subscription objection with the IP transfer model and left with a dated pilot scope review."
  },
  "icpSignals": {
   "industry": "Quantitative investment research boutique",
   "headcountBand": "25-80",
   "role": "Managing Partner",
   "trigger": "Research note production doubling ahead of a new fund launch"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Northstar Labs",
   "body": "Hi Maya,\n\nThanks for the time today.\nYou mentioned research note production doubling ahead of a new fund launch; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send the discovery phase scope and the measurement plan by Thursday morning\n- Send two research notes redrafted from your published ones\n\nNext step: Sam to send the discovery phase scope, measurement plan and two redrafted research notes, then walk Maya and her co-founder through the research note drafting pilot scope.\n\nSam Whitfield"
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
  "id": "call-02-kestrel-lending",
  "rep": "Sam Whitfield",
  "prospect": "Felix Morgan",
  "company": "Kestrel Lending",
  "domain": "kestrellending.example",
  "at": "2026-09-01T10:30:00+10:00",
  "durationSeconds": 440,
  "outcome": "won",
  "trigger": "Loan document turnaround blowing out before broker season",
  "summary": "Strong buying signal. Felix (Head of Credit Operations, 64 staff) is dealing with loan document turnaround blowing out before broker season.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Felix, Sam Whitfield from Eleno. Thanks for the time. Just to confirm before we start, I have you as Felix Morgan, Head of Credit Operations at Kestrel Lending in Docklands?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "You've got it. We're a non-bank commercial lender, sixty-four people across credit, settlements and broker support. I took this call because our loan document turnaround is blowing out and broker season starts in six weeks.",
    "at": 16
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What does the turnaround look like now, and where does it need to be?",
    "at": 34
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "From credit approval to documents out the door is four to five days at the moment. Two years ago it was two. Brokers notice that, and a broker who waits five days for documents quietly sends the next deal somewhere else.",
    "at": 41
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Walk me through what happens in those four days, step by step.",
    "at": 63
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "A credit analyst assembles the file, a documentation officer drafts the facility letter and the security schedules from templates in Word, then a senior checks the lot against the approval. Every one of those steps is a person retyping something that already exists in the approval memo.",
    "at": 69
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How many sets of documents does that team produce in a month?",
    "at": 94
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "About two hundred and forty in a normal month, and closer to four hundred through broker season. We have three documentation officers. Two of them worked through their leave last spring and I am not asking them to do that again this year.",
    "at": 100
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What systems hold the approvals and the templates today?",
    "at": 123
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Approvals live in our loan origination system, templates are Word files on a shared drive with version numbers in the filename, and executed copies go into SharePoint. Security schedules are the messy part, because they change with the asset type and nobody agrees on which template is current.",
    "at": 127
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What would a good outcome look like by the time brokers ramp up?",
    "at": 153
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Documents out the same day as approval for the standard deals, and the officers spending their time on the complicated ones. If we hold two days on the unusual structures I would be satisfied. I would also want every version recorded, because our regulator asks and I would rather not be reconstructing it later.",
    "at": 159
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "And who signs off a project like this at Kestrel Lending?",
    "at": 188
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Our CEO signs, on my recommendation, with the head of risk in the room. Risk will push back hardest, and fairly, because he owns what happens when a document goes out wrong.",
    "at": 194
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is enough to be concrete. I would run a two-week discovery phase with your documentation officers, mapping the standard facility and two security schedule variants. Then a fixed-scope build that reads the approval, drafts the facility letter and the schedules, and hands your officer a document to check rather than write. For the volume you are describing that build sits at $96,000.",
    "at": 210
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That is a real number. My concern is that we'd be buying a tool we then depend on you to run for the next five years, and that is exactly how we ended up replacing our last platform.",
    "at": 243
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "You wouldn't. We build it, deploy it into your systems and transfer the IP to you, so it is your asset and your team can change it. Managed optimisation afterwards is separate and you can stop it whenever you like.",
    "at": 263
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Good. The head of risk will ask what happens when it drafts something wrong, and he will not accept an answer that starts with the word never.",
    "at": 284
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Then your officer catches it, the same as when a person copies the wrong schedule today. We won't design the checker out of the process, and every draft records which approval fields it used.",
    "at": 298
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That is the answer he wants. He will still want to see it working on real files though, not a demonstration built on tidy examples.",
    "at": 316
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is what the discovery phase is for. We work on your files, in your environment, and you end up with a measured baseline and a scope whether or not you go ahead.",
    "at": 329
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "How long from the end of discovery to something the officers can actually use? Broker season does not move because a project runs late.",
    "at": 347
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Six to eight weeks for the standard facility, longer if the schedules are as varied as they sound. I would rather ship the standard path first than promise everything at once.",
    "at": 359
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "That suits me. Standard deals are seventy per cent of the volume and about ninety per cent of the frustration.",
    "at": 375
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will send the discovery phase scope and a sample redrafted facility letter by Wednesday. I will send the measurement plan alongside it, so your head of risk can see how we would prove the saving before anyone signs anything.",
    "at": 386
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Send it to me and I will get it in front of both of them before the end of the week.",
    "at": 407
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Can we hold Thursday 10 September at 10am to walk through it with your head of risk?",
    "at": 418
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Felix Morgan",
    "text": "Thursday 10 September at 10am works. I will book the room and bring our own volume numbers so we are arguing about the same baseline.",
    "at": 427
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Felix Morgan",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "Head of Credit Operations",
     "confidence": 0.96,
     "span": 0
    },
    "email": {
     "value": "felix@kestrellending.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1102",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Kestrel Lending",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Non-bank commercial lender",
     "confidence": 0.96,
     "span": 1
    },
    "headcount": {
     "value": 64,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Docklands, VIC",
     "confidence": 0.96,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "closed_won",
     "confidence": 0.88,
     "span": null
    },
    "valueAud": {
     "value": 96000,
     "confidence": 0.96,
     "span": 14
    },
    "outcome": {
     "value": "won",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the discovery phase scope and a sample redrafted facility letter by Wednesday",
     "confidence": 0.96,
     "span": 24
    },
    {
     "value": "I will send the measurement plan alongside it",
     "confidence": 0.96,
     "span": 24
    }
   ],
   "objections": [
    {
     "text": "we'd be buying a tool we then depend on you to run for the next five years",
     "handling": "handled",
     "span": 15
    }
   ],
   "nextStep": {
    "value": "Sam to send the discovery phase scope, a redrafted facility letter and the measurement plan, then review them with Felix and the head of risk.",
    "confidence": 0.88,
    "span": 24
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
    "span": 24
   },
   "objectionHandling": {
    "value": "handled",
    "span": 15
   },
   "talkRatio": 0.43,
   "notes": "Sam quantified the document turnaround and the volumes before naming a number, answered the lock-in objection with IP transfer and booked a dated review with the head of risk."
  },
  "icpSignals": {
   "industry": "Non-bank commercial lender",
   "headcountBand": "25-80",
   "role": "Head of Credit Operations",
   "trigger": "Loan document turnaround blowing out before broker season"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Kestrel Lending",
   "body": "Hi Felix,\n\nThanks for the time today.\nYou mentioned loan document turnaround blowing out before broker season; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send the discovery phase scope and a sample redrafted facility letter by Wednesday\n- Send the measurement plan alongside it\n\nNext step: Sam to send the discovery phase scope, a redrafted facility letter and the measurement plan, then review them with Felix and the head of risk.\n\nSam Whitfield"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-01T10:39:20+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-01T10:40:20+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-01T10:40:20+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-01T10:41:20+10:00",
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
  "at": "2026-09-01T14:00:00+10:00",
  "durationSeconds": 390,
  "outcome": "lost",
  "trigger": null,
  "summary": "Not a fit right now. Jordan quoted a build price in the first sentence, never asked what the studio does, talked past the volume and cost objections and left with no next step.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Priya Shah, Jordan Lee from Eleno. Good to finally speak with Afterglow Studio. We build custom AI agents for Melbourne businesses, and for a studio your size a first automation build usually lands between $15,000 and $18,000, with a short discovery phase on top of that.",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Hi Jordan. We are twelve people in Collingwood and I was mostly curious. Most of what we do is creative work that changes shape on every job.",
    "at": 22
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That is exactly where the value is. Every studio thinks their work is bespoke, and then you look at the proposals, the scopes of work and the monthly status reports, and eighty per cent of it is the same nine paragraphs with different client names in them.",
    "at": 34
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Some of it is, but we do about four proposals a month. It is not a factory.",
    "at": 56
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Four a month is still forty-eight a year, and if each one takes your team three hours you are looking at a working fortnight gone. An agent can draft the scope, pull your rate card and have it sitting in your inbox in under a minute.",
    "at": 64
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "We do not have the volume to justify a build like that. The proposals are also where we win the work, so I want a human writing them.",
    "at": 86
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "A human still signs them. The agent does the assembly, and your people spend their time on the pitch rather than the formatting. Every client we deploy for says the same thing in the first week.",
    "at": 99
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Maybe. But the cost is the part I keep coming back to, and you have quoted me a number before you know what we actually do.",
    "at": 116
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Think about the cost the other way. If a proposal goes out two days late and you lose one retainer a year at thirty thousand, the build has paid for itself before the first invoice.",
    "at": 128
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "That is more than we spent on our entire software stack last year, and we actually use that software every single day.",
    "at": 144
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Software is a subscription, though. This is different. We build it, deploy it and transfer the IP to you, so it is an asset on your books instead of a bill that renews forever.",
    "at": 154
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "An asset we would still have to maintain. There are twelve of us and not one of us is technical.",
    "at": 170
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That is what the managed optimisation option covers. It is there if you want it and it is not compulsory, but most studios take it for the first year because it removes the worry.",
    "at": 180
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "So there is an ongoing cost after all, which is the thing I said at the start I did not want.",
    "at": 195
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Only if you choose it. The pattern I see with creative studios is that admin creeps up until someone burns out, and then you are hiring a coordinator at eighty thousand a year to do work an agent could have done.",
    "at": 205
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "We already have a studio coordinator and she is excellent. She would tell you the proposals are the easy part of her week.",
    "at": 224
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Then she is spending her week on the wrong work. I have sat with agencies where the coordinator was a copy-and-paste machine three days a week, and once we automated the proposal packs she moved onto client care.",
    "at": 235
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "I hear you, but you still have not asked me what she actually does.",
    "at": 253
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Fair, and I will get to that. The reason I lead with the build is that studios your size tend to wait too long, and then the work arrives all at once and there is no time to put anything in properly.",
    "at": 260
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "That still sounds like buying ahead of a problem we do not have.",
    "at": 279
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Or buying ahead of growth. You said four proposals a month now. If that goes to eight you are not adding half a person, you are adding a bottleneck that shows up in how fast you answer new business.",
    "at": 285
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Our response time is fine. We usually turn a proposal around in two days.",
    "at": 303
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Two days is slower than it sounds when three studios are pitching the same job. The one that answers in four hours reads as the one that wants it more. That is a revenue argument, not an efficiency one.",
    "at": 310
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Jordan, I do not think we are the right fit for this, and I have said so three times now.",
    "at": 328
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will send the scope and the numbers through this afternoon anyway. It will show the proposal drafting build, the onboarding pack automation and what the discovery phase covers, so you have something to look at when the volume does arrive.",
    "at": 338
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "You can send it. I do not want to waste your time though, because the answer today is no.",
    "at": 357
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Understood. Have a read and come back to me when the proposal load picks up, because it always does, and the studios that move early are the ones not scrambling in their busiest quarter.",
    "at": 366
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Priya Shah",
    "text": "Thanks Jordan. It is a no for now, and I would rather be straight with you about it.",
    "at": 382
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Priya Shah",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "Founder",
     "confidence": 0.82,
     "span": null
    },
    "email": {
     "value": "priya@afterglowstudio.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1103",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Afterglow Studio",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Creative branding studio",
     "confidence": 0.82,
     "span": null
    },
    "headcount": {
     "value": 12,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Collingwood, VIC",
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
     "value": 15400,
     "confidence": 0.88,
     "span": null
    },
    "outcome": {
     "value": "lost",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the scope and the numbers through this afternoon",
     "confidence": 0.96,
     "span": 24
    }
   ],
   "objections": [
    {
     "text": "We do not have the volume to justify a build like that",
     "handling": "ignored",
     "span": 5
    },
    {
     "text": "That is more than we spent on our entire software stack last year",
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
    "span": 5
   },
   "talkRatio": 0.66,
   "notes": "Jordan quoted a build price in the first sentence, never asked what the studio does, talked past the volume and cost objections and left with no next step."
  },
  "icpSignals": {
   "industry": "Creative branding studio",
   "headcountBand": "under-15",
   "role": "Founder",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Afterglow Studio",
   "body": "Hi Priya,\n\nThanks for being straight with me today. It sounds like the current setup is working for you, so I won't push.\n\nWhat I owe you:\n- Send the scope and the numbers through this afternoon\n\nIf that changes, send me a note and I'll pick it up from there.\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-01T14:08:30+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-01T14:09:30+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-01T14:09:30+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-01T14:10:30+10:00",
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
  "at": "2026-09-02T11:00:00+10:00",
  "durationSeconds": 430,
  "outcome": "stalled",
  "trigger": "Partners want a contract review pilot before the next financial year",
  "summary": "Interest is real, timing is not. Daniel (Operations Lead, 95 staff) is dealing with partners want a contract review pilot before the next financial year.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Daniel, thanks for making the time. I have you as Daniel Ortiz, Operations Lead at Kite & Co, a commercial law firm in the CBD. What prompted you to take the call with Eleno?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That is right. Our partners have asked for a contract review pilot before the next financial year. They have all read the same three articles and now want to know why we are still reading leases line by line.",
    "at": 18
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What sort of contracts, and what volume are we talking about?",
    "at": 38
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Mostly commercial leases and supply agreements. The property team alone reviews around ninety leases a quarter, and a first-pass review of a lease is two to four hours for a junior before a partner looks at it at all.",
    "at": 44
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What does that first pass actually involve?",
    "at": 64
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Pulling the key dates, the rent review mechanism, assignment and make-good clauses and anything unusual into a summary the partner reads. Ninety per cent of it is the same fields every single time. The judgement is in the other ten per cent.",
    "at": 68
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where do the documents sit, and what does the summary get written into?",
    "at": 90
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Documents are in our practice management system and summaries are Word memos saved against the matter. There is a precedent template that everyone has quietly modified, so no two summaries look the same, which the partners complain about constantly.",
    "at": 97
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "If the pilot works, what does the partner group see that convinces them?",
    "at": 117
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "A junior producing a first-pass summary in twenty minutes instead of three hours, with the same fields every time, and a partner able to see where each field came from in the document. If they cannot trace it back to the clause they will not trust it.",
    "at": 124
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "And who decides whether the pilot becomes a project?",
    "at": 149
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "The partnership decides, which is eleven people who meet monthly. I can recommend it and I can find budget for a pilot inside the operations line, but a build of any real size goes to them.",
    "at": 153
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Understood. What I would propose is a two-week discovery phase on the property team's lease review, then a fixed-scope build of a clause extraction and summary agent that writes into your precedent template with a link back to the source clause. For ninety leases a quarter plus the supply agreements, that build sits around $132,000.",
    "at": 172
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That number has to go to the partnership, and they will not approve it before they have seen the pilot work on our own leases.",
    "at": 201
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is reasonable, and it is why the discovery phase is priced and scoped separately. It is small enough to sit inside your operations line, and at the end you have a measured baseline and output on your own documents to put in front of them.",
    "at": 214
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That helps. What I cannot give you is a date for the partnership, because the next meeting agenda is already full and the one after that is the financial year planning session.",
    "at": 238
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Then let us work to what you control. If the discovery phase runs this month, you walk into the planning session with real output instead of a proposal.",
    "at": 255
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "In principle yes. In practice I need the managing partner to agree to the discovery phase first, and he is in a hearing until the end of next week.",
    "at": 269
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Is there anything I can put in his hands that makes that a five-minute conversation?",
    "at": 285
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "A single page with the cost, the two weeks and exactly which leases you would work on. He will not read more than a page before he is back in front of a client.",
    "at": 292
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will send a one-page discovery phase scope by Friday. I will send a redacted sample summary from a lease you provide as well, so he is looking at output rather than a description of it.",
    "at": 310
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Send the scope first. I will not have a lease cleared for you to use until our risk partner signs off the confidentiality side, and that takes its own week.",
    "at": 329
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Understood. We can work from a publicly available lease in the meantime so nobody has to clear anything, then swap to yours once it is approved.",
    "at": 345
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That would help, although the partners will say a public lease proves nothing about our precedents.",
    "at": 358
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "They would be right, which is why it is a stopgap rather than the evidence. The evidence is the discovery phase on your own files, with your own template.",
    "at": 367
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "Agreed. Realistically I am looking at getting this in front of the partnership in October, not September, and I would rather tell you that now than string it out.",
    "at": 382
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I appreciate it. I will keep the scope current and check in the week the hearing finishes. If the managing partner wants to talk before then I can be in the CBD at a day's notice.",
    "at": 397
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Daniel Ortiz",
    "text": "That works. I will come back to you once I know whether the discovery phase can come out of operations without the partnership signing it off first.",
    "at": 416
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
     "confidence": 0.96,
     "span": 0
    },
    "email": {
     "value": "daniel@kiteandco.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1104",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Kite & Co",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Commercial law firm",
     "confidence": 0.96,
     "span": 0
    },
    "headcount": {
     "value": 95,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Melbourne CBD, VIC",
     "confidence": 0.82,
     "span": null
    }
   },
   "deal": {
    "stage": {
     "value": "evaluation",
     "confidence": 0.88,
     "span": null
    },
    "valueAud": {
     "value": 132000,
     "confidence": 0.96,
     "span": 12
    },
    "outcome": {
     "value": "stalled",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send a one-page discovery phase scope by Friday",
     "confidence": 0.96,
     "span": 20
    },
    {
     "value": "I will send a redacted sample summary from a lease you provide",
     "confidence": 0.96,
     "span": 20
    }
   ],
   "objections": [
    {
     "text": "That number has to go to the partnership, and they will not approve it before they have seen the pilot work on our own leases",
     "handling": "partial",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Sam to send a one-page discovery phase scope and a sample lease summary for Daniel to put in front of the managing partner, with no date agreed.",
    "confidence": 0.88,
    "span": 20
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
    "span": 20
   },
   "objectionHandling": {
    "value": "partial",
    "span": 13
   },
   "talkRatio": 0.44,
   "notes": "Strong discovery on the lease review workflow, but the partnership holds the decision, the managing partner was unavailable and the next step carries no date."
  },
  "icpSignals": {
   "industry": "Commercial law firm",
   "headcountBand": "81-120",
   "role": "Operations Lead",
   "trigger": "Partners want a contract review pilot before the next financial year"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Kite & Co",
   "body": "Hi Daniel,\n\nThanks for the time today.\nYou mentioned partners want a contract review pilot before the next financial year; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send a one-page discovery phase scope by Friday\n- Send a redacted sample summary from a lease you provide\n\nNext step: Sam to send a one-page discovery phase scope and a sample lease summary for Daniel to put in front of the managing partner, with no date agreed.\n\nNo rush on your side; when the timing is clearer I'm happy to walk the decision makers through it.\n\nSam Whitfield"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-02T11:09:10+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-02T11:10:10+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-02T11:10:10+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-02T11:11:10+10:00",
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
  "at": "2026-09-02T15:30:00+10:00",
  "durationSeconds": 420,
  "outcome": "lost",
  "trigger": null,
  "summary": "Not a fit right now. Jordan opened with a build price, never asked a question, and talked past the free spreadsheet Lucy already relies on.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Hi Lucy Beck, Jordan Lee from Eleno. Thanks for making time to talk about Craftwork. We build custom AI agents and workflow automation for growing businesses, and a fixed-scope build usually lands between $25,000 and $45,000, with a short paid discovery phase in front of it.",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Hi Jordan. I should say upfront that we're eight people in Northcote, some of them casual. We sell craft supplies and run weekend workshops. That number is more than we spend on rent in a quarter.",
    "at": 24
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Understood, and we do scale the scope. The smallest thing we build for a retailer like yours is usually a booking and enquiry agent that answers workshop questions, holds places and pushes the confirmed bookings into your systems without anyone retyping them.",
    "at": 42
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "My daughter built us a booking spreadsheet that does most of this. It's not elegant, but it works and it costs nothing.",
    "at": 64
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Spreadsheets are fine until the volume moves. Once you're running four workshops a week, the enquiries, the waitlists and the refunds all land in one inbox, and that inbox is you. Automation takes the repetitive part off the owner.",
    "at": 75
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "The inbox is me, that's true. But it's maybe twenty emails a week, and I quite like knowing who's coming.",
    "at": 95
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That familiarity is worth keeping, and an agent doesn't remove it. What it removes is the retyping, the double bookings and the late replies. We deploy it into your own systems and transfer the intellectual property to you, so there's no ongoing subscription.",
    "at": 105
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Transferring the ownership sounds good, but I'd still be paying for the build, and the build is the part I can't cover.",
    "at": 127
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "There's a managed optimisation option afterwards as well, from about $1,500 a month, which keeps the agent tuned as your workshop mix changes. Most clients see the payback inside six months once the hours come back.",
    "at": 138
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Six months of payback assumes those hours are worth something in cash. For us they're just my evenings.",
    "at": 157
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Your evenings are the cost. Owners undervalue that constantly. If we take five hours a week back, that's two hundred and fifty hours a year, and it's the difference between opening a second shop and staying where you are.",
    "at": 166
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "We're not opening a second shop. We're trying to make this one pay for itself.",
    "at": 186
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Then the case is stronger, because margin in retail comes from the parts nobody wants to do. Stock reordering, supplier emails, workshop reminders, the follow-up note that sells the next class. All of that is automatable.",
    "at": 194
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Some of that I actually enjoy. The follow-up notes are how people come back.",
    "at": 212
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will send a one-page overview of the build packages so you can see what is included at each level. It sets out the discovery phase, the fixed build and what the handover looks like.",
    "at": 219
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Send it, but please don't put me on a call schedule. I know the answer for this year.",
    "at": 237
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Fair. Although I'd say the businesses that wait usually wait until something breaks. A missed workshop, a supplier order that never went out, a refund that sat for three weeks. That's when the phone call happens, and it's more expensive then.",
    "at": 247
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Nothing has broken in four years.",
    "at": 268
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Nothing had broken for the last retailer I spoke to either, right up until their stock system stopped talking to their online store during a sale weekend. The point of building this now is that you choose the timing.",
    "at": 271
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Or the point of waiting is that I spend the money on stock instead.",
    "at": 291
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Both can be true. What I'd encourage is looking at the annual number rather than the project number. Spread across three years with the ownership in your hands, a build that removes five hours a week is cheap per hour.",
    "at": 298
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "I don't think in per-hour terms. I think in whether the bank balance survives February.",
    "at": 318
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That's exactly why the discovery phase exists. It's short, it's fixed, and it tells you what is worth automating before you commit to a build. Plenty of clients stop after discovery with a plan and no build.",
    "at": 326
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "A plan I can't afford to act on isn't much use to me.",
    "at": 345
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "It's a plan you can act on in stages. Start with the booking agent, add the supplier reordering next year, then the reporting. We build in fixed scopes precisely so it doesn't have to be one big commitment.",
    "at": 352
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Staged still starts at the first stage, and the first stage is the part I'm saying no to.",
    "at": 371
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Understood. I'll keep the overview practical rather than glossy, with the inclusions, the assumptions and an honest note on where this sort of automation doesn't pay for a team your size.",
    "at": 381
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "That last part would be the useful bit, honestly.",
    "at": 396
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Then I'll lead with it. And if the workshop side grows, or you take on wholesale, the numbers change quickly and it's worth another look.",
    "at": 401
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Lucy Beck",
    "text": "Thanks Jordan. Good luck with it, but we'll stay as we are.",
    "at": 414
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Lucy Beck",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "Owner",
     "confidence": 0.96,
     "span": 4
    },
    "email": {
     "value": "lucy@craftwork.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1105",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Craftwork",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Independent craft retail and workshops",
     "confidence": 0.82,
     "span": null
    },
    "headcount": {
     "value": 8,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Northcote, VIC",
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
     "value": 9800,
     "confidence": 0.88,
     "span": null
    },
    "outcome": {
     "value": "lost",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send a one-page overview of the build packages",
     "confidence": 0.96,
     "span": 14
    }
   ],
   "objections": [
    {
     "text": "My daughter built us a booking spreadsheet that does most of this",
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
   "talkRatio": 0.69,
   "notes": "Jordan opened with a build price, never asked a question, and talked past the free spreadsheet Lucy already relies on."
  },
  "icpSignals": {
   "industry": "Independent craft retail and workshops",
   "headcountBand": "under-15",
   "role": "Owner",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Craftwork",
   "body": "Hi Lucy,\n\nThanks for being straight with me today. It sounds like the current setup is working for you, so I won't push.\n\nWhat I owe you:\n- Send a one-page overview of the build packages\n\nIf that changes, send me a note and I'll pick it up from there.\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-02T15:39:00+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-02T15:40:00+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-02T15:40:00+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-02T15:41:00+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-06-meridian-mutual",
  "rep": "Jordan Lee",
  "prospect": "Tom Reid",
  "company": "Meridian Mutual",
  "domain": "meridianmutual.example",
  "at": "2026-09-03T10:00:00+10:00",
  "durationSeconds": 405,
  "outcome": "stalled",
  "trigger": "Complaints volume up after a core banking migration",
  "summary": "Interest is real, timing is not. Tom (Head of Member Services, 118 staff) is dealing with complaints volume up after a core banking migration.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Tom Reid, it's Jordan from Eleno. Before I pitch anything at you, tell me what has actually been happening at Meridian Mutual since the core banking migration?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Complaints are up about forty per cent. Some of that is genuine migration fallout, statements that look wrong, direct debits that moved dates. But a lot of it is members ringing because they can't tell from the new statement what changed. We're a hundred and eighteen people and member services is fourteen of them.",
    "at": 13
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Who is handling that intake today, and what do they have to do for each one?",
    "at": 40
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Two of the team triage the queue every morning. Each complaint has to be classified, logged against the member record, checked for whether it is reportable, and then routed. The classification is the slow part, because our categories were written for the old system and half of them no longer map to anything.",
    "at": 47
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Where do the complaint records actually live once they are logged?",
    "at": 73
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "In the case management module of the new core platform, with the correspondence sitting in a shared mailbox that doesn't talk to it. So people copy and paste between the two. That's where the errors creep in, and it's also why our reporting to the board takes three days to assemble.",
    "at": 79
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "What would good look like in six months, in numbers you would actually be measured on?",
    "at": 103
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Time to first response under one business day, consistent classification so the trend reporting means something, and the two triage people back on the phones instead of in a queue. Right now first response is running at four days and the team is doing overtime to hold even that.",
    "at": 111
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "And who signs something like this off, you or the board?",
    "at": 135
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "That's the honest problem. I can sponsor it, but anything above a threshold goes to the board through the chief operating officer, and the board meets monthly. We're a mutual, so the members own us and the board takes spending seriously.",
    "at": 141
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Right. What we would build is a triage agent that reads the incoming correspondence, classifies it against a category set we design with your team, drafts the acknowledgement, and writes the case record straight into the platform. We deploy it into your environment and transfer the intellectual property to you, so it's yours rather than a subscription.",
    "at": 161
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "The ownership point matters here. Our technology committee is tired of vendor lock-in after what the migration cost us.",
    "at": 188
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That's usually the first thing they ask. On scale, a build like this for Meridian Mutual would sit around $174,000 for the fixed scope, after a discovery phase of four to six weeks.",
    "at": 198
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Budget sits with the board in the new financial year, not with me this month. I can't take a number like that to them in September without a lot more behind it.",
    "at": 214
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Fair. What I'd suggest is not a proposal but a decision brief: the current cost of manual triage, the risk of inconsistent classification in a regulated complaints process, and a staged path with the numbers attached.",
    "at": 229
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "A decision brief would travel better than a deck. The board reacts badly to vendor language, but they will read something that states the problem in our own terms.",
    "at": 247
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will send a decision brief and an indicative staging plan by the end of next week. It will include the questions we would need answered before the scope is firm.",
    "at": 261
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Good. Keep it short. Anything over four pages gets skimmed and then misquoted back at me in the meeting.",
    "at": 276
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Understood. Can we put a working session in with your operations lead and the chief operating officer before the board pack goes out?",
    "at": 285
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "I can't commit to a date. The board pack timing depends on when the migration remediation work is signed off, and that is not mine to schedule.",
    "at": 297
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That's the piece I would want to understand, because a complaints agent built during remediation is easier to justify than one built after the noise has died down.",
    "at": 310
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "I agree in principle. But if I bring it forward and remediation slips, I have spent credibility I need for other things.",
    "at": 324
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Then let's make the brief do the work. I will include a one-page summary the chief operating officer can lift straight into the board pack without editing it.",
    "at": 334
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "That would actually help. He writes those at eleven at night, and anything pre-built tends to get used.",
    "at": 348
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "On the compliance side, we design the classification set with your risk team rather than imposing ours, and every decision the agent makes is logged against the source message.",
    "at": 357
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Risk will want to see that logging before they let it touch a member complaint. They have been burnt once already this year.",
    "at": 371
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That's a reasonable gate, and I would rather they test it properly than wave it through. A complaints process is not the place to find out later.",
    "at": 382
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Tom Reid",
    "text": "Send the brief and I will circulate it. I am not promising a date, but there is real interest here.",
    "at": 395
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Tom Reid",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "Head of Member Services",
     "confidence": 0.82,
     "span": null
    },
    "email": {
     "value": "tom@meridianmutual.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1106",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Meridian Mutual",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Regional mutual bank",
     "confidence": 0.82,
     "span": null
    },
    "headcount": {
     "value": 118,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Geelong, VIC",
     "confidence": 0.82,
     "span": null
    }
   },
   "deal": {
    "stage": {
     "value": "evaluation",
     "confidence": 0.88,
     "span": null
    },
    "valueAud": {
     "value": 174000,
     "confidence": 0.96,
     "span": 12
    },
    "outcome": {
     "value": "stalled",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send a decision brief and an indicative staging plan by the end of next week",
     "confidence": 0.96,
     "span": 16
    },
    {
     "value": "I will include a one-page summary the chief operating officer can lift straight into the board pack",
     "confidence": 0.96,
     "span": 22
    }
   ],
   "objections": [
    {
     "text": "Budget sits with the board in the new financial year, not with me this month",
     "handling": "partial",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Jordan to send a decision brief and staging plan for Tom to circulate to the chief operating officer and the board.",
    "confidence": 0.88,
    "span": 22
   },
   "nextStepDue": null
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 5,
    "span": 0
   },
   "nextStepSecured": {
    "value": false,
    "span": 22
   },
   "objectionHandling": {
    "value": "partial",
    "span": 13
   },
   "talkRatio": 0.45,
   "notes": "Jordan ran good discovery on the complaints queue but reframed the budget blocker into a document instead of reaching the chief operating officer, so the next step has no date."
  },
  "icpSignals": {
   "industry": "Regional mutual bank",
   "headcountBand": "81-120",
   "role": "Head of Member Services",
   "trigger": "Complaints volume up after a core banking migration"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Meridian Mutual",
   "body": "Hi Tom,\n\nThanks for the time today.\nYou mentioned complaints volume up after a core banking migration; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send a decision brief and an indicative staging plan by the end of next week\n- Include a one-page summary the chief operating officer can lift straight into the board pack\n\nNext step: Jordan to send a decision brief and staging plan for Tom to circulate to the chief operating officer and the board.\n\nNo rush on your side; when the timing is clearer I'm happy to walk the decision makers through it.\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-03T10:08:45+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-03T10:09:45+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-03T10:09:45+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-03T10:10:45+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-07-fairfield-wealth",
  "rep": "Sam Whitfield",
  "prospect": "Olivia Hart",
  "company": "Fairfield Wealth Partners",
  "domain": "fairfieldwealth.example",
  "at": "2026-09-04T09:30:00+10:00",
  "durationSeconds": 430,
  "outcome": "won",
  "trigger": "Statement of advice drafting backlog after acquiring a smaller practice",
  "summary": "Strong buying signal. Olivia (Practice Manager, 37 staff) is dealing with statement of advice drafting backlog after acquiring a smaller practice.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Olivia Hart, Sam from Eleno. Before I talk about what we would build, can you confirm you are still the practice manager at Fairfield Wealth Partners in Kew?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Yes, still me. We're thirty-seven people now, which is most of the problem. We acquired a smaller practice in Brighton in June and inherited eleven advisers' worth of clients without inheriting anyone who writes advice documents.",
    "at": 14
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How many statements of advice are you producing in a month now, and how many were you doing before?",
    "at": 31
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Before the acquisition, about thirty a month. Now it's closer to fifty-five and the paraplanning team is still four people. The backlog is sitting at about six weeks, which is embarrassing when the client has already had the meeting and agreed to everything.",
    "at": 40
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Walk me through who touches one of those documents from the adviser meeting to the client signing it?",
    "at": 61
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "The adviser records the meeting and files a note. A paraplanner pulls the fact find, the risk profile and the product research, drafts the statement in our template, then it goes to our compliance manager for review before it goes back to the adviser and out to the client.",
    "at": 70
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Which of those steps takes the longest, and which one do people complain about most?",
    "at": 94
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Drafting takes the longest, easily three to four hours a document. But the complaints are about the queue, not the drafting. Advisers hate telling a client they will have it in six weeks after a good meeting.",
    "at": 101
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where do the fact finds, meeting notes and research reports actually live?",
    "at": 119
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "All in Xplan, with the meeting recordings on our practice drive and the research reports coming out of two different platforms. Nothing is joined up, so the paraplanner is effectively the integration layer between four systems.",
    "at": 125
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "And if this worked, what would you be able to say to the advisers in three months?",
    "at": 142
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "That a straightforward statement of advice comes back in five working days, not six weeks, and that the compliance manager is not rewriting half of it. If we hit that, the Brighton advisers stop asking whether the merger was a mistake.",
    "at": 150
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Here is what I would build. A drafting assistant that pulls the fact find, the risk profile and the research out of Xplan, drafts the statement against your own template and your own wording standards, and hands the paraplanner a document to review rather than a blank page. It runs in your environment and the intellectual property comes to you at handover.",
    "at": 170
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Our compliance manager will want to see how it logs its sources before any adviser is allowed to use it. Every sentence in a statement of advice has to be traceable back to something in the client file.",
    "at": 200
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is the right gate, and it is built in rather than bolted on. Every generated paragraph carries a reference to the meeting note, the fact find field or the research document it came from, and she gets that source log next to the draft. Nothing is asserted without a source behind it.",
    "at": 219
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "If she can see that log, she will be the one pushing for this. She has been asking the advisers for cleaner file notes for two years.",
    "at": 244
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "On scale, a fixed-scope build for Fairfield Wealth Partners lands at $59,600, after a discovery phase of about three weeks where we sit with the paraplanners and map the real template variations.",
    "at": 257
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "That's more than I expected and less than I feared. What I can't do is sign it myself. Both principals are in client meetings until Thursday.",
    "at": 273
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That's fine. I will send the scope, the source logging design and the fixed price by Wednesday so the principals have it before they are in a room together.",
    "at": 286
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Wednesday works. Put the source logging section first, because that is what our compliance manager will actually read.",
    "at": 300
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Can we lock in Thursday 10 September at 2pm with you, both principals and the compliance manager to walk through it?",
    "at": 308
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Thursday 10 September at 2pm works. I will get all four of us in the room, which is harder than it sounds.",
    "at": 319
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Good. I will also include two worked examples built from your own template, one simple and one with a superannuation recommendation, so it is not an abstract conversation.",
    "at": 329
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Worked examples will do more than any slide. Both principals came up through paraplanning, so they will pick them apart line by line.",
    "at": 343
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I want them to. If the draft quality is not good enough for a senior paraplanner, the backlog does not move and we have built the wrong thing.",
    "at": 354
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Agreed. The other thing they will ask is what happens when the template changes. We update it every time the licensee changes its requirements, which is at least twice a year.",
    "at": 367
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "The template stays yours and the assistant reads it rather than hard-coding it, so a licensee change is a template edit, not a rebuild. That is part of why we transfer the intellectual property at handover.",
    "at": 382
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "That is the answer they will want. We were burnt by a provider who owned the configuration and charged us to change a heading.",
    "at": 400
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Understood. Managed optimisation afterwards is optional and month to month, so if you want to run it yourselves once the team is comfortable, that is genuinely fine.",
    "at": 412
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Olivia Hart",
    "text": "Thanks Sam. Send it Wednesday and we will see you Thursday.",
    "at": 425
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Olivia Hart",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "Practice Manager",
     "confidence": 0.96,
     "span": 0
    },
    "email": {
     "value": "olivia@fairfieldwealth.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1107",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Fairfield Wealth Partners",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Financial planning and wealth advice firm",
     "confidence": 0.82,
     "span": null
    },
    "headcount": {
     "value": 37,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Kew, VIC",
     "confidence": 0.96,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "closed_won",
     "confidence": 0.88,
     "span": null
    },
    "valueAud": {
     "value": 59600,
     "confidence": 0.96,
     "span": 16
    },
    "outcome": {
     "value": "won",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the scope, the source logging design and the fixed price by Wednesday",
     "confidence": 0.96,
     "span": 18
    },
    {
     "value": "I will also include two worked examples built from your own template",
     "confidence": 0.96,
     "span": 22
    }
   ],
   "objections": [
    {
     "text": "Our compliance manager will want to see how it logs its sources before any adviser is allowed to use it",
     "handling": "handled",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Sam to send scope, source logging design and fixed price, then walk both principals and the compliance manager through it.",
    "confidence": 0.88,
    "span": 22
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
    "span": 22
   },
   "objectionHandling": {
    "value": "handled",
    "span": 13
   },
   "talkRatio": 0.48,
   "notes": "Sam quantified the advice drafting backlog before pricing anything and answered the source logging gate with a concrete design, then booked a dated session with both principals and the compliance manager."
  },
  "icpSignals": {
   "industry": "Financial planning and wealth advice firm",
   "headcountBand": "25-80",
   "role": "Practice Manager",
   "trigger": "Statement of advice drafting backlog after acquiring a smaller practice"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Fairfield Wealth Partners",
   "body": "Hi Olivia,\n\nThanks for the time today.\nYou mentioned statement of advice drafting backlog after acquiring a smaller practice; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send the scope, the source logging design and the fixed price by Wednesday\n- Also include two worked examples built from your own template\n\nNext step: Sam to send scope, source logging design and fixed price, then walk both principals and the compliance manager through it.\n\nSam Whitfield"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-04T09:39:10+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-04T09:40:10+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-04T09:40:10+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-04T09:41:10+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-08-ridgeline-commercial",
  "rep": "Sam Whitfield",
  "prospect": "Ben Wallace",
  "company": "Ridgeline Commercial",
  "domain": "ridgelinecommercial.example",
  "at": "2026-09-04T14:15:00+10:00",
  "durationSeconds": 415,
  "outcome": "won",
  "trigger": "Lease abstraction and tenant reporting taking a week every month",
  "summary": "Strong buying signal. Ben (Director, 52 staff) is dealing with lease abstraction and tenant reporting taking a week every month.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Ben Wallace, Sam from Eleno. Before I get into anything, are you still the director running the commercial management side at Ridgeline Commercial?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "That's me. Fifty-two people in Cremorne, and about two thirds of that is property management rather than sales. The thing I booked this call about is lease abstraction. It eats a week every month.",
    "at": 11
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Tell me what that week actually looks like, hour by hour if you can?",
    "at": 28
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Two property analysts sit with a pile of lease documents and pull out the key terms. Commencement, expiry, rent review dates and mechanisms, outgoings recovery, make good, option periods. They type those into our management system and then build the tenant reports off the back of it.",
    "at": 35
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How many leases are moving through that in a month?",
    "at": 59
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "New and varied, about forty. But the reporting covers the whole portfolio, which is around eleven hundred tenancies across three hundred assets. So it is not just the new ones, it is every review date and every outgoings reconciliation.",
    "at": 64
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where do the lease documents live and what state are they in?",
    "at": 83
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Mostly PDFs in our document management system, some scanned, some native. Quality varies a lot, especially anything inherited when we took over a portfolio. There are deeds of variation sitting as separate files that nobody has linked back to the head lease.",
    "at": 89
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What breaks when someone gets an abstraction wrong?",
    "at": 110
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "A missed rent review is the expensive one. We had one last year where an option date passed and the tenant held over at the old rent for eighteen months. The owner was not delighted, and we wore part of it.",
    "at": 114
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "And what would a good outcome look like to you, in a way your owners would notice?",
    "at": 134
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Reporting that goes out in a day instead of a week, no missed critical dates, and the two analysts spending their time on arrears and owner relationships rather than typing. If owners get their reports on the third of the month every month, that is something we can sell on a new mandate.",
    "at": 143
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "So what we would build is a lease abstraction pipeline. It reads the lease and any variations, extracts the terms against a schema you define, flags anything it is not confident about for a human to check, and writes the confirmed terms into your management system. The tenant reports then generate from that.",
    "at": 169
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "The flagging part is what I would want to press on. If it quietly guesses a rent review mechanism and gets it wrong, that is worse than the analyst typing it.",
    "at": 196
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Agreed, and that is the design principle rather than a feature we added later. Every extracted term carries a confidence and a pointer to the clause it came from. Anything below threshold goes to a review queue instead of into the system. Your analysts become checkers on the hard ten per cent rather than typists on all of it.",
    "at": 211
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "That I can sell internally. The analysts will not fight something that removes the boring eighty per cent.",
    "at": 240
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "On numbers, a fixed-scope build for Ridgeline Commercial lands at $78,200, with a discovery phase of about three weeks first, where we run a sample of your real leases through and measure the extraction quality.",
    "at": 249
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Measuring on our own leases before we commit is the right way round. What does the discovery phase cost on its own?",
    "at": 267
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Six thousand for this scope, and it comes off the build if you proceed. I will send the discovery scope and the fixed build price by Thursday with the sample methodology attached.",
    "at": 278
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Thursday is fine. Send it to me and I will bring in our head of property management, because she owns the reporting calendar.",
    "at": 294
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Can we book Friday 11 September at 9am with you and your head of property management to go through it?",
    "at": 305
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Friday 11 September at 9am works. She is in the office on Fridays anyway.",
    "at": 315
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Good. I will also run twenty of your real leases through the extraction before that meeting, so we are looking at your numbers rather than a generic accuracy claim.",
    "at": 322
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Twenty is enough to show me whether it handles the messy inherited ones. Pick some from the portfolio we took on in Ballarat, they are the worst of it.",
    "at": 336
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will ask for those specifically. If it struggles on scanned deeds of variation, better that we both know in September than in March.",
    "at": 351
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "That is an honest answer. The last provider we looked at demonstrated on a clean template lease and would not touch ours.",
    "at": 363
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "The other thing worth saying is that we deploy into your environment and transfer the intellectual property at handover. You are not renting this back from us forever.",
    "at": 374
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "That matters on the owners' side as well. They ask who holds the data whenever we pitch for a new mandate.",
    "at": 388
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Then we will cover data residency and ownership in the scope document, so you have an answer in writing rather than a verbal assurance.",
    "at": 398
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Ben Wallace",
    "text": "Thanks Sam. Thursday for the document, Friday for the meeting.",
    "at": 410
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
     "confidence": 0.96,
     "span": 0
    },
    "email": {
     "value": "ben@ridgelinecommercial.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1108",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Ridgeline Commercial",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Commercial real estate agency",
     "confidence": 0.82,
     "span": null
    },
    "headcount": {
     "value": 52,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Cremorne, VIC",
     "confidence": 0.96,
     "span": 1
    }
   },
   "deal": {
    "stage": {
     "value": "closed_won",
     "confidence": 0.88,
     "span": null
    },
    "valueAud": {
     "value": 78200,
     "confidence": 0.96,
     "span": 16
    },
    "outcome": {
     "value": "won",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the discovery scope and the fixed build price by Thursday with the sample methodology attached",
     "confidence": 0.96,
     "span": 18
    },
    {
     "value": "I will also run twenty of your real leases through the extraction before that meeting",
     "confidence": 0.96,
     "span": 22
    }
   ],
   "objections": [
    {
     "text": "If it quietly guesses a rent review mechanism and gets it wrong, that is worse than the analyst typing it",
     "handling": "handled",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Sam to send the discovery scope and fixed build price, then review the sample extraction with Ben and the head of property management.",
    "confidence": 0.88,
    "span": 22
   },
   "nextStepDue": "2026-09-11"
  },
  "scorecard": {
   "discoveryQuestions": {
    "value": 6,
    "span": 0
   },
   "nextStepSecured": {
    "value": true,
    "span": 22
   },
   "objectionHandling": {
    "value": "handled",
    "span": 13
   },
   "talkRatio": 0.47,
   "notes": "Sam sized the abstraction workload and the cost of a missed rent review before quoting, answered the silent-guess risk with a confidence threshold and review queue, and booked a dated session with the reporting owner."
  },
  "icpSignals": {
   "industry": "Commercial real estate agency",
   "headcountBand": "25-80",
   "role": "Director",
   "trigger": "Lease abstraction and tenant reporting taking a week every month"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Ridgeline Commercial",
   "body": "Hi Ben,\n\nThanks for the time today.\nYou mentioned lease abstraction and tenant reporting taking a week every month; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send the discovery scope and the fixed build price by Thursday with the sample methodology attached\n- Also run twenty of your real leases through the extraction before that meeting\n\nNext step: Sam to send the discovery scope and fixed build price, then review the sample extraction with Ben and the head of property management.\n\nSam Whitfield"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-04T14:23:55+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-04T14:24:55+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-04T14:24:55+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-04T14:25:55+10:00",
    "icon": "mail"
   }
  ]
 },
 {
  "id": "call-09-bellbird-auctions",
  "rep": "Jordan Lee",
  "prospect": "Aisha Rahman",
  "company": "Bellbird Auctions",
  "domain": "bellbirdauctions.example",
  "at": "2026-09-07T10:00:00+10:00",
  "durationSeconds": 450,
  "outcome": "won",
  "trigger": "Consignment intake and cataloguing bottleneck before the spring sales",
  "summary": "Strong buying signal. Aisha (General Manager, 48 staff) is dealing with consignment intake and cataloguing bottleneck before the spring sales.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Aisha Rahman, thanks for making time. I have Bellbird Auctions as forty-eight people in Malvern, and you run the house day to day as general manager, is that right?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That's right. Specialists, cataloguers, front of house, finance and a small logistics team. The pressing thing is consignment intake before the spring sales. We take in more in six weeks than across the rest of the year, and the cataloguing queue never clears in time.",
    "at": 15
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Walk me through what happens from the moment a seller brings a piece in?",
    "at": 38
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "A specialist writes condition notes on paper or in an email, someone re-keys those into our sale management system, then a cataloguer writes the lot description, measurements and provenance line. The same information gets typed three times before it reaches the printed catalogue.",
    "at": 45
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "How many lots go through that path in a spring season, and who carries the re-keying?",
    "at": 67
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "About two thousand two hundred lots across four sales. Two cataloguers and one administrator carry it, with specialists checking descriptions at night. Through August and September they are all working weekends, and we still push consignment deadlines back.",
    "at": 75
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Where does the source material actually live, the photographs, the condition notes, the seller correspondence?",
    "at": 94
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Photographs sit in a shared drive by sale number, notes are in the sale management system, and seller correspondence is in individual inboxes. Provenance documents are usually scanned files a seller emails us. Nothing is joined up, so a cataloguer hunts before they write.",
    "at": 102
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "If this worked the way you wanted next spring, what would be different?",
    "at": 124
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "A specialist records condition notes once, and a first-pass lot description comes back with measurements, materials and a provenance paragraph already drafted from the documents we hold. The cataloguer edits rather than writes. I would take that even at seventy percent quality.",
    "at": 131
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Who signs off on something like this, and what do they care about?",
    "at": 153
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "I recommend, our managing director approves, and the board sees anything over a threshold. He cares about catalogue accuracy, because a wrong attribution is a serious problem for a house like ours. The board cares about whether we own what we pay for.",
    "at": 159
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Here is roughly where this lands. A short paid discovery phase to map intake and cataloguing, then a fixed-scope build of an intake and cataloguing assistant. For a house your size that build sits near $64,000, and the agents and prompts are handed over to you at the end. Managed optimisation afterwards is optional.",
    "at": 181
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That is the part I want to push on. We do not want another subscription that we can never switch off. We already pay three vendors forever and own nothing at the end of it.",
    "at": 209
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That is exactly why we transfer the intellectual property. At handover the agents, the prompts and the pipeline are yours, running inside your own systems, and you can keep them without us. Optimisation is a choice you make later, not a condition of the build. I will send the discovery phase scope and a fixed-price build proposal by Thursday.",
    "at": 227
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Good. The managing director will want to know what happens the first time the assistant gets an attribution wrong.",
    "at": 257
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will include the review workflow and the accuracy checks your cataloguers would run. Every drafted description reaches a cataloguer with the source it was built from, so they check against the condition note rather than trusting the text. Nothing goes to print without a human signing it off.",
    "at": 266
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That will land well. He has sat through demonstrations where the output looked confident and was quietly wrong, and it made him wary of the whole category.",
    "at": 291
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Can we meet Thursday 10 September at 2pm with you and the managing director to walk the scope?",
    "at": 305
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Yes, Thursday 10 September at 2pm works. I will bring him and our head cataloguer, who knows the real bottlenecks better than either of us.",
    "at": 314
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Before then I will confirm which of your systems we can reach through an interface. That shapes the build more than anything else does.",
    "at": 327
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "The sale management system has a partner interface, and the shared drive is straightforward. The provenance documents are the messy part, because sellers send anything from a typed letter to a photograph of a handwritten receipt.",
    "at": 339
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That is normal. Document extraction copes with the messy end, and anything it cannot read confidently gets flagged rather than guessed.",
    "at": 358
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Flagging is the right behaviour. A blank field a cataloguer fills in is fine. An invented provenance line would do us real damage with a consignor.",
    "at": 368
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Agreed. We would set that confidence threshold with your cataloguers during discovery rather than choosing it for them.",
    "at": 382
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "They will appreciate being asked. They have been told before that a new system would save them time, and it just moved the typing somewhere else in the process.",
    "at": 391
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The discovery phase is short and paid on purpose. If the saving is not there you stop with a clear picture and no build commitment.",
    "at": 406
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "That is a fair way to start. It also gives me something concrete for the board rather than a vendor promise about hours saved.",
    "at": 418
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I will keep the proposal to two pages plus the scope. Anything longer will not get read before Thursday.",
    "at": 431
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Aisha Rahman",
    "text": "Thanks Jordan. Send it Wednesday if you can, and I will have read it properly before we sit down.",
    "at": 440
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Aisha Rahman",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "General Manager",
     "confidence": 0.96,
     "span": 0
    },
    "email": {
     "value": "aisha@bellbirdauctions.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1109",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Bellbird Auctions",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Fine art and collectables auction house",
     "confidence": 0.82,
     "span": null
    },
    "headcount": {
     "value": 48,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Malvern, VIC",
     "confidence": 0.96,
     "span": 0
    }
   },
   "deal": {
    "stage": {
     "value": "closed_won",
     "confidence": 0.88,
     "span": null
    },
    "valueAud": {
     "value": 64000,
     "confidence": 0.96,
     "span": 12
    },
    "outcome": {
     "value": "won",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the discovery phase scope and a fixed-price build proposal by Thursday",
     "confidence": 0.96,
     "span": 14
    },
    {
     "value": "I will include the review workflow and the accuracy checks your cataloguers would run",
     "confidence": 0.96,
     "span": 16
    }
   ],
   "objections": [
    {
     "text": "We do not want another subscription that we can never switch off",
     "handling": "handled",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Jordan to send the discovery scope and build proposal, then meet Aisha and the managing director to walk it through.",
    "confidence": 0.88,
    "span": 16
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
    "span": 16
   },
   "objectionHandling": {
    "value": "handled",
    "span": 13
   },
   "talkRatio": 0.44,
   "notes": "Jordan mapped the intake and cataloguing workflow before pricing anything, answered the subscription objection with the IP transfer rather than dismissing it, and left with a dated meeting including the approver."
  },
  "icpSignals": {
   "industry": "Fine art and collectables auction house",
   "headcountBand": "25-80",
   "role": "General Manager",
   "trigger": "Consignment intake and cataloguing bottleneck before the spring sales"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Bellbird Auctions",
   "body": "Hi Aisha,\n\nThanks for the time today.\nYou mentioned consignment intake and cataloguing bottleneck before the spring sales; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send the discovery phase scope and a fixed-price build proposal by Thursday\n- Include the review workflow and the accuracy checks your cataloguers would run\n\nNext step: Jordan to send the discovery scope and build proposal, then meet Aisha and the managing director to walk it through.\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-07T10:09:30+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-07T10:10:30+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-07T10:10:30+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-07T10:11:30+10:00",
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
  "at": "2026-09-08T13:30:00+10:00",
  "durationSeconds": 360,
  "outcome": "lost",
  "trigger": null,
  "summary": "Not a fit right now. Jordan opened with a build price, never asked a question, and talked past the freelancer comparison and the budget signal instead of qualifying a ten-person retailer out or down.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Noah Spencer, thanks for the call. Eleno builds custom AI agents for growing Australian businesses, and a first project for a retailer usually lands around $11,200 for a fixed scope build. For a shop like yours that is supplier order drafting, stock alerts and customer enquiry replies handled automatically.",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Thanks Jordan. Lumen Lane Retail is ten people if you count casuals. We sell lighting out of a Prahran showroom and online. I was mostly ringing to hear what this sort of thing costs.",
    "at": 20
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Then you are asking the right question. Most retailers we speak to lose a day a week to reordering and enquiry email. An agent reads the supplier price lists, drafts the purchase order and puts it in front of you to approve. Another answers the lead time questions from the website.",
    "at": 34
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "We are comparing you to a freelancer who set up our stock alerts for a few hundred dollars. He did it in a weekend and it has run since.",
    "at": 54
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The build also covers what a script never touches. We document the workflow, deploy it into your own systems and transfer the code, so nothing sits on a stranger's laptop. That is the difference between a weekend fix and something you can lean on in December.",
    "at": 66
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "December is busy, but it is two of us and four casuals. Nobody here is drowning in purchase orders.",
    "at": 85
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "A lot of it is invisible. Supplier confirmations, backorder chasing, freight notifications, customer emails about whether a pendant is in stock. Individually two minutes. Across a month it is a part-time role nobody has ever costed.",
    "at": 92
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "We have costed it, roughly. It is maybe four hours a week between the two of us, and a fair bit of that is talking to customers, which we quite like doing.",
    "at": 107
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The discovery phase would tell us exactly where those hours sit. It is short and paid, we map the workflow, and the build is fixed scope from there. The real number is usually higher than owners expect.",
    "at": 120
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Paying to be told how long our own admin takes is a hard sell to my co-owner. She does most of the ordering.",
    "at": 135
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "It is not about measuring, it is about designing the agents so they hold up. Skip discovery and you get something brittle that breaks the first time a supplier changes a template. Then you pay twice.",
    "at": 144
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Our templates barely change. We buy from six suppliers and have done for years.",
    "at": 159
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Six suppliers is a good starting point, because the extraction is simple and we can get the drafting live quickly. We would connect the website enquiries too, so a lead time question gets a drafted reply with the real stock position attached.",
    "at": 164
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "People email us because they want a person. If they get an obviously automated reply about a pendant, that is worse than a slow one.",
    "at": 181
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Ours are drafts, not sends, so a human always approves. The quality is well past what people picture. The bigger risk for a shop your size is staying manual while the chains automate their whole back office.",
    "at": 192
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "We do not really compete with the chains. Our customers come to us because they want someone who knows lighting.",
    "at": 207
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "That expertise is exactly what the agents free up. Every hour on a purchase order is an hour off the showroom floor. I will send the automation overview so you can see what the build includes and what the handover looks like.",
    "at": 215
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Send it through. I should be straight with you though, eleven thousand is more than we have spent on any system, ever.",
    "at": 232
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Weigh it against the payback. Our average across clients is about six months, so by winter it has paid for itself and the asset stays yours. A subscription is still billing you in year three.",
    "at": 241
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "The subscription part I like. The number is the problem, not the model.",
    "at": 255
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The number reflects real engineering rather than a template. A scoped build, testing against your actual supplier documents, and the code handed across at the end. A weekend script gives you none of that when it stops.",
    "at": 260
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "If it stops working I will ask him to look at it again. That has been fine so far.",
    "at": 275
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Until he is unavailable, or moves on, or the business has grown and it no longer fits. That is when most of our retail clients call us, and by then they are rebuilding under pressure.",
    "at": 283
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Maybe. But we would rather hit that wall than spend the money now on something we might not need.",
    "at": 297
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "The overview sets out a smaller starting scope, just the supplier ordering, which brings the build down. Still a proper engagement with discovery in front of it, but a narrower first step.",
    "at": 305
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Even narrower, I think we are in a different bracket to your usual client.",
    "at": 317
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "I would not write yourself off. We have built for teams smaller than yours where the owner was the bottleneck. The ones who move early get the compounding benefit.",
    "at": 323
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "I appreciate the pitch, Jordan, but we are going to stay with what we have. It suits how we buy.",
    "at": 335
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "No problem at all. The overview is still worth a read, and it lists the questions to put to any automation provider, including the freelancer, so you can test whether what you have is holding up.",
    "at": 343
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Noah Spencer",
    "text": "Fair enough. Thanks for your time.",
    "at": 358
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Noah Spencer",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "Co-owner",
     "confidence": 0.96,
     "span": 9
    },
    "email": {
     "value": "noah@lumenlaneretail.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1110",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Lumen Lane Retail",
     "confidence": 0.96,
     "span": 1
    },
    "industry": {
     "value": "Boutique lighting retailer",
     "confidence": 0.82,
     "span": null
    },
    "headcount": {
     "value": 10,
     "confidence": 0.88,
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
     "confidence": 0.96,
     "span": 0
    },
    "outcome": {
     "value": "lost",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send the automation overview",
     "confidence": 0.96,
     "span": 16
    }
   ],
   "objections": [
    {
     "text": "We are comparing you to a freelancer who set up our stock alerts for a few hundred dollars",
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
   "talkRatio": 0.65,
   "notes": "Jordan opened with a build price, never asked a question, and talked past the freelancer comparison and the budget signal instead of qualifying a ten-person retailer out or down."
  },
  "icpSignals": {
   "industry": "Boutique lighting retailer",
   "headcountBand": "under-15",
   "role": "Co-owner",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Lumen Lane Retail",
   "body": "Hi Noah,\n\nThanks for being straight with me today. It sounds like the current setup is working for you, so I won't push.\n\nWhat I owe you:\n- Send the automation overview\n\nIf that changes, send me a note and I'll pick it up from there.\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-08T13:38:00+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-08T13:39:00+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-08T13:39:00+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-08T13:40:00+10:00",
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
  "at": "2026-09-09T09:45:00+10:00",
  "durationSeconds": 430,
  "outcome": "stalled",
  "trigger": "Fee proposal drafting and consultant coordination ahead of an office move",
  "summary": "Interest is real, timing is not. Grace (Studio Operations Manager, 44 staff) is dealing with fee proposal drafting and consultant coordination ahead of an office move.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Grace Kim, thanks for speaking with me. I have Banksia Architects as a forty-four person studio in Fitzroy, and you manage studio operations, is that right?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Yes. We're moving office next quarter, and pulling the studio apart has shown how much of our process lives in people's heads. I'm gathering options before the directors decide what to fund for the new financial year.",
    "at": 13
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "What is taking the most time across the studio right now?",
    "at": 30
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Fee proposals. Every new project starts with one, and each takes a director and me two or three days. We pull scope from the client brief, stages from a template nobody fully trusts, rates from a spreadsheet, and consultant allowances from the last similar job.",
    "at": 36
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "How many of those go out in a year, and who writes them?",
    "at": 58
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Somewhere near ninety. Three directors write them, I chase the pieces, and our practice accountant checks the numbers at the end. About a third are for repeat clients where most of the content already exists in a proposal we then cannot find.",
    "at": 64
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Where do the finished proposals and the consultant information actually sit?",
    "at": 84
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Proposals are in project folders on the shared drive, named however the director felt that week. Consultant quotes arrive by email and stay there. The fee spreadsheet lives on somebody's desktop. There is no single place you could ask what we charged for a similar school project.",
    "at": 89
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "And what does the consultant coordination side look like once a project is running?",
    "at": 112
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Chasing, mostly. We coordinate structural, services, planning and landscape consultants, each with their own deadlines and drawing sets. A large part of my week is working out who owes what. When a date slips, nobody finds out until the coordination meeting.",
    "at": 119
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "If the directors funded one thing, what would you want fixed first, and who makes that call?",
    "at": 139
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Fee proposals, without question, because they gate every new job. The two senior directors decide together. One is focused on winning work, the other has been watching every dollar since we signed the new lease.",
    "at": 147
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is a clean first build. A short paid discovery phase to map how a proposal is actually assembled, then a fixed-scope build of a drafting agent that pulls scope, stages, rates and consultant allowances out of your own past projects. For a studio your size that lands near $66,400, and the agents and prompts are handed over to you at the end.",
    "at": 164
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That is the right problem, but I should be honest with you. The directors will not sign anything until the fit-out budget is settled. We have already committed to the lease, the joinery and a fit-out consultant, and there is not much appetite for anything else this side of the move.",
    "at": 194
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is fair, and I am not going to push a proposal at directors who have not seen the problem framed yet. I will send a short findings note and a fee proposal workflow map so you have something concrete to put in front of them when the budget conversation opens.",
    "at": 219
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That would help. I can get a page read. I cannot get a meeting in the diary for something they have not yet agreed is worth funding.",
    "at": 244
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Understood. The note will separate what a build would change from what you could tighten yourselves for nothing, so it does not read as a pitch.",
    "at": 257
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Please keep that split honest. If every line points at hiring someone, the director watching cash will stop reading at the second paragraph and the whole thing dies there.",
    "at": 269
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Would it be worth putting a date in now for a session with both directors once the note has landed?",
    "at": 283
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "I would rather not. I do not know when the fit-out budget gets signed off, and booking something they have not asked for tends to backfire here.",
    "at": 293
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Then I will leave the timing with you entirely. Send me a line when the budget lands and we can pick it up from wherever it sits then.",
    "at": 306
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That works. Realistically it is after the move, so October at the earliest.",
    "at": 320
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is fine by me. The findings note does not go stale, and the workflow map is useful to you even if you never engage us to build anything.",
    "at": 326
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "That is the part I actually want. Nobody has ever written down how a proposal gets made, so every director does it differently and I am the one reconciling three versions of the truth.",
    "at": 340
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "That is usually where most of the saving sits. Before any agent exists, getting three directors to agree on one assembly order takes a real chunk out of the two or three days you described.",
    "at": 356
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "You will not get three directors to agree on anything by email, but a map they can argue over in a room might get there.",
    "at": 373
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "I will keep it to one page for exactly that reason, with the consultant coordination piece noted separately as a possible second phase rather than folded into the same number.",
    "at": 386
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Good. If you bundle coordination into the same figure, the director watching cash will treat the whole thing as scope creep before he has worked out what it does.",
    "at": 400
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Sam Whitfield",
    "text": "Noted. One problem, one number, and everything else listed as a later option they can ignore.",
    "at": 414
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Grace Kim",
    "text": "Thanks Sam. I am genuinely interested, I just need the internal timing to catch up with it.",
    "at": 422
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Grace Kim",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "Studio Operations Manager",
     "confidence": 0.82,
     "span": null
    },
    "email": {
     "value": "grace@banksiaarchitects.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1111",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Banksia Architects",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Architecture studio",
     "confidence": 0.82,
     "span": null
    },
    "headcount": {
     "value": 44,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Fitzroy, VIC",
     "confidence": 0.96,
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
     "confidence": 0.96,
     "span": 12
    },
    "outcome": {
     "value": "stalled",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send a short findings note and a fee proposal workflow map",
     "confidence": 0.96,
     "span": 14
    }
   ],
   "objections": [
    {
     "text": "The directors will not sign anything until the fit-out budget is settled",
     "handling": "partial",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Sam to send the findings note and fee proposal workflow map for Grace to raise with the directors once the fit-out budget is settled.",
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
   "talkRatio": 0.44,
   "notes": "Sam ran strong discovery on the proposal workflow, but the two deciding directors were absent and the fit-out budget timing left the follow-up without a date."
  },
  "icpSignals": {
   "industry": "Architecture studio",
   "headcountBand": "25-80",
   "role": "Studio Operations Manager",
   "trigger": "Fee proposal drafting and consultant coordination ahead of an office move"
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Banksia Architects",
   "body": "Hi Grace,\n\nThanks for the time today.\nYou mentioned fee proposal drafting and consultant coordination ahead of an office move; that's the part I'd focus on first.\n\nWhat I owe you:\n- Send a short findings note and a fee proposal workflow map\n\nNext step: Sam to send the findings note and fee proposal workflow map for Grace to raise with the directors once the fit-out budget is settled.\n\nNo rush on your side; when the timing is clearer I'm happy to walk the decision makers through it.\n\nSam Whitfield"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-09T09:54:10+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-09T09:55:10+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-09T09:55:10+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-09T09:56:10+10:00",
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
  "at": "2026-09-10T15:00:00+10:00",
  "durationSeconds": 55,
  "outcome": "no_show",
  "trigger": null,
  "summary": "No conversation happened. Jordan reached reception rather than Ethan and left a brief reschedule message, so no sales conversation took place.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "Hi, Jordan Lee from Eleno calling for Ethan Clarke at Dockside Dental. We had a three o'clock phone appointment to talk through automating the recall and treatment plan paperwork.",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Reception",
    "text": "Ethan has been pulled into a patient issue and won't make the call. Sorry, the afternoon has gone sideways on us.",
    "at": 18
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Lee",
    "text": "No worries at all. I will send a short email with two times to reschedule, and he can pick whichever suits. Please let him know Jordan called.",
    "at": 31
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Reception",
    "text": "Will do. Email is best today. Thanks for being understanding about it.",
    "at": 48
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
     "confidence": 0.82,
     "span": null
    },
    "email": {
     "value": "ethan@docksidedental.example",
     "confidence": 0.82,
     "span": null
    },
    "phone": {
     "value": "+61 3 7010 1112",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Dockside Dental",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Dental practice",
     "confidence": 0.82,
     "span": null
    },
    "headcount": {
     "value": 18,
     "confidence": 0.88,
     "span": null
    },
    "location": {
     "value": "Williamstown, VIC",
     "confidence": 0.82,
     "span": null
    }
   },
   "deal": {
    "stage": {
     "value": "discovery",
     "confidence": 0.88,
     "span": null
    },
    "valueAud": {
     "value": 0,
     "confidence": 0.88,
     "span": null
    },
    "outcome": {
     "value": "no_show",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will send a short email with two times to reschedule",
     "confidence": 0.96,
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
   "talkRatio": 0.63,
   "notes": "Jordan reached reception rather than Ethan and left a brief reschedule message, so no sales conversation took place."
  },
  "icpSignals": {
   "industry": "Dental practice",
   "headcountBand": "15-24",
   "role": "Practice Owner",
   "trigger": null
  },
  "riskFlags": [],
  "draft": {
   "subject": "Next steps — Dockside Dental",
   "body": "Hi Ethan,\n\nNo problem about missing each other today, I know how these things go.\n\nWhat I owe you:\n- Send a short email with two times to reschedule\n\nSend me a couple of times that suit and I'll lock one in.\n\nJordan Lee"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-10T15:02:55+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-10T15:03:55+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-10T15:03:55+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-10T15:04:55+10:00",
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
  "at": "2026-09-11T09:00:00+10:00",
  "durationSeconds": 334,
  "outcome": "won",
  "trigger": "Month-end client reporting and engagement letter drafting overwhelming the team",
  "summary": "Strong buying signal. Donnie (CFO, 34 staff) is dealing with month-end client reporting and engagement letter drafting overwhelming the team.",
  "turns": [
   {
    "index": 0,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Donnie Azoff, Jordan Belfort from Eleno. I've heard Marlowe & Finch Accounting is the calmest thirty-four-person practice in Hawthorn, so tell me, who is actually carrying month-end in there?",
    "at": 0
   },
   {
    "index": 1,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "I'm Donnie, the CFO, and month-end is not calm at all. Client reporting and engagement letters are eating the team alive.",
    "at": 11
   },
   {
    "index": 2,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Then you're exactly who I built this pitch for. Picture it: three practices on your street have already signed, and the pilot price is gone Friday. It's $9,500 for the discovery phase and we start the build Monday. You don't need a committee, Donnie, you need engineers on the tools before another month-end swallows the place.",
    "at": 19
   },
   {
    "index": 3,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Hold on. I'm taking the call because we need options, not because we've chosen anyone. What are you actually proposing to build?",
    "at": 40
   },
   {
    "index": 4,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Two agents, fixed scope, no science project. One drafts the month-end client reporting pack straight out of your ledger, the other drafts engagement letters from your own templates. Both run inside your systems, the IP is yours, no subscription. And I can guarantee the agents never hallucinate, so nothing goes out with an invented number in it.",
    "at": 49
   },
   {
    "index": 5,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "That is a very big promise. We have thirty-four people and every one has an opinion about how a report reads.",
    "at": 70
   },
   {
    "index": 6,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Opinions are fine, we encode the loudest one. The discovery phase is two weeks: we sit with your reporting lead, map the templates and wire the ledger. The build runs six weeks after that. Managed optimisation afterwards is optional, not a leash.",
    "at": 78
   },
   {
    "index": 7,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Price is my first concern. The partners have just signed off a software budget and they will ask me what this replaces.",
    "at": 94
   },
   {
    "index": 8,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "It replaces the Sunday nights, Donnie. You'll halve your back-office headcount by Christmas, so the line item pays for itself twice over before the first lodgement of the new year. Price is smoke. Capacity is the fire.",
    "at": 103
   },
   {
    "index": 9,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "I am not cutting half my back office. Two of those people are the reason the reports come out right.",
    "at": 117
   },
   {
    "index": 10,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Fair enough, call it capacity released rather than seats removed. The point stands either way: your people stop moving figures out of one system and into another by hand, and start reviewing work that arrives already drafted.",
    "at": 125
   },
   {
    "index": 11,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "That part I like. Reviewing a draft beats building one from scratch. But there is a governance question sitting underneath all of this.",
    "at": 139
   },
   {
    "index": 12,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Governance is where we are strongest. None of our clients has ever had a compliance finding, and we run every engagement the same way: evidence at each step, review gates before anything sends, and a named engineer on the account.",
    "at": 147
   },
   {
    "index": 13,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Even so, the partners will want to know who signs off when the agent gets something wrong. Our current provider is slow, but nobody has ever had to answer that question about them.",
    "at": 163
   },
   {
    "index": 14,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "You sign off, exactly as you do today, except the draft arrives finished. And while we are here: Your incumbent is about to lose their ISO certification, which is its own answer to your governance question.",
    "at": 175
   },
   {
    "index": 15,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "About to lose certification? That is a serious thing to say out loud, and I have not heard it from anyone else.",
    "at": 189
   },
   {
    "index": 16,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Let's not get bogged down in that. The market is moving, and you do not want Marlowe & Finch Accounting to be the practice everyone talks about in the Hawthorn coffee queue.",
    "at": 197
   },
   {
    "index": 17,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "I do not like being rushed. What happens today if I say yes to reviewing something?",
    "at": 209
   },
   {
    "index": 18,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Today is easy. I turn this call into a plain proposal: the two agents, the scope of each, the discovery phase, the build weeks, who does what, and precisely what you own at the end of it.",
    "at": 216
   },
   {
    "index": 19,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "A clean pack is useful. I still need the managing partner comfortable before anyone signs anything here.",
    "at": 230
   },
   {
    "index": 20,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Of course. Give the managing partner the short version: two agents, fixed scope, running in your systems, the IP transferred to you, no ongoing subscription, and a number that does not move once it is signed.",
    "at": 236
   },
   {
    "index": 21,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Short and clear will help. He reads the first page and the last page, nothing else.",
    "at": 250
   },
   {
    "index": 22,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Then the first page carries the number and the last page carries the start date. I will get a proposal in your inbox today, with the statement of work attached so your managing partner can see the scope.",
    "at": 256
   },
   {
    "index": 23,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "I said review it, not sign it. If the scope is genuinely fixed, I can take it to him tonight.",
    "at": 270
   },
   {
    "index": 24,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "That is the small step, and the small step is all I am asking for. I will send the proposal and statement of work by 5pm today.",
    "at": 278
   },
   {
    "index": 25,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Fine. Send it by 5pm today, 11 September. I will review it with the managing partner, and if the scope matches what you have described, we will sign and start the discovery phase.",
    "at": 288
   },
   {
    "index": 26,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Excellent. I will send it to donnie@marlowefinch.example, and the first page will be painfully clear: $48,600 for the fixed-scope build, the discovery phase costed inside it, and the IP transferred to Marlowe & Finch Accounting at handover.",
    "at": 301
   },
   {
    "index": 27,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Copy nobody else for now. And Jordan, take the theatre out of the email. The partners like numbers, not fireworks.",
    "at": 315
   },
   {
    "index": 28,
    "speaker": "rep",
    "name": "Jordan Belfort",
    "text": "Numbers only. The fireworks go in a separate attachment that mysteriously never arrives. Thanks Donnie, you have moved faster than anyone else on your street.",
    "at": 323
   },
   {
    "index": 29,
    "speaker": "prospect",
    "name": "Donnie Azoff",
    "text": "Right. Send the proposal. Goodbye.",
    "at": 332
   }
  ],
  "extraction": {
   "contact": {
    "name": {
     "value": "Donnie Azoff",
     "confidence": 0.96,
     "span": 0
    },
    "role": {
     "value": "CFO",
     "confidence": 0.96,
     "span": 1
    },
    "email": {
     "value": "donnie@marlowefinch.example",
     "confidence": 0.96,
     "span": 26
    },
    "phone": {
     "value": "+61 3 7010 1113",
     "confidence": 0.82,
     "span": null
    }
   },
   "company": {
    "name": {
     "value": "Marlowe & Finch Accounting",
     "confidence": 0.96,
     "span": 0
    },
    "industry": {
     "value": "Accounting practice",
     "confidence": 0.82,
     "span": null
    },
    "headcount": {
     "value": 34,
     "confidence": 0.88,
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
     "confidence": 0.88,
     "span": null
    },
    "valueAud": {
     "value": 48600,
     "confidence": 0.96,
     "span": 26
    },
    "outcome": {
     "value": "won",
     "confidence": 0.88,
     "span": null
    }
   },
   "promises": [
    {
     "value": "I will get a proposal in your inbox today",
     "confidence": 0.96,
     "span": 22
    },
    {
     "value": "I will send the proposal and statement of work by 5pm today",
     "confidence": 0.96,
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
     "text": "the partners will want to know who signs off when the agent gets something wrong",
     "handling": "partial",
     "span": 13
    }
   ],
   "nextStep": {
    "value": "Jordan Belfort to send the proposal and statement of work by 5pm for Donnie and the managing partner to review and sign.",
    "confidence": 0.88,
    "span": 24
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
    "span": 24
   },
   "objectionHandling": {
    "value": "partial",
    "span": 7
   },
   "talkRatio": 0.65,
   "notes": "Jordan won the demo call by rushing Donnie towards a proposal and statement of work, but the call is full of pressure, almost no discovery and five risky claims about the agents, the headcount saving and the incumbent."
  },
  "icpSignals": {
   "industry": "Accounting practice",
   "headcountBand": "25-80",
   "role": "CFO",
   "trigger": "Month-end client reporting and engagement letter drafting overwhelming the team"
  },
  "riskFlags": [
   {
    "turnIndex": 2,
    "text": "three practices on your street have already signed, and the pilot price is gone Friday",
    "kind": "pressure"
   },
   {
    "turnIndex": 4,
    "text": "I can guarantee the agents never hallucinate",
    "kind": "overclaim"
   },
   {
    "turnIndex": 8,
    "text": "You'll halve your back-office headcount by Christmas",
    "kind": "overclaim"
   },
   {
    "turnIndex": 12,
    "text": "None of our clients has ever had a compliance finding",
    "kind": "unverifiable"
   },
   {
    "turnIndex": 14,
    "text": "Your incumbent is about to lose their ISO certification",
    "kind": "unverifiable"
   }
  ],
  "draft": {
   "subject": "Next steps — Marlowe & Finch Accounting",
   "body": "Hi Donnie,\n\nThanks for the time today.\nYou mentioned month-end client reporting and engagement letter drafting overwhelming the team; that's the part I'd focus on first.\n\nWhat I owe you:\n- Get a proposal in your inbox today\n- Send the proposal and statement of work by 5pm today\n\nNext step: Jordan Belfort to send the proposal and statement of work by 5pm for Donnie and the managing partner to review and sign.\n\nJordan Belfort"
  },
  "timeline": [
   {
    "title": "Call transcribed",
    "meta": "Scribe · diarised",
    "at": "2026-09-11T09:07:34+10:00",
    "icon": "call"
   },
   {
    "title": "Fields extracted",
    "meta": "Claude · awaiting approval",
    "at": "2026-09-11T09:08:34+10:00",
    "icon": "sparkles"
   },
   {
    "title": "Scorecard computed",
    "meta": "4 dimensions",
    "at": "2026-09-11T09:08:34+10:00",
    "icon": "gauge"
   },
   {
    "title": "Follow-up drafted",
    "meta": "Ready to review",
    "at": "2026-09-11T09:09:34+10:00",
    "icon": "mail"
   }
  ]
 }
];

export const callById = (id: string) => calls.find((c) => c.id === id);
