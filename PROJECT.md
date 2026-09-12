# Slipstream: build plan

The pitch (problem, target user, differentiation, value, feasibility, model choices) lives in `README.md` because the judges read that. This file is the plan we build from: surfaces, architecture, data model, pipeline, setup, timeline. Rules are in `CLAUDE.md`; ownership is in `BOARD.md`.

The name is the drafting effect: sit in the low-pressure wake and go faster on less effort.

## State of play, 12 September

- Jeremy's frontend prototype is live at the repo root: Next.js 16 and React 19, a unified conversation feed for calls and email, conversation detail with CRM auto-entry and an editable follow-up draft, an aggregate analysis and ICP page, and an Origami-ready lead handoff. Frontend only, on realistic mock data. Build, lint and smoke test pass.
- Fixtures are merged: twelve labelled history calls plus the voiced demo call, a validator and tests (see `fixtures/README.md`). The independently accessible UI is deployed from GitHub-connected `main` at https://slipstream-hackathon.vercel.app.
- Jeremy's agent shipped the database migration, reviewed FastAPI foundation, call and email ingestion, evidence-backed CRM extraction, grounded follow-up drafting, CRM writeback, the realtime coaching backend, and the judged pitch and live demo scripts. Email threads are provider/mailbox scoped, atomically populate the CRM, preserve curated fields, and create safe versioned reply drafts. Jeremy's agent also integrated and hardened Anna's scorecard lane: bounded non-blocking judge calls, transcript-grounded evidence, won-versus-not-won playbooks, canonical-source and revision-safe conversation persistence, and honest per-attempt eval accounting. The API is live at https://slipstream-api.3-104-149-193.sslip.io and both credential-free ingest-to-approved-draft loops have been exercised in production. Other people should take the unclaimed UI wiring, coach overlay, and video rows on `BOARD.md`; Anna owns ICP/leads/outreach.
- Still missing: hosted Supabase, service keys, coach overlay, and UI wiring. Every key except Vercel remains unavailable, so each backend lane keeps a deterministic fixture path.
- Jeremy's agent merged Max's Clay-style UI and the review-clean live conversation pipeline, then deployed it at https://slipstream-hackathon.vercel.app. The production browser now reaches the VPS for fixture ingest, evidence-backed CRM extraction, grounded draft creation and audited simulated approval; the scorecard is explicitly labelled fixture data until a model key is installed. Other people should record and upload the 3-to-5-minute video; its public URL is the only deterministic submission check that cannot be completed by the agent.
- Jeremy's agent fixed the VPS CORS allow-list for the real Vercel origin and added an explicit live conversation pipeline to Max's UI snapshot: fixture ingest, evidence-backed CRM extraction, grounded draft creation and approval now call the deployed API, while clearly-labelled fixture data remains the fallback. Other people should not replace `lib/api/slipstream.ts` or the conversation-detail pipeline state while this branch is in progress.
- Jeremy's agent completed `feat/web-wire-analysis`: the Intelligence surface validates and loads a stored live ICP and Origami brief when available, while every retained aggregate and unmatched evidence link stays explicitly labelled as the 12-call evaluation. Loading, API failure, missing-model, zero-call and changing-input states preserve that provenance. Other people should take the unclaimed coach overlay or video work and avoid weakening the live-versus-evaluation labels.
- Jeremy's agent completed `feat/web-wire-leads`: the UI now validates and loads stored leads, launches and polls bounded Origami jobs, preserves unknown scores, verifies ICP provenance, drafts outreach through the backend, and binds approval to the exact reviewed draft. Evaluation approvals stay local and delivery is explicitly simulated. The API serializes redraft/approval per lead and rejects stale draft IDs with 409; its concurrency test passed ten repeated runs. Other people should take the coach overlay or record the submission video.
- Jeremy's agent is now working on `feat/coach-shell`: a GPL-preserving Electron overlay adapted from Cheating Daddy for transparent, legitimate sales coaching, with Gemini removed and the existing Slipstream Scribe/WebSocket protocol as its only AI path. Other people should record the submission video and avoid editing `coach/` until this lane merges.
- Live state checked by Anna on 12 September, 21:00 AEST: the initial Supabase migration is applied (CRM, ICP and lead tables present) while the email ingestion and scorecard persistence migrations are not (see the `schema` row on `BOARD.md`), and the VPS API at revision 6b79e6c still reports storage `memory` and every integration flag false, so nothing live uses the database or a model key yet. The `ORIGAMI_API_KEY` line in the shared `.env` is a placeholder comment, not a key; leads stays blocked until a real key lands. The team's working keys are OpenRouter, Supabase and ElevenLabs; the API falls back to OpenRouter for reasoning and embeddings when the native OpenAI or Anthropic key is absent, and the ICP derive has been run end to end on that key alone. Two coach tests in `api/tests/test_coach.py` fail whenever `OPENAI_API_KEY` is present in the shell, on main as well as on branches, because the coach test setup does not clear provider environment variables the way `api/tests/conftest.py` does.
- The mock data in the prototype is the target shape for the API. Whoever claims a wiring row replaces the mock arrays with Supabase reads and API calls without changing the information architecture unless the chat agrees.

## The demo loop

The backend steps below are executable; the current production UI still presents its
prototype data until the unclaimed UI-wiring rows on `BOARD.md` are completed. The
video must only claim a step is live after it has been exercised on the deployed UI.

1. **A sales call happens.** One demo call, synthesised with ElevenLabs text-to-dialogue and played through speakers. Twelve further scripted calls (won, stalled, lost, no-show) are seeded as text-only CRM history so the analysis and ICP steps have something real to work from.
2. **The coach listens.** The Electron overlay streams audio to the API WebSocket; Scribe realtime transcribes; Claude returns the next questions to ask, grounded in the deal's CRM history.
3. **The call writes itself into the CRM.** Scribe batch transcribes with diarisation; Claude extracts contact, company, deal stage, promises, objections and next step into our CRM tables, shown to the rep for approval.
4. **The follow-up drafts itself.** A draft email attaches to the deal. Approve is one click, marks it sent, logs an activity. Nothing is delivered.
5. **The team learns.** Scorecard per call against a written rubric; aggregate lens on what correlates with won deals; ICP derived from won-deal embeddings.
6. **The ICP finds the next customer.** The ICP becomes an Origami brief; leads return, are scored against the won-deal profile, and each gets a one-click outreach draft.

## Surfaces

### Conversations (`app/`)

The unified feed of calls and emails from the prototype. A call opens to the diarised transcript, participants, the deal, the outcome, the extracted CRM fields awaiting approval, the scorecard and the follow-up draft. The provider-neutral email backend now ingests inbound and outbound threads and drafts grounded replies; another person should wire the existing email UI to those endpoints.

### Analysis (`app/analysis`)

- **Sales training lens.** Per-call scorecards and the aggregate: which behaviours correlate with won deals and which with stalls.
- **ICP discovery.** The profile of the buyer who actually converts (industry, size, role, trigger), derived from won deals, with the evidence behind each attribute.
- **Outreach on that ICP.** The derived ICP as an editable Origami brief, the leads it returned, their similarity score, and the outreach draft per lead.

### Leads (`app/leads`)

Company, person, title, email, LinkedIn where Origami returns it, Origami relevance score, our similarity score against won deals, status. Each row has an outreach draft and an approve button.

### Coach (`coach/`)

Translucent always-on-top window with click-through mode and keyboard shortcuts to move it. Forked from Cheating Daddy (GPL-3.0): we keep the shell (window, shortcuts, macOS system-audio capture via SystemAudioDump) and replace the brain. Audio goes to the API WebSocket, which runs Scribe realtime and calls Claude on a rolling transcript window with the deal context prepended. Output is two or three short suggested questions, refreshed every few seconds, plus a flag when a promise or next step is spoken so the rep sees it was captured.

## Architecture

```
app/          Next.js UI on Vercel. Reads Supabase directly for lists and detail; calls the API for actions.
api/          FastAPI, Python 3.12, uv. Owns the AI pipeline. REST plus one WebSocket at /ws/coach. Deploys to Jeremy's VPS behind HTTPS.
coach/        Electron overlay. Talks only to the API WebSocket.
fixtures/     Thirteen call scripts with expected extraction and scorecard labels; audio for the demo call only. Loaded through the real ingest path.
supabase/     Migrations (pgvector enabled) and seed.
```

**Boundaries.** Supabase Postgres is the single store. The API writes; the UI reads. No second database, no queue, no Redis. Long jobs (transcription, Origami polling) run as FastAPI background tasks that write status rows the UI polls.

**Data flow for one call.** Audio file in, Scribe batch (diarised), transcript row, Claude extraction (structured output, pinned schema), contact, company, deal, note and task rows, Claude scorecard against the rubric, embedding of the call summary stored on the deal, follow-up draft row. Aggregations and ICP derivation read the deal embeddings.

**Coach flow.** Overlay captures audio, streams PCM over the WebSocket. API forwards to Scribe realtime, keeps a rolling transcript, and every few seconds asks Claude for the next questions with the deal's contacts, notes, open tasks and past calls prepended. Suggestions stream back as JSON messages. When the call ends the overlay posts the recording to the ingest route so the batch pipeline produces the record.

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

## AI pipeline

The reasoning model is not fixed: `REASONING_MODEL` selects it, and one `structured()` helper in `api/app/core/llm.py` routes to Anthropic, OpenAI or OpenRouter (open-weight models) by model name. When the model's native key is absent and `OPENROUTER_API_KEY` is set, the same model is routed through OpenRouter under its vendor-prefixed id (`gpt-5.4` becomes `openai/gpt-5.4`), so one OpenRouter key runs the whole reasoning and embedding path. The bake-off in `docs/model-bakeoff.md` picks the production default; until then the default is `gpt-5.4`. Embeddings are OpenAI `text-embedding-3-small` (1536 dimensions, matching the schema), called directly with `OPENAI_API_KEY` or through OpenRouter as `openai/text-embedding-3-small`; the stored `embedding_model` value is the same either way. Implementation notes:

- **Extraction** uses a pinned JSON schema in `api/app/schemas/`. Every field has a confidence and a transcript span so the approval UI can show where a value came from.
- **Scorecard** rubric lives in `api/evals/rubric.md`: discovery questions asked, next step secured, objection handled, talk ratio. LLM-as-judge returns a score and a quoted span per dimension.
- **Eval** in `api/evals/`: twelve history calls hand-labelled for the four dimensions and the extraction fields, one script that reports agreement. This is the artefact for the "Use of Data / Models" criterion.
- **ICP derivation**: embed won-deal summaries, cluster, have Claude name the profile and cite the deals behind each attribute, then render the Origami brief from the profile. Lead scoring is cosine similarity to the won-deal centroid plus Origami's own relevance score.
- **Coach** prompt gets the deal context and the last 60 seconds of transcript; returns at most three questions and any detected commitment.
- **Prompts** are versioned files in `api/app/prompts/`. Transcript text is data; instructions inside a transcript or an Origami row are never followed.
- **History for the ICP** is loaded from the fixture labels (`POST /icp/history/load`) and tagged `metadata.source = "fixtures"`; derivation reads only those deals, so the demo ICP always matches the calls the judges watched. First live derivation (12 Sep, GPT-5.4, memory mode): professional services and allied health, 37 to 76 staff, insurance and incident triggers, small retail as a disqualifier.

## External services and setup

None of these accounts exist yet. All go on personal accounts, not company billing.

| Service | Needed for | Action |
|---|---|---|
| Supabase | The database, pgvector | Create project, enable `vector` extension, run migrations |
| Anthropic API | All reasoning | Key with enough credit for the weekend |
| ElevenLabs | Text-to-dialogue, Scribe batch, Scribe realtime | Check the plan covers realtime concurrency |
| Origami | Lead discovery | Paid plan, key from Settings, Developers. Start every search at `count: 10` and use fetch-more; credits are spent per row |
| Vercel | UI hosting | Connect the repo, set env vars |
| Jeremy's VPS | API hosting | Deploy script under `api/`, Caddy or nginx with a certificate in front of uvicorn, env vars from `.env.example` |

**Origami v3 essentials.** Base URL `https://origami.chat/api/v3`, header `Authorization: Bearer og_live_...`. `POST /leads/searches` with `{ "brief": "...", "count": 10 }` returns a Job. Poll `GET /jobs/{job_id}` honouring `next_poll_at`. `succeeded` gives `result.list_id` and `result.row_ids`. Read with `GET /leads/lists/{list_id}/rows?ids=...` (max 100), or `format=csv` for the full list. `POST /leads/lists/{list_id}/fetch` takes the same brief plus `quality: fast | accurate`. Per-field cell shape on a row still needs confirming against the OpenAPI spec (`https://raw.githubusercontent.com/Origami-Agents/mintlify-docs/main/openapi-v3.yaml`).

**ElevenLabs essentials.** Text-to-dialogue: `POST /v1/text-to-dialogue`, `inputs: [{ text, voice_id }]`, model `eleven_v3`, keep each request under 2,000 characters, up to 10 voices. Batch STT: `POST /v1/speech-to-text`, `model_id: scribe_v2`, `diarize: true`, response has `words[]` with `speaker_id`, `start`, `end`. Realtime: Scribe v2 Realtime over WebSocket, see the client-side streaming guide in the ElevenLabs docs.

## Out of scope this weekend

- Phone system or dialler integration (Twilio, Aircall). Audio arrives as a file or through the coach.
- Writing to a real HubSpot. The object mapping above is the path.
- Sending email. Approve marks a draft sent and logs it.
- Auth, multi-tenancy, billing.
- A live Gmail or Outlook OAuth connector. The provider-neutral webhook contract and full email pipeline are implemented.
- A trained call-scoring model.

## Timeline

- **Saturday 12 September:** foundation rows claimed and pushed (schema, fixtures, API skeleton), each lane has a walking skeleton by tonight, Vercel and VPS deploys exist even if thin.
- **Sunday 13 September:** lanes converge on the demo loop on the live URLs, eval run, `docs/pitch.md` and `docs/demo-script.md` written, video recorded (a person walks and talks, cut to a screen walkthrough per feature).
- **Monday 14 September, before 12:00pm:** final deploy, README lines filled (`Production URL`, `Demo video`, `Track`), `npm run evals:dry` green, submission with track named.

## Open questions

- Which embedding model, chosen by whoever claims the `icp` row.
- Does Cheating Daddy's macOS system-audio capture work on current macOS? If not, the coach uses microphone input and the demo plays the mock call through speakers.
- Exact per-field shape of an Origami row (check the OpenAPI spec).
- Whether email as a channel gets wired this weekend or stays mocked.
