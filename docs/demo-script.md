# Slipstream live demo script

Target: 3 minutes 30 seconds. One presenter talks; one teammate keeps the API fallback terminal open. Use the production UI at https://slipstream-ten-mauve.vercel.app and the production API at https://slipstream-api.3-104-149-193.sslip.io. Do not narrate setup, architecture, or model names unless a judge asks.

## Before walking on stage

1. Open the production UI on Conversations with Maya Chen at Northstar Labs selected, then open Intelligence in a second tab.
2. In a terminal, run `curl -fsS https://slipstream-api.3-104-149-193.sslip.io/ready | jq`. Confirm `status` is `ok` and keep the terminal open.
3. Confirm the Maya Chen conversation detail, CRM write-back card and follow-up draft are visible without scrolling.
4. Use browser zoom that makes the main card and evidence visible from the back of the room. Close notifications and unrelated tabs.
5. Decide roles: presenter drives; a second teammate watches the clock and takes over only if asked.

## 0:00–0:35 — Lead with the call becoming action

Action: Start on the production Conversations screen with Maya Chen at Northstar Labs selected. Point in one sweep from the transcript to CRM write-back to the follow-up draft.

Say: “This is the bit we think changes sales software. A call should not disappear into a recorder. Slipstream turns it into the CRM record, the safe follow-up, the coaching evidence and—once the team has history—the next customer to call. Here Maya confirmed legal is ready after the security questionnaire. That fact is already a deal update and an action, with its exact source beside it.”

Action: Click one evidence/confidence marker, point to “Approve & sync changes,” then point to “Approve & send.” Do not approve yet.

Fallback: If the page does not load, use the pre-opened tab. If both fail, begin with the terminal fallback and say, “I’ll show the same pipeline directly through our production API.”

## 0:35–1:20 — A difficult call becomes structured evidence

Action: Stay on Maya Chen. Open the transcript and scroll once so speaker turns and timestamps are obvious. If audio playback is present, play 8–12 seconds and stop it.

Say: “The input is the conversation, not a form. Scribe separates the speakers. Slipstream extracts the contact, company, deal, promises, objections and next step. Every confidence value opens back to either an exact transcript span or, for pre-labelled fixture metadata such as caller ID, an explicitly marked fixture source.”

Action: Click the evidence behind Maya’s security-questionnaire next step and show that it jumps to its source. Point briefly to the objection or review panel.

Fallback: If the action fails, use the terminal fallback below. It runs the newest voiced fixture and should return Donnie Azoff, Marlowe & Finch, outcome `won`, amount `48600`, two promises and two objections. Explain that the fallback fixture differs from Maya but exercises the same production path.

## 1:20–2:05 — CRM and follow-up write themselves

Action: Show the CRM preview beside Maya’s transcript. Point to company, contact and deal as three separate records, then open the email draft.

Say: “Those are HubSpot-shaped records, not a blob of notes. With Supabase connected, the same action idempotently upserts the company, contact and deal without erasing stronger fields already in the CRM. Now the follow-up drafts itself from grounded facts. Notice what is missing: Jordan claimed the insurer would halve the premium, but that risky claim is not repeated here. The draft includes only the agreed proposal, commercial terms and next step.”

Action: Click Approve. Show status change from Draft to Sent and the approval timestamp.

Say: “For the hackathon, send is deliberately simulated—no judge gets surprise email. The approval is idempotent and audited, so refreshing cannot send twice. A Gmail or HubSpot delivery adapter is the final replaceable step.”

Fallback: Use the API commands below, then show the returned `status: sent`, approver, and identical approval/sent timestamps.

## 2:05–2:50 — The team learns who to call next

Action: Open the call scorecard, then switch to the pre-opened Intelligence view. Point to the derived ICP, one won-deal evidence item, and one lead with its fit reason. Do not start a paid Origami search on stage.

Say: “A saved transcript is not coaching. The scorecard shows what happened in this call. Across thirteen calls, Slipstream separates behaviours correlated with wins from behaviours that create stalls. It also learns the customer pattern: 25-to-80-person professional-services and allied-health firms, with a compliance trigger and a decision-maker involved. That becomes an Origami brief, and new prospects come back scored against deals we actually won—not a persona someone guessed in a workshop.”

Action: Point to one winning signal and one stall signal. Avoid reading every metric.

Fallback: Use the labelled scorecard already rendered in Conversations, then show the preloaded Intelligence tab. If Intelligence is unavailable, say, “The paid sourcing key is not part of the fallback; the terminal path proved the upstream call record that feeds it,” and move on without waiting.

## 2:50–3:20 — Close on value and proof

Action: Return to the lead list, leaving the closed-loop diagram or strongest lead visible.

Say: “A small sales team currently buys a recorder, CRM automation, call coaching and lead sourcing separately—and still has to keep them in sync. Slipstream makes the call the source of truth. One conversation updates the CRM, creates the safe follow-up, teaches the team who converts, and finds the next person to call. The production API you just saw is running on the exact Git revision in GitHub, and all external-key paths have deterministic fallbacks. That is the sales layer we would install beside the CRM a team already has.”

Stop. Do not fill spare time. Invite questions.

## Terminal fallback

Run these before the presentation once so DNS, TLS and `jq` are warm. Run them again only if the UI action fails.

```bash
API=https://slipstream-api.3-104-149-193.sslip.io/api/v1
curl -fsS https://slipstream-api.3-104-149-193.sslip.io/ready | jq

CALL_ID=$(curl -fsS -X POST "$API/calls/fixtures/call-13-marlowe-finch-demo/ingest" | jq -r .id)
curl -fsS -X POST "$API/calls/$CALL_ID/extract" \
  | jq '{contact:.contact.name.value,company:.company.name.value,outcome:.deal.outcome.value,amount:.deal.amount.value,promises:(.promises|length),objections:(.objections|length),next_step:.next_step.description}'

DRAFT=$(curl -fsS -X POST "$API/drafts/from-call/$CALL_ID")
echo "$DRAFT" | jq '{id,recipient_name,recipient_email,subject,body,status}'
DRAFT_ID=$(echo "$DRAFT" | jq -r .id)
curl -fsS -X POST -H 'Content-Type: application/json' \
  -d '{"approved_by":"Demo presenter"}' "$API/drafts/$DRAFT_ID/approve" \
  | jq '{status,approved_by,approved_at,sent_at}'
```

If the VPS is unreachable, use the production UI’s already-loaded deterministic fixture and say so immediately. If the UI is unreachable, use the API fallback. If both are unreachable, show the locally running app only after stating that it is the same main-branch revision; do not disguise a fallback as production.

## Likely judge interruptions

- “What is mocked?” The businesses and calls are synthetic. The audio file, ingestion, diarised transcript, structured extraction, draft, approval state, scorecard pipeline, ICP derivation and API responses are executable. Sending email is simulated. Origami needs its paid key; stored results remain visible if the live search is unavailable.
- “Is this really a CRM integration?” The demo writes to Postgres tables shaped like HubSpot company, contact, deal, engagement and task objects. A production connector swaps those writes for HubSpot APIs; the extraction contract does not change.
- “What happens without keys?” Fixture ingestion, extraction and drafting remain deterministic and tested. Paid transcription fails closed, and cannot be enabled in production without an ingest token.
