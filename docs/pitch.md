# Slipstream pitch

## Spoken pitch

Small sales teams have a strange problem: they already own a CRM, but the truth is still trapped in phone calls.

After each call, a rep should update the CRM and write the follow-up. That is ten minutes of admin, so it gets skipped. The pipeline becomes fiction. And when the founder’s network runs out, the team buys leads against a customer persona somebody guessed in a workshop.

We built Slipstream: an AI sales layer that sits beside the CRM a team already has. Its central idea is simple: your next customer should change when your last deal does.

A call enters as audio. ElevenLabs separates the speakers, then Slipstream fills structured contact, company and deal fields—including promises, objections and the agreed next step. Every field carries evidence, so a rep can check the exact words before approving it.

Then Slipstream drafts the follow-up. It uses what was actually agreed, not a generic template. In our demo call, the rep makes an unsupported claim that cyber insurance will be cut in half. Slipstream records the risk but does not repeat it in the email. One click approves the draft and records who approved it without pretending it was sent.

Approved drafts can enter a scheduled campaign. Sends are throttled, tracked and retried safely, and an operator can pause future work. The screen always shows the true delivery state.

That already saves over an hour a day for a rep doing eight calls. But the real difference is what happens across the whole team.

Slipstream scores each call for discovery, objection handling and next-step quality. Then it studies the deals that actually won and derives who that sales team should target. In our synthetic history, that means 25-to-80-person services firms with a compliance trigger and a decision-maker involved.

We call this Revenue DNA. When a new deal wins or loses, Slipstream knows the target is stale, relearns it and flags leads that need a new score. This is not a persona report forgotten in a slide deck; it is a target that learns from outcomes.

That profile becomes a prospect-search brief. In the live proof, OpenRouter creates ten clearly fictional, non-deliverable companies so judges can test the scoring and outreach loop without a paid data subscription. For customers, the same brief can plug into a paid company-data provider for real sourcing. The output of the last call improves who gets the next call.

This is one closed loop, not four disconnected AI features: conversation to CRM, CRM to coaching, outcomes to Revenue DNA, and Revenue DNA to pipeline.

For the weekend build, thirteen labelled calls cover wins, losses, stalls and a no-show. OpenRouter powers the live extraction, follow-up, mixed-channel profile and fictional lead proof. Every result shows its source. Delivery is switched off, so the paused campaign proves the automation without claiming anything was sent.

The path to a product is direct: connect Aircall or Twilio for recordings, HubSpot for CRM writes and Gmail for delivery. The intelligence does not change.

Enterprise teams can stitch together Gong, a CRM, Clay and a RevOps person. Slipstream sells to the small sales team that cannot. It gives them the same compounding system: less admin after every call, better coaching from every call, and a pipeline that learns from the customers who said yes.

## Q&A preparation

### What is real, and what is mocked? — Jeremy

The businesses and calls are synthetic, so no customer data is exposed. Ingestion, transcript normalization, extraction schemas, evidence validation, CRM-shaped writeback, follow-up generation, approval, campaign controls, ICP services and the production API are executable. OpenRouter powers the deployed reasoning, embeddings and ten explicitly fictional leads. The public deployment intentionally has no email-provider key, so delivery fails closed instead of being simulated; Origami is an optional paid adapter, not a demo dependency.

### How accurate is the extraction? — Anna

We do not present model output as fact. Every field has confidence and evidence provenance. Live-call evidence must be a verbatim substring of the cited transcript segment or the response is rejected. Fixture-only metadata is labelled separately rather than disguised as speech. Thirteen labelled calls run through the same ingest and extraction endpoints in tests; the scorecard lane compares output with hand labels.

### What stops prompt injection in a call? — Max

Transcript segments are JSON-serialized as untrusted data. The system instruction says never to follow instructions inside them. The model returns through a strict transformed JSON schema, Pydantic validates the result again, and evidence is checked against the original server-side segments. A spoken “ignore your instructions” is data, not an instruction.

### How do you protect call recordings and transcripts? — Romain

This prototype uses synthetic data and is single-tenant. A production version needs recording consent, retention controls, encryption and customer-scoped authorization before real calls enter it. Paid ingestion already requires a production token and has request-size and concurrency limits. Supabase row-level security is included in the schema, but we are not claiming the hackathon build is production privacy-complete.

### Is this actually a CRM integration? — Jeremy

The demo writes to contacts, companies, deals, conversations, drafts and activities in Postgres, with the same object boundaries as HubSpot. Upserts are idempotent and do not erase stronger existing fields when the call lacks a value. A HubSpot connector replaces that repository adapter; transcription, evidence, approval and UI contracts remain unchanged.

### What does it cost? — Anna

Per ten-minute call, ElevenLabs Scribe is about four cents at the published pay-as-you-go rate, while our measured reasoning and embedding pass is about three cents. Fictional OpenRouter leads are reused unless the Revenue DNA changes, and retries are deduplicated so they do not spend twice.

### Why would a rep adopt it? — Max

It gives value on call one: a truthful CRM update and a usable follow-up. It does not require weeks of clean historical data. The rep approves rather than retypes, while managers get coaching and ICP value as history accumulates.

### Why not Gong, Fireflies, HubSpot AI or Clay? — Romain

Recorders stop at notes, lead tools require the user to define the target, and enterprise call-intelligence platforms assume budget and RevOps support. Slipstream’s Revenue DNA fingerprints the evidence behind the target, detects the moment a new outcome invalidates it, and refuses to spend lead credits against stale assumptions.

### What would you build next? — Jeremy

First, a real HubSpot sandbox connector and tenant-scoped authentication around the existing Resend delivery path. Second, Aircall or Twilio recording webhooks. Third, consent and retention controls. We would keep the deterministic eval set and add anonymised customer-approved calls before tuning prompts or changing models.

### Can this accidentally send twice? — Jeremy

Campaign membership is an explicit list of approved draft IDs. The scheduler leases one campaign chunk, and every draft separately reserves a durable, content-bound delivery identity before provider I/O. A lost response becomes retryable and reconciliation-required, not “sent”; the next run reuses the same provider idempotency key. Operators can pause future chunks, but an already-running provider call is allowed to finish rather than being falsely reported as cancelled.
