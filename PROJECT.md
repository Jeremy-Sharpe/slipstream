# Slipstream

## Build coordination — 12 September 2026

- **Jeremy's agent completed:** the first complete frontend prototype: a unified email-and-call inbox, conversation detail with CRM auto-entry and editable reply draft, plus an aggregate analysis/ICP page and an Origami-ready lead-generation handoff. This work is frontend-only and uses realistic mock data. Production build, lint, responsive visual QA, and the core interaction smoke test pass.
- **Other collaborators should work on next:** producing/curating realistic call and email fixtures, defining the CRM adapter contract, and exploring the Origami lead-generation API/data contract. The frontend shell and core screens are now available to build against; coordinate in this file before changing their information architecture.
- **Coordination note:** keep all integrations mocked for the hackathon UI; no live email sending, CRM writes, or Origami requests are part of Jeremy's agent's current work.

### Frontend decisions now represented in the prototype

- Next.js 16 + React 19, deployed independently from any future integration services.
- Calls and email are one conversation type with channel-specific detail views.
- CRM write-back and outbound sending require explicit human approval in the UI.
- HubSpot is the named demo CRM, but the field panel is intentionally adapter-shaped.
- Origami receives the derived ICP and returns staged lead candidates; it does not send automatically in this phase.

Accelerated sales. A layer that sits on top of a CRM, listens to what happened
on the phone, and turns each call into the next action: a drafted follow-up, a
record in the CRM, and a read on who you should be selling to next.

The name is the drafting effect: sit in the low-pressure wake and go faster on
less effort.

## Current goal: get the frontend up

Frontend only. No phone system integration, no live CRM, no real outbound. The
entire app runs on mock data so the shape of the product can be judged before
any plumbing exists.

Mock calls are generated with a voice model: synthesised sales calls, varied in
outcome (won, stalled, lost, no-show), transcribed and stored as fixtures. Good
fixtures are the real deliverable of this phase, because everything downstream
is scored against them.

## The three surfaces

### 1. Calls

A CRM-attached list of phone calls. Each call opens to the transcript, the
participants, the deal it belongs to, and the outcome.

### 2. Auto-draft

From the call, a follow-up email is drafted automatically: what was discussed,
what was promised, what the next step is. The draft is written back into the
CRM against the contact and deal, so it is waiting there rather than living in
a separate tool.

### 3. Analysis

The aggregate view across all calls, not the single-call view.

- **Sales training lens.** Which calls went best and why: the moves that
  correlate with a won deal, the ones that correlate with a stall. Scoring is
  invented for now; the point is the surface, not the model behind it.
- **ICP discovery.** Work backwards from the calls that succeeded to the
  profile of the buyer who succeeds: industry, size, role, trigger. The ICP is
  derived from outcomes rather than asserted up front.
- **Outreach on that ICP.** Feed the derived ICP into an outbound motion.

## Origami Agents

Origami is the research and outbound layer. Two candidate lanes, either or
both:

1. **Outbound lead process.** Take the derived ICP and run the outbound
   sequence against it: source, qualify, contact.
2. **Fulfilment and enrichment.** Lead enrichment on existing records, plus a
   chat surface to find similar businesses that fit the ICP: "find me twenty
   more like the last three that closed."

Lane 2 is the one that makes the analysis tab feel like a product rather than
a report, because it closes the loop from insight back to pipeline.

## Out of scope right now

- Phone system integration (Twilio, Aircall, dialler of any kind)
- Real CRM read/write; the CRM is mocked
- Sending any email
- Auth, multi-tenancy, billing
- A real call-scoring model

## Open questions

- Which CRM is the target for the real integration later (HubSpot, Pipedrive,
  Attio, Salesforce)? It shapes the data model even while mocked.
- Stack for the frontend: assumed Next.js on Vercel unless decided otherwise.
- Does the auto-draft email go out from Slipstream, or only ever land as a
  draft in the CRM for a human to send?
- How much of the call scoring should look defensible at demo time versus
  obviously placeholder?
