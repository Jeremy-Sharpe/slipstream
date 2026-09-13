# Slipstream live demo script

Target: 3 minutes 30 seconds. One presenter talks; one teammate keeps the API fallback terminal open. Use the production UI at https://slipstream.3-104-149-193.sslip.io and the production API at https://slipstream-api.3-104-149-193.sslip.io. Do not narrate setup, architecture, or model names unless a judge asks.

## Before walking on stage

1. Open the production UI on Revenue Loop (`/demo`). Open Maya Chen at Northstar Labs, Intelligence and Campaigns in three background tabs. Use Campaigns only if its “Delivery execution” card is visible on the production URL; otherwise skip that ten-second beat rather than switching to a preview deployment on stage.
2. In a terminal, run `curl -fsS https://slipstream-api.3-104-149-193.sslip.io/ready | jq`. Confirm `status` is `ok` and keep the terminal open.
3. Confirm Revenue Loop says `Production API · Connected`, shows an exact revision, and reports the live cohort and paused campaign. Confirm the Maya Chen conversation detail, CRM write-back card and follow-up draft are visible in the background tab without scrolling.
4. Use browser zoom that makes the main card and evidence visible from the back of the room. Close notifications and unrelated tabs.
5. Decide roles: presenter drives; a second teammate watches the clock and takes over only if asked.

## 0:00–0:35 — Show the whole loop in one sentence

Action: Start on Revenue Loop. Click `Play guided loop` as you deliver the first sentence. The recorded Maya example and live proof are labelled separately. Pause on any beat you want to explain, or use Previous/Next. Then select the first beat and click `Open transcript` into Maya Chen; your selected beat persists when you return to the original Revenue Loop tab.

Say: “Most sales AI ends when the call summary appears. Ours starts there. One buyer conversation writes the CRM, creates the safe follow-up, teaches the team who wins, and changes who they call next. This is the entire revenue loop, connected.”

Point to the labelled capacity strip and add: “On a deliberately conservative demo assumption—ten minutes of admin, eight calls a day—that returns 6.7 hours, or about five hundred dollars of rep capacity, every week. We label the assumptions because customer rollout is where we replace them with a measured baseline.”

Action: On Maya's conversation, click one evidence/confidence marker, point to “Approve & sync changes,” then point to “Approve.” Do not approve yet.

Fallback: If the page does not load, use the pre-opened tab. If both fail, begin with the terminal fallback and say, “I’ll show the same pipeline directly through our production API.”

## 0:35–1:20 — A difficult call becomes structured evidence

Action: Stay on Maya Chen. Open the transcript and scroll once so speaker turns and timestamps are obvious. If audio playback is present, play 8–12 seconds and stop it.

Say: “The input is the conversation, not a form. Scribe separates the speakers. Slipstream extracts the contact, company, deal, promises, objections and next step. Every confidence value opens back to either an exact transcript span or, for pre-labelled fixture metadata such as caller ID, an explicitly marked fixture source.”

Action: Click the evidence behind Maya’s security-questionnaire next step and show that it jumps to its source. Point briefly to the objection or review panel.

Fallback: If the action fails, use the terminal fallback below. It runs the newest voiced fixture and should return Donnie Azoff, Marlowe & Finch, outcome `won`, amount `48600`, two promises and two objections. Explain that the fallback fixture differs from Maya but exercises the same production path.

## 1:20–2:10 — CRM and follow-up write themselves safely

Action: Show the CRM preview beside Maya’s transcript. Point to company, contact and deal as three separate records, then open the email draft.

Say: “Those are HubSpot-shaped records, not a blob of notes. With Supabase connected, the same action idempotently upserts the company, contact and deal without erasing stronger fields already in the CRM. Now the follow-up drafts itself from grounded facts. Notice what is missing: Jordan claimed the insurer would halve the premium, but that risky claim is not repeated here. The draft includes only the agreed proposal, commercial terms and next step.”

Action: Click Approve. Show status change from Draft to Approved and the approval timestamp.

Say: “Approval and delivery are separate, so this screen never claims an email went out when it did not. The production Resend adapter sends only this exact approved copy, behind a server token and a content-bound idempotency key. We deliberately left delivery unconfigured, so no judge gets a surprise email.”

Action: If the production Campaigns tab has the live “Delivery execution” card, switch to it and point to the `Live API` badge, the paused “Hackathon demo — intentionally unsent” record, its zero sent count, and the labelled evaluation sequence below. Do not resume or send the campaign on stage.

Say: “This is a real campaign record, not a hard-coded card. The same synthetic account produced a genuine OpenRouter call extraction and follow-up draft; the campaign recipient comes from the validated sender on its email thread. That approved reply was enrolled by exact ID, scheduled for 2099, then paused through the authenticated server action. It shows one queued, zero sent and zero attempts. With Resend configured, a Railway worker would claim eight at a time and separate confirmed sends, safe retries, failures and anything needing reconciliation. We deliberately stopped before delivery rather than fake a success.”

Fallback: Use the API commands below, then show the returned `status: approved`, approver, approval timestamp, and empty `sent_at`.

## 2:10–2:55 — The team learns who to call next

Action: Open the call scorecard, point to its `Labelled evaluation` badge, then switch to Intelligence. Point to the live OpenRouter model, the mixed call-and-email cohort, the derived ICP and one won-deal evidence item. In Revenue DNA, click `New deal won` once: the explicitly non-mutating shock test shows the current ICP becoming stale, affected leads queued for re-score, provider spend paused and the next profile version. Reset it, then open Leads and click `Run search`: unchanged real evidence reuses the current profile. Refresh Leads after it finishes and visibly confirm that the screen renders ten fictional prospects with `.example` domains and no deliverable contact details.

Say: “A saved transcript is not coaching. This scorecard is labelled evaluation data, while the ICP is a live OpenRouter artifact grounded in calls and emails. The shock test is local and leaves production unchanged, but it makes the mechanism visible: a new outcome invalidates the old target, marks leads for a new score and pauses provider spend until the next profile is learned. These ten companies are openly fictional proof: reserved domains, no deliverable contacts, and no paid data account. The point is the closed-loop contract, not a fake enrichment claim.”

Action: Point to one winning signal and one stall signal. Avoid reading every metric.

Configured-key option: If `/ready` reports a scorecard integration before the demo, run the live call pipeline, click `Generate live scorecard`, and show the `Live · model` badge after it completes. Generate a live playbook only if Intelligence has already found a revision-pinned cohort containing both won and not-won calls. Never wait for setup or install a key on stage.

Fallback: Use the labelled scorecard already rendered in Conversations, then show the preloaded Intelligence tab. If Intelligence is unavailable, say, “The paid sourcing key is not part of the fallback; the terminal path proved the upstream call record that feeds it,” and move on without waiting.

## 2:55–3:25 — Close on value and proof

Action: Return to Revenue Loop and leave all seven beats completed. Point to the two pipeline scenarios below the rep-capacity strip.

Say: “A small sales team currently buys a recorder, CRM automation, call coaching and lead sourcing separately—and still has to keep them in sync. Slipstream makes the call the source of truth. One conversation updates the CRM, creates the safe follow-up, teaches the team who converts, and finds the next person to call. These scenarios are not forecasts: they show exactly what one prevented miss or one point of better replies would mean, and a pilot replaces our inputs with the customer's baseline. The production API you just saw is running on the exact Git revision in GitHub. That is the sales layer we would install beside the CRM a team already has.”

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

curl -fsS "$API/campaigns?limit=2" | jq
```

If the VPS is unreachable, use the production UI’s already-loaded deterministic fixture and say so immediately. If the UI is unreachable, use the API fallback. If both are unreachable, show the locally running app only after stating that it is the same main-branch revision; do not disguise a fallback as production.

## Likely judge interruptions

- “What is mocked?” The businesses, calls and generated prospects are synthetic and explicitly labelled. The OpenRouter extraction, drafting, mixed-channel ICP, embedding and lead-scoring path runs live; generated prospects use `.example` domains and cannot be delivered to. Origami and email delivery have real adapters but are not configured, and readiness says so plainly.
- “Is this really a CRM integration?” The demo writes to Postgres tables shaped like HubSpot company, contact, deal, engagement and task objects. A production connector swaps those writes for HubSpot APIs; the extraction contract does not change.
- “What happens without keys?” Fixture ingestion, extraction and drafting remain deterministic and tested. Paid transcription fails closed, and cannot be enabled in production without an ingest token.
- “Can scheduled outreach duplicate a send?” Campaign and per-draft leases prevent concurrent ownership, and the provider request reuses an exact content-bound idempotency key. Ambiguous results are retried or surfaced for reconciliation; they are never relabelled as successful.
- “Why is the demo campaign paused?” It proves exact enrollment and live orchestration state without allowing a public hackathon deployment to email anyone. It is synthetic, scheduled for 2099, has zero attempts and zero sends. The durable Postgres migrations, scheduler container and delivery adapter are merged and tested.
