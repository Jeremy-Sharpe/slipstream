# Slipstream live demo script

Target: 3 minutes 30 seconds, one presenter driving, one teammate on the clock with the terminal fallback open. Use the production UI at https://slipstream-app-seven.vercel.app and the production API at https://slipstream-api.3-104-149-193.sslip.io. You are signed in as Liam Albrecht, the sample sales lead at Eleno; the reps on the calls are Sam Whitfield and Jordan Lee, and the demo call is Jordan Belfort. Do not narrate setup, architecture or model names unless a judge asks.

The whole loop in one sentence, for you not the judges: one call becomes CRM fields, a score, a safe follow-up, a refreshed ideal customer profile, ten look-alike leads and three outreach drafts, and every one of those links back to the words on the call.

## Before walking on stage

1. Open the production UI on Home. Confirm the sidebar shows Liam Albrecht · Eleno at the bottom and the call picker lists Marlowe & Finch Accounting · Donnie Azoff with a play button.
2. In a terminal, run `curl -fsS https://slipstream-api.3-104-149-193.sslip.io/ready | jq`. Confirm `status` is `ok`, `storage` is `supabase`, and `openrouter`, `embeddings` and `elevenlabs` are true. Keep the terminal open.
3. Open Intelligence in a second tab. If the banner says the calls are still unscored, click `Score 12 calls` now and wait for it to finish (about two minutes, twelve model calls, and the button reads Working while it runs). Never do this on stage. When it is done the page shows "What winning calls did", "Why they bought" and "Coach Sam on" under the ideal customer card. Nobody else should be scoring or running calls at the same time, or a scoring can fail with "Call changed while it was being scored; retry": if that happens, click the button again and it resumes from the calls already scored.
4. The ideal customer card may carry a Stale badge between runs: every approved call or pasted email changes the CRM evidence, and the profile is relearned on the next run. That is the mechanism, not a fault. If you want the badge to read Current when the judges first see Intelligence, run the demo call through Home once in rehearsal and leave it there.
5. Open Revenue loop in a third tab. Beats 01 to 03 must show the Marlowe & Finch call, not "Not yet derived". If they say "Not yet derived", go to Home and click Marlowe & Finch Accounting once so the call exists, then reload Revenue loop.
5. Open Leads in a fourth tab. Confirm the grid on the right lists ten companies tagged Fictional.
6. Click the play button beside Marlowe & Finch Accounting on Home and confirm the room can hear it. Stop it.
7. Rehearsals leave a finished run behind. That is fine: clicking the call on Home starts a fresh run, and the call page has `Re-run` at the top right.
8. Set browser zoom so the right-hand "What Slipstream did" column is readable from the back of the room. Close notifications and unrelated tabs.

## 0:00 to 0:30, Home: the call is the input

Action: Stay on Home. Point at the heading "What happened on the call?" and the five-way control: Pick a call, Upload file, Record, Paste transcript, Paste an email. Click the play button beside Marlowe & Finch Accounting · Donnie Azoff, let eight to ten seconds of the ElevenLabs-voiced call play, then click the same button to stop it.

Say: "Small sales teams own a CRM, but the truth is still stuck in phone calls. After every call there is ten minutes of admin and a follow-up to write, so it gets skipped and the pipeline turns into fiction. Slipstream starts from the call itself. Here is one: Jordan, one of our reps, calling the CFO of a thirty-four-person accounting practice."

Action: Click the row Marlowe & Finch Accounting · Donnie Azoff. Home fades and the call page opens.

## 0:30 to 1:20, the CRM writes itself

What you see: the header reads Donnie Azoff · Marlowe & Finch Accounting, an Open badge, Jordan Belfort, 11 Sept · 09:00 · 5:34, an audio scrubber and `Re-run`. The transcript runs down the left with timestamps. On the right, under "What Slipstream did", the first step reads "Transcribed 5:34 · 30 turns · talk ratio 65%", and the second reads "Extracted 6 fields · Waiting for your approval" with the fields open: Contact Donnie Azoff · CFO, Company Marlowe & Finch Accounting · 34 staff · Hawthorn, Deal stage Discovery, Value $48,600, Next step "Send proposal and statement of work by 5pm on 11 September", Promises, and one Objection about price marked Partial. Each row carries a timestamp and a confidence.

Action: Hover the Value row so the transcript highlights the turn at 5:01, then click it so the transcript jumps there. Do the same with the Next step row (4:16).

Say: "Scribe separated the speakers. Then Slipstream pulled out the contact, the company, the deal value, the promises Jordan made and the next step he agreed. Every field carries a confidence and points at the exact words behind it. A value whose quote cannot be found in the transcript is dropped rather than shown."

Action: Click `Approve & sync to CRM`. The step collapses to "Extracted 6 fields · Synced" and the note "CRM record written; external webhook not configured on this deployment" appears.

Say: "Nothing is written until a person approves it. The records are HubSpot-shaped company, contact and deal objects; a production connector swaps our tables for the CRM the team already has."

If asked why the deal stage says Discovery when the call was won: Donnie said "review it, not sign it". The model reads what was said; the outcome label in our fixtures is what happened afterwards.

## 1:20 to 2:10, the call is scored and the follow-up drafts itself

What you see: "Scored the call · 1 discovery question · next step secured · talk ratio 65%" with four rows (Discovery questions before pricing, Next step secured, Objection handling, Rep talk ratio), a short narrative and a "Went well" list. Above the timeline a "Conversation intelligence" box streams a two-line summary with the sticking point and the next step, and offers a "Why did this one close?" chip. Below the score, "Follow-up drafted · Waiting for your approval" shows the subject "Proposal and SOW for Marlowe & Finch Accounting" and the body typing in.

Action: Point at "1 discovery question" and "talk ratio 65%". Do not expand the "To improve" list.

Say: "This is coaching, not a summary. Jordan pitched a price in his third sentence, talked for two thirds of the call, and still got a dated next step. The team sees that pattern across every call, not just this one."

Action: Scroll to the draft. Point at the body: it opens with the proposal by 5pm on 11 September, lists the two-week discovery phase, six-week build and IP transfer, and acknowledges the price concern.

Say: "Now the follow-up. On the call Jordan promised the agents would never hallucinate and that Donnie would halve his back-office headcount by Christmas. Neither claim is in this email. The draft only carries what was actually agreed. It is editable, and approval never pretends it was sent."

Action: Click `Approve follow-up`. The step reads "Follow-up approved · nothing is sent" and the badge "Approved · nothing is sent from Slipstream" appears.

## 2:10 to 2:50, the last deal changes the next call

What you see: three more steps run without a click. "ICP updated · From 12 won deals" opens with a paragraph starting "Observed win industries are Quantitative investment research boutique, Non-bank commercial lender, Financial planning and wealth advice firm..." and four rows: Industry, Size 25-80 staff, Buyer (Managing Partner, Head of Credit Operations, Practice Manager, Director, General Manager) and Trigger. Then "Found 10 leads like the ones you closed", then "Outreach drafted · 3 drafts ready" with a link "Review in Leads →".

Say: "Here is the part nobody else does. Slipstream takes the twelve deals this team has won, works out who actually buys, and turns that into a search. Financial services, lending, property and auctions, twenty-five to eighty staff, a decision maker on the call and a document-heavy bottleneck. When a deal wins or loses, that profile goes stale and gets relearned. The target learns from outcomes instead of living in a slide deck."

Action: Click `Review in Leads →`.

## 2:50 to 3:15, Leads

What you see: a Brief card on the left ("Find organisations matching these won-deal industries..."), a counter "Find 10 companies" with a `Find leads` button, and "From 12 won deals". On the right, "Preview · 10 leads" with a grid: Pinnacle Stockbroking, Southbank Quant Research, Harbourview Wealth Advisors, UrbanEdge Property, Marrick Capital Partners, Brickfield Debt Fund and so on, each tagged Fictional, with Contact, Similarity, Trigger, Location, Status and Draft columns.

Action: Click the first row. The lead panel opens with "Why this matched", the Similarity score, the Outreach draft, and `Approve` and `Skip`. Do not click `Find leads` on stage; it starts a new search.

Say: "These ten companies are openly fictional: reserved dot-example domains, no deliverable contact details, no paid data subscription. What matters is the contract. The same brief plugs into a real company-data provider, the scoring is against the deals that won, and every outreach draft waits for approval and is never sent from here."

Action: Press Escape to close the panel.

## 3:15 to 3:30, close on Revenue loop

Action: Switch to the Revenue loop tab. It shows seven beats, Listen, Remember, Respond, Learn, Focus, Find and Execute, each with the evidence from the run you just did, and the line "In numbers, illustrative · 80 min a day · +1 deal a month · +2 replies".

Say: "One loop. The conversation becomes CRM truth, the outcome updates the ideal customer, and the ideal customer builds the next pipeline. Eighty minutes a day back for a rep doing eight calls, and every number on this page is labelled illustrative until a customer's own baseline replaces it. The path to production is direct: Aircall or Twilio for recordings, HubSpot for the writes, Gmail for delivery. The intelligence does not change."

Stop. Do not fill spare time. Invite questions.

## If something breaks

- The call page stalls on a step: click `Re-run` at the top right. A failed step shows `Try again` under it.
- Home will not load the call list: use the Conversations tab, which lists every call and email with its run state, and open Marlowe & Finch Accounting from there.
- The API is unreachable: run the terminal fallback below and say "I will show the same pipeline directly through our production API." Do not disguise a fallback as the UI.
- Intelligence shows "Not yet derived" under the ideal customer card: the scoring in step 3 of the checklist was skipped. Talk over the ideal customer card instead and move on.

## Terminal fallback

Run these once before the presentation so DNS, TLS and `jq` are warm. Run them again only if the UI action fails.

```bash
API=https://slipstream-api.3-104-149-193.sslip.io/api/v1
curl -fsS https://slipstream-api.3-104-149-193.sslip.io/ready | jq

CALL_ID=$(curl -fsS -X POST "$API/calls/fixtures/call-13-marlowe-finch-demo/ingest" | jq -r .id)
curl -fsS -X POST "$API/calls/$CALL_ID/extract" \
  | jq '{contact:.contact.name.value,company:.company.name.value,stage:.deal.stage.value,amount:.deal.amount.value,promises:(.promises|length),objections:(.objections|length),next_step:.next_step.description}'

DRAFT=$(curl -fsS -X POST "$API/drafts/from-call/$CALL_ID")
echo "$DRAFT" | jq '{id,recipient_name,recipient_email,subject,body,status}'
DRAFT_ID=$(echo "$DRAFT" | jq -r .id)
curl -fsS -X POST -H 'Content-Type: application/json' \
  -d '{"approved_by":"Demo presenter"}' "$API/drafts/$DRAFT_ID/approve" \
  | jq '{status,approved_by,approved_at,sent_at}'

curl -fsS "$API/demo/evidence" | jq '{status,lead_count,models,revenue_dna:.revenue_dna.status}'
```

Expected: Donnie Azoff, Marlowe & Finch Accounting, amount 48600, a next step due 11 September, a draft with status `draft` that approves to `approved` with an empty `sent_at`, and demo evidence `verified` with ten leads.

## Optional: the live coach

Only if the desktop coach is installed and was tested on this machine that morning. Click `Start call with coach` in the sidebar. The dialog asks for the customer's name and company, an optional "What do you know so far?", and an audio source: Call and mic, Call only, or Speakerphone. `Prepare coach` returns a link to paste into the desktop coach, which then listens and suggests. It runs on macOS only. If it was not tested, mention it in one sentence and do not open the dialog.

## Rough edges to know about, so nothing surprises you

- The demo call's deal stage reads Discovery and the badge says Open, although the fixture labels it won. See the note in the 0:30 section.
- The scorecard's "To improve" list on the current production model can contain boilerplate lines ("This scorecard has been completed successfully") instead of coaching points. Keep that list collapsed.
- The ideal customer's industry list includes "State transport infrastructure project" because North East Link is one of Eleno's public clients loaded as a won deal.
- Every restart of the API used to wipe the demo. Since 14 September storage is Supabase, so runs, the profile and the leads survive restarts.

## Likely judge interruptions

- "What is mocked?" The prospects, calls and generated leads are synthetic and labelled. The seller, Eleno, is a real company and a sponsor of this hackathon: its description comes from its public website and its seven publicly listed clients are loaded as won CRM deals with no invented contact, headcount, value or dialogue. Every other seller fact is a labelled demo assumption. Transcription, extraction, drafting, scoring, the ICP, embeddings and lead scoring run live through ElevenLabs and OpenRouter. Generated prospects use dot-example domains and cannot be emailed. Origami and email delivery have real adapters but are not configured, and the readiness endpoint says so.
- "Is this really a CRM integration?" The demo writes to Postgres tables shaped like HubSpot company, contact, deal, engagement and task objects. A production connector swaps those writes for HubSpot API calls; the extraction contract does not change.
- "What happens without keys?" Fixture ingestion falls back to the labelled fixtures and says so in the result. Paid transcription fails closed and cannot be enabled without an ingest token.
- "Why does nothing get sent?" Approval and delivery are separate on purpose. The delivery adapter sends only an exact approved draft behind a server token and a content-bound idempotency key, and the public deployment has no email credential, so no judge gets a surprise email.
- "How accurate is the extraction?" Every field has a confidence and a transcript span. A quote that cannot be found verbatim is dropped. Thirteen labelled calls run through the same endpoints in tests, and the scoring lane compares output with hand labels across a model bake-off recorded in the repo.
