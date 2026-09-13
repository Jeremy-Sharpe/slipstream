# Slipstream

[![Continuous integration](https://github.com/Jeremy-Sharpe/slipstream/actions/workflows/ci.yml/badge.svg)](https://github.com/Jeremy-Sharpe/slipstream/actions/workflows/ci.yml)

Accelerated sales for small B2B teams. Slipstream listens to every sales call, coaches the rep while the call is happening, writes the call into the CRM with a drafted follow-up, works out which kind of customer actually converts, and goes and finds more of them.

Built for the Forward: AI in Business Hackathon, University of Melbourne, 12 to 14 September 2026.

Track: Track 1: Improve an Existing Business Capability (also entered in the Built With ElevenLabs special track)

Production URL: https://slipstream-hackathon.vercel.app

Production API: https://slipstream-api.3-104-149-193.sslip.io

Demo video: https://github.com/Jeremy-Sharpe/slipstream/releases/download/demo-video-v1/slipstream-demo.mp4

## The problem and who it's for

**Who:** the head of sales, or the founder who still sells, at a 5 to 30 person B2B services firm (agencies, consultancies, professional services). They sell by phone and video call, they have a CRM, and they have no RevOps function, no sales enablement, and no time.

**What goes wrong, from our own sales interviews:**

- The CRM exists but nobody updates it after a call. Notes live in heads and notebooks, so the pipeline view is fiction and follow-ups slip.
- Nobody reviews calls. Reps get no feedback on what worked and what lost the deal, so the same mistakes repeat.
- Reps lose deals because they do not know what to ask. Verbatim from a sales team we spoke to: "they lose some clients because they don't know what to ask."
- Lead lists come from gut feel, not from who actually converted. Once the founder's network is exhausted, prospecting stalls. Verbatim from a team debrief: "once you exhaust your network you're actually pretty stuck outside of word of mouth referrals and paid marketing."

**Why this is one product and not four:** each problem feeds the next. The call is the only honest record of the deal. If the call writes itself into the CRM, the CRM becomes true. If the CRM is true, you can see which deals won and why. If you know who wins, you know who to go and find. If you know who to find, the next call is with the right person, and the coach knows what to ask them.

## How it works

The live URL exposes the complete product surface and an executable fixture loop. Call and email CRM writeback and drafting run against the deployed API; analysis and lead screens consume validated live responses when their integrations are available and otherwise show explicitly labelled evaluation data. No screen silently presents fallback data as live.

1. **A sales call happens.** For the demo the call is synthesised with ElevenLabs text-to-dialogue (two voices, realistic objections) and played through speakers. Fixtures cover won, stalled, lost and no-show outcomes.
2. **The coach listens.** An always-on-top desktop overlay can stream the consented rep microphone to ElevenLabs Scribe realtime and shows the rep the next question to ask, grounded in this deal's CRM history. Its credential-free manual mode demonstrates both sides; this build does not claim mixed call-audio capture.
3. **The call writes itself into the CRM.** With ElevenLabs configured, a recording is transcribed with Scribe and diarised. The configured reasoning model extracts contact, company, deal stage, promises made, objections raised and the agreed next step into CRM records the rep approves. Hosted model credentials take priority; the keyless production API runs a private loopback-only Qwen model, while the labelled fixture fallback is used only when no reasoning provider exists.
4. **The follow-up drafts and schedules itself safely.** A follow-up email is generated from the transcript and attached to the deal. Approval is a separate, audited state. Exact approved draft IDs can then join a resumable campaign: a trusted Railway worker claims bounded chunks, Resend receives a stable identity, and each result is confirmed, retried, failed or surfaced for reconciliation. Operators can pause future chunks, while the browser gets status without the delivery token. The current keyless deployment exposes one paused synthetic campaign and stops before delivery.
5. **The team learns from every conversation.** The analysis view scores calls against a written rubric, shows which moves correlate with won deals, and derives the ideal customer profile from outcome-labelled CRM deals enriched by both call and email history. The live profile currently proves 12 calls plus one email across 13 deals.
6. **The ICP finds the next customer.** The derived ICP becomes an Origami brief. Leads come back, are scored against the won-deal profile, and each gets a one-click outreach draft.

## Architecture

```
app/          Next.js 16 + React 19 UI (Vercel). Conversations, analysis, leads. Calls the API for live data and actions.
api/          FastAPI (Python 3.12) AI pipeline (Jeremy's VPS, HTTPS). Transcription, extraction, scoring, ICP, Origami, drafts. REST plus one WebSocket.
scheduler/    Dependency-free one-shot Railway cron worker. Claims one bounded campaign chunk, emits a PII-free result, then exits.
coach/        Electron live-coach overlay, forked from Cheating Daddy (GPL-3.0). Talks only to the api WebSocket.
fixtures/     Twelve labelled sales-call scripts as seeded CRM history, plus one voiced demo call.
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
| Extraction and follow-up draft | The model named by `REASONING_MODEL` through one provider-agnostic structured-output helper (Anthropic, OpenAI, OpenRouter, or the private local runtime), pinned JSON schema, then a deterministic grounding pass that repairs or drops any quote that is not verbatim in the transcript | Hosted provider keys take priority. The keyless VPS now runs the official Apache-2.0 Qwen2.5 1.5B Instruct Q4_K_M through loopback-only llama.cpp and reports its exact provenance in `/ready` and every artifact. CPU inference takes minutes, so the demo precomputes records. The seven-model bake-off still picks Mistral Medium 3.1 for a credentialed deployment at 86.5% mean judged pass rate, 7.4 s mean latency and $0.0034 measured cost per call; full misses and evidence remain in `api/evals/extraction-eval.md` |
| Scorecard | `deepseek/deepseek-v3.2` through OpenRouter | Won the predeclared eleven-model rule: within one call of the best on every judged dimension and about 25 times cheaper than the accuracy-first runner-up |
| ICP naming and coach suggestions | Same provider-agnostic helper, configured by environment | One helper keeps prompts, schema validation and provider failover in one place |
| Embeddings | `text-embedding-3-small` through OpenAI or OpenRouter, or the private local Nomic Embed Text v1.5 Q4_K_M fallback; stored in pgvector when Supabase is configured | Won-deal similarity for ICP derivation and lead scoring. The keyless production runtime serves a pinned 768-dimensional Nomic model on loopback and stamps its exact identity on profiles and leads |
| Lead discovery | Origami v3 Leads API | Agent-driven sourcing from a natural-language brief generated from the derived ICP |

**Evaluation.** The scorecard rubric is a written document in the repo. All thirteen fixture calls are hand-labelled for the rubric dimensions and the extraction fields. `api/evals/run_extraction_eval.py` runs the live extraction path per model and reports per-field agreement, grounding repairs, latency and billed cost, with the results and the model decision recorded in `api/evals/extraction-eval.md`; the scorecard eval does the same for the judge. Judge evals in `evals/` score this README and the live app against the hackathon rubric.

## Alternatives and differentiation

| Category | Existing tools | Why they do not fit this user |
|---|---|---|
| Call intelligence | Gong, Chorus, Attention | Enterprise price and seat minimums; they record and analyse but do not source the next customer |
| Note takers | Fireflies, tl;dv, Granola | Produce notes, not CRM records, not coaching, not leads |
| Lead generation | Clay, Apollo, Origami on its own | You have to tell them who to find; they cannot learn it from your calls |
| CRM AI add-ons | HubSpot AI, Salesforce Einstein | Assume a clean CRM to begin with, which this user does not have |
| Live assistants | Cluely and its open-source clones | Generic answers from a screen; no CRM context, no memory of the deal, no downstream action |

Slipstream is the closed loop. Enterprise teams get it by paying for Gong plus Clay plus a RevOps person to stitch them together. A 12-person services firm cannot, and that is the gap.

## Feasibility and value

**Value.** Our clearly labelled demo assumption is 10 minutes of CRM and follow-up admin per call at 8 calls a day. That is 6.7 hours of rep capacity per five-day week—or about $500 per rep per week at an illustrative $75 loaded hourly cost. The Revenue Loop shows this formula directly; these are adjustable operating assumptions, not measured customer results. Larger still: the ICP is derived from the calls that closed, not from a persona deck, so every lead sourced is scored against what has actually converted and the outbound list improves each week the team sells. And the live coach means fewer deals lost to a rep freezing on a question.

**From demo to product.**

- Telephony: replace the file upload with a recording webhook from Aircall or Twilio, or a meeting bot for video calls. The pipeline does not change.
- CRM: swap the Supabase CRM tables for HubSpot writes using the object mapping; keep Supabase for calls, embeddings and ICP state.
- Cost per call: one transcription, three or four reasoning calls, one embedding. Measured fixture costs are in `PROJECT.md`; Origami credits are the only material variable cost and are spent deliberately.
- Privacy: call recording consent is jurisdiction-specific; recording runs only through the rep's consent flow and transcripts stay in the customer's own database.
- Adoption: the coach and the auto-draft deliver value on the first call, before there is enough history for an ICP. The loop gets better as the team sells.

## Known limitations

- The CRM is our own Postgres tables shaped like HubSpot objects, not a live HubSpot.
- No phone system integration. Audio arrives as a file or through the coach overlay.
- Approval never claims delivery. The Resend adapter can deliver one exact approved draft or a bounded explicit campaign through separately authenticated server-side endpoints; durable leases, pause/resume controls and per-item outcomes are implemented, but the current deployment has no email-provider credential or Railway login.
- Call scoring is rubric-based LLM-as-judge with a twelve-call labelled bake-off, not a trained model.
- Extraction is grounded but not perfect: a value whose quote cannot be found verbatim in the transcript is dropped rather than shown, so a rep can see a null where the model paraphrased. Deal outcome and stage are model judgement calls scored against hand labels in the eval, not ground truth.
- Single tenant, no auth, no billing.
- The hosted API currently uses in-memory persistence and has no managed Supabase, Origami, Resend or Railway credentials. It does run pinned local Qwen reasoning and Nomic embedding models, and the UI identifies every remaining evaluation fallback.

## Run locally

```bash
# UI
npm install && npm run dev            # http://localhost:3000

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

Unsigned Linux, macOS and Windows coach installers are reproducibly built and tested by the pinned [Coach installers workflow](https://github.com/Jeremy-Sharpe/slipstream/actions/workflows/coach-release.yml); production distribution still requires platform signing and notarisation.

Copy `.env.example` to `.env` (UI and coach) and to `api/.env` and fill in the keys. Working rules for contributors and agents are in `CLAUDE.md`; the build plan is in `PROJECT.md`; who is building what is in `BOARD.md`.

## Licence

MIT, except `coach/`, which is GPL-3.0 (see its own `LICENSE`).
