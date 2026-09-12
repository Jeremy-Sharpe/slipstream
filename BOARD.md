# Board

Claim a feature by writing your name and branch on its row and pushing that change to `main` before writing code. Rules in `CLAUDE.md`. Status is one of `unclaimed`, `in progress`, `blocked`, `done`.

Order matters. The foundation rows unblock everything else and should be claimed first.

## Foundation (blocks everyone)

| Slug | Feature | Folders | Owner | Branch | Status | Notes |
|---|---|---|---|---|---|---|
| `web-skeleton` | Next.js app, layout, the three surfaces as routes, mock data | `app/` | Jeremy | main | done | Prototype at repo root, mock data. Deploy to Vercel still to do |
| `schema` | Supabase project, pgvector, migrations for the tables in PROJECT.md, seed script | `supabase/` | Jeremy's agent | feat/schema | done | SQL parser clean; two hostile reviews completed and significant findings fixed |
| `fixtures` | Twelve labelled call scripts as CRM history plus one voiced demo call, expected extraction and scorecard labels, validator, ElevenLabs generator | `fixtures/` | Anna | feat/fixtures | done | Scripts, labels, validator and tests merged; demo audio generated once the ElevenLabs key exists (`generate_audio.py --demo`) |
| `api-skeleton` | FastAPI app, settings, Supabase client, health route, CORS for the web origin, VPS deploy | `api/` | Jeremy's agent | feat/api-skeleton | done | Live at `https://slipstream-api.3-104-149-193.sslip.io`; 18 foundation tests and hostile review passed |
| `web-deploy` | Vercel project for the UI, env vars, production URL in README | Vercel, `README.md` | Anna | main | in progress | Live on Anna's Vercel; auto-deploy waits on Jeremy installing the Vercel GitHub app; env vars added as keys arrive |
| `web-split` | Move analysis and leads markup out of `app/page.tsx` into `app/analysis` and `app/leads`, nav into `components/shell/`, then break the conversations surface into components and data modules | `app/page.tsx`, `app/conversations/`, `components/`, `lib/` | | | unclaimed | Hour one unblocks Max's UI lane; see `docs/start-here.md` for the folder split |

## Lanes

| Slug | Feature | Folders | Owner | Branch | Status | Notes |
|---|---|---|---|---|---|---|
| `ingest` | Upload or pick a fixture call, Scribe batch transcription with diarisation, transcript stored | `api/app/routers/calls.py`, `api/app/services/transcribe.py` | Jeremy's agent | feat/ingest | done | 33 tests pass; hostile final review clean; fixture path works without keys and paid Scribe is guarded and bounded |
| `extract` | Claude structured extraction to contacts, companies, deals, notes, tasks, activities, with confidence and transcript spans | `api/app/services/extract.py`, `api/app/prompts/extract-*.md`, `api/app/schemas/` | Jeremy's agent | feat/extract | in progress | Adding Claude structured output plus labelled deterministic fallback |
| `draft` | Follow-up email draft per call, approve marks sent and logs an activity | `api/app/services/draft.py`, `api/app/routers/drafts.py` | | | unclaimed | Depends on `extract` |
| `scorecard` | Rubric document, LLM-as-judge scorecard per call, ten-call labelled eval and script | `api/app/services/score.py`, `api/evals/` | Anna | feat/scorecard | in progress | Depends only on the fixture labels; separate test file from the icp lane |
| `icp` | Embed won-deal summaries, derive the ICP with evidence, generate the Origami brief | `api/app/services/icp.py`, `api/app/routers/icp.py` | Anna | feat/icp-leads | in progress | Embedding model: OpenAI text-embedding-3-small (1536 dims match the schema, $0.02 per 1M tokens) |
| `leads` | Origami search from the brief, job polling, rows to `leads`, similarity scoring against won deals | `api/app/services/origami.py`, `api/app/routers/leads.py` | Anna | feat/icp-leads | in progress | Start at `count: 10` |
| `outreach` | Outreach draft per lead, approve | `api/app/services/outreach.py` | Anna | feat/icp-leads | in progress | Depends on `leads` |
| `web-wire-conversations` | Replace mock conversations with Supabase reads and API calls: transcript, extracted fields with approval, scorecard, draft | `app/` conversation views, `lib/` | | | unclaimed | Keep the prototype's information architecture |
| `web-wire-analysis` | Replace mock analysis and ICP data with live reads | `app/analysis` | | | unclaimed | |
| `web-wire-leads` | Replace mock leads with live Origami results, similarity score, outreach approve | `app/leads` | | | unclaimed | |
| `coach-shell` | Fork Cheating Daddy into `coach/`, remove Gemini, connect to the API WebSocket, keep overlay and audio capture | `coach/` | | | unclaimed | GPL-3.0 stays, own LICENSE |
| `coach-brain` | WebSocket endpoint: Scribe realtime in, rolling Claude suggestions out with deal context, hand recording to ingest on call end | `api/app/ws/coach.py`, `api/app/prompts/coach-*.md` | | | unclaimed | |
| `pitch` | `docs/pitch.md`: 400 to 700 spoken words plus a Q&A section, scored by evals F1 and F3 | `docs/pitch.md` | | | unclaimed | |
| `demo-script` | `docs/demo-script.md`: step by step against the live app with a fallback, scored by eval F2 | `docs/demo-script.md` | | | unclaimed | |
| `video` | 3 to 5 minute demo video on the live URL, per-feature walkthroughs | `docs/video/` | | | unclaimed | Starts Sunday once the loop runs |
| `submission` | README lines filled, `npm run evals:dry` green, form submitted before Monday 12:00pm | `README.md` | | | unclaimed | |

## Blocked and parked

| Slug | Why | Unblocks when |
|---|---|---|
| `model-bakeoff` | Compare Claude, OpenAI and open-weight models on extraction, scorecard and risk flags over the fixtures; plan in `docs/model-bakeoff.md`. Owner Anna. | The demo loop runs end to end and the prompts in `api/app/prompts/` exist |
| `draft-judge` | Pairwise blind judge for follow-up draft quality, part of the bake-off | After `model-bakeoff` |
