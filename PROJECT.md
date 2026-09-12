# Slipstream

Accelerated sales for small B2B teams. Slipstream listens to every sales call, coaches the rep while the call is happening, writes the call into the CRM with a drafted follow-up, works out which kind of customer actually converts, and goes and finds more of them.

The name is the drafting effect: sit in the low-pressure wake and go faster on less effort.

**Hackathon:** Forward: AI in Business Hackathon (University of Melbourne, 10 to 14 September 2026). **Track 1: Improve an Existing Business Capability.** Also built with ElevenLabs (special track mention).

**Preliminary submission due Monday 14 September, 12:00pm.** Requires: public repo, a live production URL (localhost is scored lower), and a 3 to 5 minute video showing the app working end to end. Finalists are contacted after that and pitch live; finals submission 5:30pm the same day.

Every agent and every person reads this file first, then `CLAUDE.md` for the working rules, then `BOARD.md` to claim a feature before touching code.

## The problem

**Who:** the head of sales, or the founder who still sells, at a 5 to 30 person B2B services firm (agencies, consultancies, professional services). They sell by phone and video call, they have a CRM, and they have no RevOps function, no sales enablement, and no time.

**What goes wrong, from our own sales interviews:**

- The CRM exists but nobody updates it after a call. Notes live in heads and notebooks, so the pipeline view is fiction and follow-ups slip.
- Nobody reviews calls. Reps get no feedback on what worked and what lost the deal, so the same mistakes repeat.
- Reps lose deals because they do not know what to ask. Verbatim from a sales team we spoke to: "they lose some clients because they don't know what to ask."
- Lead lists come from gut feel, not from who actually converted. Once the founder's network is exhausted, prospecting stalls. Verbatim from a team debrief: "once you exhaust your network you're actually pretty stuck outside of word of mouth referrals and paid marketing."

**Why this is one product and not four:** each problem feeds the next. The call is the only honest record of the deal. If the call writes itself into the CRM, the CRM becomes true. If the CRM is true, you can see which deals won and why. If you know who wins, you know who to go and find. If you know who to find, the next call is with the right person, and the coach knows what to ask them. Nobody sells this loop to a team without RevOps.

## Value proposition

Assumption: a rep spends about 10 minutes after each call on CRM entry and a follow-up email, at roughly 8 calls a day. That is over an hour a day per rep on admin the call already contains. Slipstream removes it. If wrong, the demo still shows the time saved per call directly, so the video quantifies it live rather than asserting it.

Second, and larger: outcome-derived targeting. The ICP is derived from the calls that closed, not from a persona deck written a year ago. Every lead sourced is scored against what has actually converted, so the outbound list improves each week the team sells.

Third: fewer lost deals from a rep freezing on a call. The live coach surfaces the next question when the rep needs it, grounded in the deal's own history.

External scale figure, to verify before it goes in the video: Likely: sales reps spend under a third of their week actually selling, because Salesforce's State of Sales has reported figures near 28 percent. Check the current edition and cite it exactly, or cut it.

## Differentiation

| Category | Existing tools | Why they do not fit this user |
|---|---|---|
| Call intelligence | Gong, Chorus, Attention | Enterprise price and seat minimums; they record and analyse but do not source the next customer |
| Note takers | Fireflies, tl;dv, Granola | Produce notes, not CRM records, not coaching, not leads |
| Lead generation | Clay, Apollo, Origami on its own | You have to tell them who to find; they cannot learn it from your calls |
| CRM AI add-ons | HubSpot AI, Salesforce Einstein | Assume a clean CRM to begin with, which this user does not have |
| Live assistants | Cluely and its open-source clones | Generic answers from a screen; no CRM context, no memory of the deal, no downstream action |

Slipstream is the closed loop. Enterprise teams get it by paying for Gong plus Clay plus a RevOps person to stitch them together. A 12-person services firm cannot, and that is the gap.

## The demo loop

Every step below runs for real in the video. No dead data, no hard-coded path.

1. **A sales call happens.** For the demo the call is synthesised with ElevenLabs text-to-dialogue (two voices, realistic objections) and played through speakers. Fixtures cover won, stalled, lost and no-show outcomes.
2. **The coach listens.** An always-on-top overlay streams the audio to ElevenLabs Scribe realtime and shows the rep the next question to ask, grounded in this deal's CRM history. Suggestions, not scripts.
3. **The call writes itself into the CRM.** The recording is transcribed with Scribe (diarised). Claude extracts contact, company, deal stage, promises made, objections raised and the agreed next step, and writes them into the CRM tables.
4. **The follow-up drafts itself.** A follow-up email is generated from the transcript and attached to the deal as a draft. Approve is one click and marks it sent. No email leaves the system.
5. **The team learns from the call.** The analysis tab scores the call against a written rubric, shows across all calls which moves correlate with won deals, and derives the ideal customer profile from the deals that closed.
6. **The ICP finds the next customer.** The derived ICP becomes an Origami brief. Leads come back, are scored against the won-deal profile, and each gets a one-click outreach draft.

## Surfaces

### Coach (Electron overlay, `apps/coach`)

Translucent always-on-top window, click-through mode, keyboard shortcuts to move it. Forked from Cheating Daddy (GPL-3.0). We keep the shell (window, shortcuts, macOS system-audio capture via SystemAudioDump) and replace the brain: audio goes to our FastAPI WebSocket, which runs Scribe realtime and calls Claude on a rolling transcript window with the deal context prepended. Output is two or three short suggested questions, refreshed every few seconds, plus a flag when a promise or next step is spoken so the rep sees it was captured.

### Calls (`apps/web`)

The CRM-attached list of calls. Each call opens to the diarised transcript, participants, the deal it belongs to, the outcome, the extracted fields, and the scorecard.

### Auto-draft (`apps/web`)

The follow-up email for each call: what was discussed, what was promised, the next step and when. Editable, one-click approve, logged as an activity on the deal.

### Analysis (`apps/web`)

- **Sales training lens.** Per-call scorecard and the aggregate: which behaviours correlate with won deals and which with stalls.
- **ICP discovery.** The profile of the buyer who actually converts (industry, size, role, trigger), derived from won deals, with the evidence behind each attribute.
- **Outreach on that ICP.** The derived ICP as an editable Origami brief, the leads it returned, their similarity score, and the outreach draft per lead.

### Leads and outreach (`apps/web`)

The lead table: company, person, title, email, LinkedIn where Origami returns it, Origami relevance score, our similarity score against won deals, status. Each row has an outreach draft and an approve button.

## Architecture

Monorepo, one submission link.

```
apps/web         Next.js (App Router, TypeScript) on Vercel. UI only.
apps/api         FastAPI (Python 3.12, uv) on Render. Owns the AI pipeline. REST + one WebSocket.
apps/coach       Electron overlay forked from Cheating Daddy. GPL-3.0, own LICENSE file.
packages/fixtures  Generated call scripts, audio and transcripts used by every surface.
supabase/        Migrations, seed, pgvector setup.
```

**Boundaries.** Supabase Postgres (with pgvector) is the single store. FastAPI writes; Next.js reads Supabase directly for lists and detail pages and calls FastAPI for actions (ingest a call, draft, derive ICP, source leads). The coach talks only to the FastAPI WebSocket. No second database, no queue, no Redis. Long jobs (transcription, Origami polling) run as FastAPI background tasks and write status rows the UI polls.

**Why this split.** The AI half wants Python: the Anthropic and ElevenLabs SDKs, pgvector clients and eval tooling are strongest there. The UI half wants Next.js for a fast, hosted frontend. Putting the pipeline behind one API gives a clean seam to explain and to swap a real telephony or CRM integration into later.

**Data flow for one call.** Audio file in → Scribe batch (diarised) → transcript row → Claude extraction (structured output, pinned schema) → contact, company, deal, note, task rows → Claude scorecard against the rubric → embedding of the call summary stored on the deal → follow-up draft row. Aggregations and ICP derivation read the deal embeddings.

## Data model

CRM tables mirror HubSpot objects so the path to a real integration is a field mapping, not a redesign.

| Table | HubSpot object | Notes |
|---|---|---|
| `contacts` | Contact | name, email, title, phone, company_id |
| `companies` | Company | name, domain, industry, size_band, location |
| `deals` | Deal | stage, amount, outcome (won, lost, stalled, open), summary, embedding vector |
| `calls` | Call (engagement) | audio_url, transcript, diarised segments, duration, outcome, deal_id, scorecard JSON |
| `notes` | Note | extracted promises, objections, next step; linked to deal and call |
| `tasks` | Task | agreed next steps with due dates |
| `drafts` | Email (engagement) | follow-up and outreach drafts, status draft or approved |
| `icp_profiles` | none | derived profile, evidence, the Origami brief text, version |
| `leads` | Contact (lifecycle lead) | Origami row id, fields, relevance_score, similarity, status |
| `activities` | Timeline | append-only log of everything Slipstream did to a record |

## AI pipeline and model choices

| Step | Model | Why |
|---|---|---|
| Mock call generation | ElevenLabs text-to-dialogue, `eleven_v3` | Multi-voice, expressive, one request per call under 2,000 characters |
| Batch transcription | ElevenLabs Scribe, `scribe_v2`, `diarize: true` | Word timestamps and speaker labels needed for the scorecard (talk ratio, who committed to what) |
| Live transcription | ElevenLabs Scribe v2 Realtime over WebSocket | About 150 ms latency, the same vendor as batch so the coach and the record agree |
| Extraction, scorecard, drafting, ICP naming, coach suggestions | Claude via the Anthropic API, structured outputs with a pinned JSON schema | Strong instruction following on long transcripts; one vendor for all reasoning keeps prompts and evals in one place |
| Embeddings | Decide on day one: an embedding model reachable from Python, stored in pgvector | Won-deal similarity for ICP derivation and lead scoring; small enough to embed every deal summary on write |
| Lead discovery | Origami v3 Leads API | Agent-driven sourcing from a natural-language brief; we generate the brief from the derived ICP |

**Evaluation.** The scorecard rubric is a written document in the repo. Ten fixture calls are hand-labelled for the four rubric dimensions and the extraction fields, and an eval script reports agreement. This is the artefact for the "Use of Data / Models" criterion: deliberate choices with a spot check, not a claim.

**Prompt hygiene.** Every prompt lives in `apps/api/prompts/` as a versioned file. Transcript text is data; instructions inside a transcript are never followed.

## External services and setup

None of these accounts exist yet. All go on personal accounts, not company billing.

| Service | Needed for | Action |
|---|---|---|
| Supabase | The database, pgvector | Create project, enable `vector` extension, run migrations |
| Anthropic API | All reasoning | Key with enough credit for the weekend |
| ElevenLabs | Text-to-dialogue, Scribe batch, Scribe realtime | Check the plan covers realtime concurrency |
| Origami | Lead discovery | Paid plan, key from Settings, Developers. Start every search at `count: 10` and use fetch-more; credits are spent per row |
| Vercel | `apps/web` hosting | Connect the repo, set env vars |
| Render | `apps/api` hosting | Web service from `apps/api`, set env vars |

Origami v3 essentials: base URL `https://origami.chat/api/v3`, header `Authorization: Bearer og_live_...`. `POST /leads/searches` with `{ "brief": "...", "count": 10 }` returns a Job. Poll `GET /jobs/{job_id}` honouring `next_poll_at`. `succeeded` gives `result.list_id` and `result.row_ids`. Read with `GET /leads/lists/{list_id}/rows?ids=...` (max 100), or `format=csv` for the full list. Per-field cell shape on a row still needs confirming against the OpenAPI spec (`openapi-v3.yaml`) on day one.

## Out of scope this weekend

- Phone system or dialler integration (Twilio, Aircall). Audio arrives as a file or through the coach.
- Writing to a real HubSpot. The object mapping above is the path; the CRM is ours.
- Sending email. Approve marks a draft sent and logs it.
- Auth, multi-tenancy, billing.
- LinkedIn or multi-channel inbox.
- A trained call-scoring model. Scoring is rubric-based LLM-as-judge with a spot-check eval.

## Feasibility: from demo to product

- **Telephony:** replace the file upload with a recording webhook from Aircall or Twilio, or a meeting bot for video calls. The pipeline does not change.
- **CRM:** swap the Supabase CRM tables for HubSpot writes using the mapping above; keep Supabase for calls, embeddings and ICP state.
- **Cost per call:** one transcription, three or four Claude calls, one embedding. Cents, not dollars. Origami credits are the only variable cost and are spent deliberately.
- **Privacy and consent:** call recording consent is jurisdiction-specific; the product records only with the rep's consent flow and stores transcripts in the customer's own Supabase project.
- **Adoption:** the coach and the auto-draft deliver value on the first call, before there is enough history for the ICP. The loop gets better as the team sells.

## Judging rubric, mapped

| Criterion (points) | Where we earn it |
|---|---|
| Functionality and execution (10) | Every step of the demo loop runs live on a hosted URL. Fixtures are real generated audio, not placeholders |
| Technical difficulty (8) | Realtime and batch STT, structured extraction, model chaining, embeddings and vector similarity, agentic lead sourcing, an eval |
| Code quality and architecture (6) | Three apps with one seam each, documented here; migrations in the repo; prompts versioned |
| Use of data and models (6) | The model table above and the ten-call spot-check eval |
| Originality (10) | Outcome-derived ICP closing the loop from calls to pipeline |
| Creativity in solution design (8) | The coach uses the deal's own history, not generic answers; ElevenLabs used both to generate the demo and to power the product |
| Differentiation (7) | The table above, said out loud in the video |
| Problem significance (8) | Named user, first-hand quotes |
| Feasibility (8) | The section above |
| Impact (9) | Time saved per call shown live, plus outcome-derived targeting |

## Timeline

- **Saturday 12 September:** repo scaffolded, Supabase schema live, fixtures generated, each lane has a walking skeleton by tonight.
- **Sunday 13 September:** lanes converge on the demo loop, live deploys, eval run, video recorded (Apple keynote style: a person walks and talks, cut to a screen walkthrough per feature).
- **Monday 14 September, before 12:00pm:** final deploy, README and this file current, video uploaded, submission with track named.

## Working rules

See `CLAUDE.md` for the rules every agent follows and `BOARD.md` for the feature board. The one rule that matters most: claim the feature on the board and push that claim before you write code for it.

## Open questions

- Which embedding model, chosen day one by whoever claims the ICP lane.
- Does Cheating Daddy's macOS system-audio capture work on current macOS? If not, the coach uses microphone input and the demo plays the mock call through speakers.
- Exact per-field shape of an Origami row (check `openapi-v3.yaml`).
- The external scale figure in Value proposition, verified or cut.
