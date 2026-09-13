# Slipstream pitch

## Spoken pitch

Small sales teams have a strange problem: they already own a CRM, but the truth is still trapped in phone calls.

After each call, a rep is meant to update the contact, company, deal stage, objections and next step, then write the follow-up. That is ten minutes of admin on a good day, so it gets skipped. The pipeline becomes fiction. Managers cannot coach what they cannot see. And when the founder’s network runs out, the team buys lead lists based on a customer persona somebody guessed in a workshop.

We built Slipstream: an AI sales layer that sits beside the CRM a team already has.

A call enters Slipstream as audio. ElevenLabs Scribe transcribes it and separates the speakers. Slipstream turns that conversation into structured contact, company and deal fields, including promises, objections and the agreed next step. Every extracted field carries confidence and evidence, so a rep can jump back to the exact words before approving the update.

Then Slipstream drafts the follow-up. It uses what was actually agreed, not a generic template. In our demo call, the rep makes an unsupported claim that cyber insurance will be cut in half. Slipstream records the risk but does not repeat it in the email. One click approves the draft and records who approved it without pretending it was sent.

Approved drafts can be enrolled by exact ID into a scheduled campaign. A trusted Railway worker sends at most eight at a time through Resend; every item is confirmed, retried, failed or flagged for reconciliation, and the operator can pause future work. Stable provider identities and database leases make retries safe. The browser can inspect progress, but it never receives the delivery token.

That already saves over an hour a day for a rep doing eight calls. But the real difference is what happens across the whole team.

Slipstream scores each call against a written rubric: discovery, objection handling, next-step quality and talk ratio. It then looks at the deals that actually won and derives the ideal customer profile with the supporting deals visible. In our synthetic history, the pattern is 25-to-80-person professional-services and allied-health firms, a real compliance trigger, and a decision-maker in the conversation.

That profile becomes a prospect-search brief. In the live proof, OpenRouter creates ten clearly fictional, non-deliverable companies so judges can test the scoring and outreach loop without a paid data subscription. For customers, the same brief plugs into our Origami adapter for real sourcing. The output of the last call improves who gets the next call.

This is one closed loop, not four disconnected AI features: conversation to CRM, CRM to coaching, won deals to ICP, and ICP to pipeline.

For the weekend build, we use a lightweight CRM-style data store, a live backend and a public web app. Thirteen labelled calls cover wins, losses, stalls and a no-show. OpenRouter powers the live extraction, follow-up, mixed call-and-email customer profile and fictional lead proof. Every model result shows its evidence and source. Email delivery is deliberately switched off, so the paused campaign proves the automation without claiming anything was sent.

The path to a product is direct. Replace file upload with an Aircall or Twilio recording webhook. Replace our HubSpot-shaped table writes with HubSpot API calls. Connect Gmail for delivery. The intelligence contract does not change.

Enterprise teams can stitch together Gong, a CRM, Clay and a RevOps person. A twelve-person services firm cannot. Slipstream gives that team the same compounding sales system: less admin after every call, better coaching from every call, and a pipeline that learns from the customers who said yes.

## Q&A preparation

### What is real, and what is mocked? — Jeremy

The businesses and calls are synthetic, so no customer data is exposed. The demo audio is a real two-voice ElevenLabs file. Ingestion, diarised transcript normalization, extraction schemas, evidence validation, CRM-shaped writeback, follow-up generation, approval, explicit campaign enrollment, pause/resume, bounded scheduling, ICP services and production API are executable. The public deployment intentionally has no email-provider key, so delivery fails closed instead of being simulated. Origami sourcing requires its paid key; when that integration is unavailable, only the explicitly labelled evaluation leads remain displayable.

### How accurate is the extraction? — Anna

We do not present model output as fact. Every field has confidence and evidence provenance. Live-call evidence must be a verbatim substring of the cited transcript segment or the response is rejected. Fixture-only metadata is labelled separately rather than disguised as speech. Thirteen labelled calls run through the same ingest and extraction endpoints in tests; the scorecard lane compares output with hand labels.

### What stops prompt injection in a call? — Max

Transcript segments are JSON-serialized as untrusted data. The system instruction says never to follow instructions inside them. The model returns through a strict transformed JSON schema, Pydantic validates the result again, and evidence is checked against the original server-side segments. A spoken “ignore your instructions” is data, not an instruction.

### How do you protect call recordings and transcripts? — Romain

This prototype uses synthetic data and is single-tenant. A production version needs recording consent, retention controls, encryption and customer-scoped authorization before real calls enter it. Paid ingestion already requires a production token and has request-size and concurrency limits. Supabase row-level security is included in the schema, but we are not claiming the hackathon build is production privacy-complete.

### Is this actually a CRM integration? — Jeremy

The demo writes to contacts, companies, deals, conversations, drafts and activities in Postgres, with the same object boundaries as HubSpot. Upserts are idempotent and do not erase stronger existing fields when the call lacks a value. A HubSpot connector replaces that repository adapter; transcription, evidence, approval and UI contracts remain unchanged.

### What does it cost? — Anna

Per call, the variable work is one transcription, a small number of reasoning calls and an embedding—normally cents rather than dollars at this size. Origami rows are the deliberate variable cost, which is why searches start at ten and require a user action to fetch more. Provider calls are deduplicated so retries do not spend twice.

### Why would a rep adopt it? — Max

It gives value on call one: a truthful CRM update and a usable follow-up. It does not require weeks of clean historical data. The rep approves rather than retypes, while managers get coaching and ICP value as history accumulates.

### Why not Gong, Fireflies, HubSpot AI or Clay? — Romain

Recorders stop at notes, lead tools require the user to define the target, and enterprise call-intelligence platforms assume budget and RevOps support. Slipstream’s differentiation is the loop: the call changes the CRM, the CRM reveals who wins, and who wins controls who the system finds next.

### What would you build next? — Jeremy

First, a real HubSpot sandbox connector and tenant-scoped authentication around the existing Resend delivery path. Second, Aircall or Twilio recording webhooks. Third, consent and retention controls. We would keep the deterministic eval set and add anonymised customer-approved calls before tuning prompts or changing models.

### Can this accidentally send twice? — Jeremy

Campaign membership is an explicit list of approved draft IDs. The scheduler leases one campaign chunk, and every draft separately reserves a durable, content-bound delivery identity before provider I/O. A lost response becomes retryable and reconciliation-required, not “sent”; the next run reuses the same provider idempotency key. Operators can pause future chunks, but an already-running provider call is allowed to finish rather than being falsely reported as cancelled.
