# Slipstream

[![Continuous integration](https://github.com/Jeremy-Sharpe/slipstream/actions/workflows/ci.yml/badge.svg)](https://github.com/Jeremy-Sharpe/slipstream/actions/workflows/ci.yml)

**Your next customer should change when your last deal does.** Slipstream is the sales layer for small B2B teams that listens to calls, writes the CRM and follow-up, learns which customers actually convert, and refuses to spend the next lead-search credit when a new outcome has made that target stale.

Built for the Forward: AI in Business Hackathon, University of Melbourne, 12 to 14 September 2026.

Track: Track 1: Improve an Existing Business Capability (also entered in the Built With ElevenLabs special track)

Production URL: https://slipstream.3-104-149-193.sslip.io

Backup UI: https://slipstream-hackathon.vercel.app (Vercel quota-delayed; use the production URL above for the newest demo)

Production API: https://slipstream-api.3-104-149-193.sslip.io

Demo video: https://github.com/Jeremy-Sharpe/slipstream/releases/download/demo-video-v2/slipstream-demo-v2.mp4

## The problem and who it's for

**Who:** the head of sales, or the founder who still sells, at a 5 to 30 person B2B services firm (agencies, consultancies, professional services). They sell by phone and video call, they have a CRM, and they have no RevOps function, no sales enablement, and no time.

**What goes wrong:** the repository contains two anonymised qualitative inputs from the team's hackathon research—one sales-team conversation and one team debrief. They are directional, not a statistically representative sample. The broader capacity problem is independently consistent with Salesforce's 2026 State of Sales finding that reps spend [60% of an average week on non-selling work, including 13% manually entering data](https://www.salesforce.com/en-us/wp-content/uploads/sites/4/documents/reports/sales/salesforce-state-of-sales-report-2026.pdf).

- The CRM exists but nobody updates it after a call. Notes live in heads and notebooks, so the pipeline view is fiction and follow-ups slip.
- Nobody reviews calls. Reps get no feedback on what worked and what lost the deal, so the same mistakes repeat.
- Reps lose deals because they do not know what to ask. Verbatim from a sales team we spoke to: "they lose some clients because they don't know what to ask."
- Lead lists come from gut feel, not from who actually converted. Once the founder's network is exhausted, prospecting stalls. Verbatim from a team debrief: "once you exhaust your network you're actually pretty stuck outside of word of mouth referrals and paid marketing."

**The original mechanic is Revenue DNA, not merely bundling four tools:** each target profile carries a fingerprint of the exact calls, emails and won/lost outcomes that produced it. When one outcome changes, Slipstream detects that yesterday's target is stale, marks its downstream leads for re-scoring and blocks new provider spend until the profile relearns. This prevents a quiet failure in disconnected call-intelligence and lead-generation stacks: they keep buying tomorrow's leads from yesterday's assumptions. The rest of the loop makes the fingerprint possible—the call makes the CRM true, the CRM reveals who wins, and those wins decide who the team finds next.

## How it works

The live URL is five screens on the deployed API: Home (pick a recorded call, upload or record audio, paste a transcript, paste an email), Conversations, the run page for one call or thread, Leads, Intelligence and Revenue loop. Every field, score, lead and number on them is an API response; the web app holds no fixture copies and no fallback data. Browser calls go through a same-origin gateway (`app/gateway`) that adds the deployment's ingest token on the server, so the token never reaches the client.

1. **A sales call happens.** For the demo the call is synthesised with ElevenLabs text-to-dialogue (two voices, realistic objections) and played through speakers. Fixtures cover won, stalled, lost and no-show outcomes.
2. **The coach listens.** The rep presses **Start call with coach** in the top bar and a macOS desktop coach sits beside the calling app they already use. It hears the rep's microphone and the call audio as two separate ElevenLabs Scribe realtime streams, so it knows who said what, and shows one next question at a time. The model marks a card asked or answered only when it can quote the turn that covered it, so covered questions leave the screen and do not come back; Done, Skip and Undo stay available. In this version the advice draws on what the rep enters before the call and what is said on it.
3. **The call writes itself into the CRM.** With ElevenLabs configured, a recording is transcribed with Scribe and diarised. The configured reasoning model extracts contact, company, deal stage, promises made, objections raised and the agreed next step into CRM records the rep approves. The production API currently routes schema-constrained reasoning through OpenRouter to `openai/gpt-5.4`; private loopback Qwen remains a credential-free fallback.
4. **The follow-up drafts and schedules itself safely.** A follow-up email is generated from the transcript and attached to the deal. Approval is a separate, audited state. Exact approved draft IDs can then join a resumable campaign: a trusted Railway worker claims bounded chunks, Resend receives a stable identity, and each result is confirmed, retried, failed or surfaced for reconciliation. Operators can pause future chunks, while the browser gets status without the delivery token. Campaign execution is an API capability (`/api/v1/campaigns`) in this release rather than a screen; the current deployment exposes one paused synthetic campaign and stops before delivery.
5. **The team learns from every conversation.** The analysis view scores calls against a written rubric, shows which moves correlate with won deals, and derives the ideal customer profile from outcome-labelled CRM deals enriched by both call and email history. The canonical fixture cohort loads 20 CRM deals (12 labelled history calls, the voiced demo call and Eleno's seven publicly listed clients as call-less won deals) and proves 12 calls plus one email across the 19 deals eligible for the profile; the current live profile also includes the paused campaign's provider-neutral email, for two emails total.
6. **Revenue DNA catches every change.** Each ICP is bound to a deterministic fingerprint of the exact CRM evidence and outcomes that produced it. A new win, loss or conversation makes the target visibly stale and blocks the next paid search until the team relearns; existing leads are counted for re-scoring against the new version.
7. **The ICP finds the next customer.** One click turns that profile into ten fictional prospects through OpenRouter, each with an invented company and contact name on a reserved `.example` domain, marked Fictional in the UI, embeds and scores them against the won-deal centroid, and prepares grounded outreach. A real Origami v3 adapter remains available when a customer supplies that optional integration.

## Architecture

```
app/          Next.js 16 + React 19 UI (standalone VPS; Vercel backup). Home, Conversations, the run page, Leads, Intelligence, Revenue loop, the coached-call review, plus the server-side gateway that carries the ingest token. Visual contract in DESIGN.md.
api/          FastAPI (Python 3.12) AI pipeline (Jeremy's VPS, HTTPS). Transcription, extraction, scoring, ICP, Origami, drafts, live coaching. REST plus the coach WebSockets.
scheduler/    Dependency-free one-shot Railway cron worker. Claims one bounded campaign chunk, emits a PII-free result, then exits.
coach/        macOS desktop call coach (Electron). Captures microphone and call audio, streams both to Scribe realtime and talks to the API's coach session routes.
fixtures/     Twelve labelled sales-call scripts as seeded CRM history, one voiced demo call, and seven public Eleno clients as call-less won deals.
supabase/     Postgres migrations (pgvector enabled) and seed.
evals/        Judge evals and submission checks (see docs/judging-evals.md).
```

Supabase Postgres is the durable store design and the API owns access. The deployed VPS currently uses the same repository interface in memory because its Supabase credentials and eight later migrations are not installed; that operational boundary is reported by `/ready`. The CRM tables mirror HubSpot objects (contacts, companies, deals, notes, tasks, activities) so a real HubSpot integration is a field mapping, not a redesign. Full data model and data flow in `PROJECT.md`.

Why the split: the AI half wants Python (Anthropic and ElevenLabs SDKs, pgvector clients, eval tooling); the UI half wants a hosted Next.js app; one API seam between them is what a telephony or CRM integration plugs into later.

## Model choices

| Step | Model | Why |
|---|---|---|
| Mock call generation | ElevenLabs text-to-dialogue, `eleven_v3` | Multi-voice, expressive, one request per call |
| Batch transcription | ElevenLabs Scribe, `scribe_v2`, diarised | Word timestamps and speaker labels feed the scorecard (talk ratio, who committed to what) |
| Live transcription | ElevenLabs Scribe v2 Realtime over WebSocket | About 150 ms latency; same vendor as batch so the coach and the record agree |
| Extraction and follow-up draft | The model named by `REASONING_MODEL` through one provider-agnostic structured-output helper (Anthropic, OpenAI, OpenRouter, or the private local runtime), pinned JSON schema, then a deterministic grounding pass that repairs or drops any quote that is not verbatim in the transcript | Production uses `openai/gpt-5.4` through OpenRouter after the smaller default model failed the strict long-call evidence gate. The private Qwen runtime remains a loopback-only fallback, and every artifact reports its exact provider and model. The seven-model bake-off still picks Mistral Medium 3.1 for a credentialed deployment at 86.5% mean judged pass rate, 7.4 s mean latency and $0.0034 measured cost per call; full misses and evidence remain in `api/evals/extraction-eval.md` |
| Scorecard and playbook | `deepseek/deepseek-v3.2` through OpenRouter | Won the predeclared eleven-model rule: within one call of the best on every judged dimension and about 25 times cheaper than the accuracy-first runner-up. The playbook pairs deterministic won-versus-other behaviours computed from the scorecards with judge-found patterns that must quote the scorecards' own evidence verbatim. The judge's coaching narratives (went well, to improve, summary) are stored after validation: a quoted span must appear in the transcript, a summary that claims a next step the evidence did not support is replaced, and the deterministic sentences remain the per-field fallback. Spot-checked live on a won and a lost fixture call on 13 September: both narratives cited turns and agreed with the validated counts |
| Email thread reply | Same helper and prompt discipline as the call follow-up (`email-reply-v1`), then the same risky-claim check | A reply is drafted by the reasoning model from the ordered thread and fails closed on guarantees or invented terms; the deterministic template is only the keyless fallback |
| ICP naming | Same provider-agnostic helper, configured by environment | One helper keeps prompts, schema validation and provider failover in one place |
| Live coach suggestions and card completion | `openai/gpt-5.4` through OpenRouter, prompt `coach-session-v2.md`, plus deterministic guards | Deciding a question was asked or answered hides a card, so precision comes first. A ten-case spot check (`api/evals/coach-eval.md`) went from 0.60 to 1.00 precision at 1.00 recall across three runs as the prompt and guards were fixed; median analysis 2.8 s. Ten cases and one run each, so this is a spot check, not a benchmark |
| Embeddings | `text-embedding-3-small` through OpenAI or OpenRouter, or the private local Nomic Embed Text v1.5 Q4_K_M fallback; stored in pgvector when Supabase is configured | Production routes `text-embedding-3-small` through OpenRouter for won-deal similarity and lead scoring; the pinned local Nomic runtime remains the credential-free fallback |
| Lead discovery | OpenRouter proof generator; optional Origami v3 adapter | The public demo generates fictional prospects only: invented names that a guard keeps clear of the real Eleno clients and fixture companies, `.example` domains derived from the name, and no deliverable contact details. The same derived brief can be sent to Origami when configured |

**Evaluation.** The scorecard rubric is a written document in the repo. All thirteen fixture calls are hand-labelled for the rubric dimensions and the extraction fields; the seven public-client CRM rows carry no call, no dialogue and no labels. `api/evals/run_extraction_eval.py` runs the live extraction path per model and reports per-field agreement, grounding repairs, latency and billed cost, with the results and the model decision recorded in `api/evals/extraction-eval.md`; the scorecard eval does the same for the judge. Judge evals in `evals/` score this README and the live app against the hackathon rubric.

## Alternatives and differentiation

| Category | Existing tools | Why they do not fit this user |
|---|---|---|
| Call intelligence | Gong, Chorus, Attention | Enterprise price and seat minimums; they record and analyse but do not source the next customer |
| Note takers | Fireflies, tl;dv, Granola | Produce notes, not CRM records, not coaching, not leads |
| Lead generation | Clay, Apollo, Origami on its own | You have to tell them who to find; they cannot learn it from your calls |
| CRM AI add-ons | HubSpot AI, Salesforce Einstein | Assume a clean CRM to begin with, which this user does not have |
| Live assistants | Cluely and its open-source clones | Generic answers from a screen; no CRM context, no memory of the deal, no downstream action |

Slipstream is the closed loop. Its Revenue DNA gate is the key difference: call tools report on yesterday and lead tools spend against a persona, while Slipstream prevents tomorrow's search from using a target invalidated by today's outcome. Enterprise teams can approximate the rest by paying for Gong plus Clay plus a RevOps person to stitch them together. A 12-person services firm cannot, and that is the gap.

**Two deliberate design decisions:** Revenue DNA turns model freshness into an enforceable spending boundary instead of a dashboard warning; evidence-linked fields make every automated CRM fact inspectable and drop unsupported claims instead of asking a rep to trust model fluency. The interactive, non-mutating outcome shock test on Intelligence lets a judge watch that first decision propagate from a hypothetical CRM outcome to stale-profile detection, lead re-scoring and sourcing protection without changing production data.

## Feasibility and value

**Value.** Our clearly labelled demo assumption is 10 minutes of CRM and follow-up admin per call at 8 calls a day. That is 6.7 hours of rep capacity per five-day week—or about $500 per rep per week at an illustrative $75 loaded hourly cost. The Revenue Loop shows this formula directly; these are adjustable operating assumptions, not measured customer results. It also makes the two larger upside claims falsifiable with scenario math: at 40 qualified opportunities per month, moving a 20% win rate to 22.5% means one additional win; at 200 outbound prospects, moving positive replies from 5% to 6% means two additional buyer conversations. Those are transparent what-if scenarios—not forecasts or claimed pilot results—and a real pilot would replace the inputs with the customer's baseline. The mechanism behind them is that coaching addresses missed questions while Revenue DNA scores sourcing against customers who actually converted.

**From demo to product.**

- Telephony: replace the file upload with a recording webhook from Aircall or Twilio, or a meeting bot for video calls. The pipeline does not change.
- CRM: swap the Supabase CRM tables for HubSpot writes using the object mapping; keep Supabase for calls, embeddings and ICP state.
- Cost and pricing: the measured flagship-model fixture pass was $0.43 across 13 calls, about $0.03 of reasoning and embedding cost per processed call. [ElevenLabs lists Scribe v2 at $0.22 per audio hour](https://elevenlabs.io/pricing/api), adding roughly $0.04 for a ten-minute call before optional features and tax. At eight ten-minute calls a day, the combined reasoning, embedding and transcription estimate is about $0.53 per rep-day before storage or real lead data. The public proof needs only OpenRouter and reuses unchanged ICP and lead artifacts. A credible starter plan is $49 per rep per month, leaving room for usage while pricing below the separate enterprise tools a small team would otherwise stitch together; that price is our proposed model, not validated willingness to pay.
- Privacy: call recording consent is jurisdiction-specific; recording runs only through the rep's consent flow and transcripts stay in the customer's own database.
- Adoption: the coach and the auto-draft deliver value on the first call, before there is enough history for an ICP. The loop gets better as the team sells.
- Go to market: start with founder-led 14-day pilots for 5-30-person agencies, consultancies and allied-health operators reached through CRM implementers and founder communities. The pilot imports a small won/lost history, measures CRM minutes saved and follow-up approval rate, then converts the team only if those agreed measures improve. This is the proposed acquisition motion, not a claim of completed pilots.
- Production path: an estimated three-week pilot hardening sequence is (1) tenant authentication plus a HubSpot sandbox connector, (2) Aircall or Twilio recording webhooks plus Gmail delivery, then (3) recording-consent flows, retention controls and one design-partner rollout. Each step replaces an adapter around the tested intelligence contract rather than rebuilding the workflow.

## Known limitations

- The seller is Eleno, a real company and a sponsor of this hackathon: its description in `fixtures/seller.json` comes from its public website and its seven publicly listed clients are loaded as won CRM deals with no invented contact, headcount, value or dialogue, while every other seller fact, every prospect and every call in the fixtures is fictional and every domain is a reserved `.example` domain.
- The CRM is our own Postgres tables shaped like HubSpot objects, not a live HubSpot.
- No phone system integration. Audio arrives as a file or through the coach overlay.
- Approval never claims delivery. The Resend adapter can deliver one exact approved draft or a bounded explicit campaign through separately authenticated server-side endpoints; durable leases, pause/resume controls and per-item outcomes are implemented, but the current deployment has no email-provider credential or Railway login.
- Call scoring is rubric-based LLM-as-judge with a twelve-call labelled bake-off, not a trained model.
- Extraction is grounded but not perfect: a value whose quote cannot be found verbatim in the transcript is dropped rather than shown, so a rep can see a null where the model paraphrased. Deal outcome and stage are model judgement calls scored against hand labels in the eval, not ground truth.
- The live coach runs on macOS only (call audio capture needs macOS 14.2 or later) and ships unsigned. In this version its advice uses the customer details the rep enters plus the live call, not the CRM history, and its automatic asked/answered detection is covered by unit tests but has no measured precision on real calls yet.
- Single tenant, no auth, no billing. The signed-in user, seller and rep identities are sample data in `lib/data/seller.json`, and the Home placeholders in `lib/data/placeholders.ts`; a production build reads them from the CRM.
- Campaigns, calendar, lists and settings screens from the earlier UI are not in this release; the API keeps campaigns and the Revenue DNA freshness gate, and Intelligence shows the freshness state.
- Scoring, playbook derivation, pasted email threads and audio transcription need the web server to hold `SLIPSTREAM_INGEST_TOKEN` (the API's `INGEST_TOKEN`). Without it those actions show a locked message and the run continues past them; extraction, drafting, approval, ICP and leads never need it.
- Pasted transcripts persist through the live-coach websocket relayed by the web server, because the API has no raw-transcript ingest endpoint.
- The linked demo video was recorded on the earlier UI; the screens differ from the current production build.
- The hosted API currently uses in-memory persistence and has no managed Supabase, Origami, Resend or Railway credentials. OpenRouter reasoning and embeddings are verified live; the UI identifies fictional lead generation, evaluation fixtures and every unavailable integration rather than implying third-party enrichment or delivery.

## Run locally

```bash
# UI
npm install && npm run dev            # http://localhost:3000, browser calls proxy to NEXT_PUBLIC_API_BASE_URL through app/gateway

# API
cd api && uv sync && uv run uvicorn app.main:app --reload   # http://localhost:8000

# Coach
cd coach && npm install && npm start

# Evals
npm run evals:dry                     # submission checks, seconds
npm run evals                         # LLM judge on every criterion

# Scheduler contract
cd scheduler && python3 -m unittest -v test_run.py
```

An unsigned macOS coach installer is built and tested by the pinned [Coach installers workflow](https://github.com/Jeremy-Sharpe/slipstream/actions/workflows/coach-release.yml); production distribution still requires Developer ID signing and notarisation.

Copy `.env.example` to `.env` (UI and coach) and to `api/.env` and fill in the keys. Working rules for contributors and agents are in `CLAUDE.md`; the build plan is in `PROJECT.md`; who is building what is in `BOARD.md`.

## Licence

MIT.
