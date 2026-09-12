# Board

Claim a feature by writing your name and branch on its row and pushing that change to `main` before writing code. Rules in `CLAUDE.md`. Status is one of `unclaimed`, `in progress`, `blocked`, `done`.

Order matters. The foundation rows unblock everything else and should be claimed first.

## Foundation (blocks everyone)

| Slug | Feature | Folders | Owner | Branch | Status | Notes |
|---|---|---|---|---|---|---|
| `schema` | Supabase project, pgvector, migrations for the tables in PROJECT.md, seed script | `supabase/` | | | unclaimed | Blocks every lane |
| `fixtures` | 8 to 12 synthesised sales calls via ElevenLabs text-to-dialogue: scripts, audio, expected outcomes. Varied: won, stalled, lost, no-show | `packages/fixtures/` | | | unclaimed | Every surface is judged against these |
| `api-skeleton` | FastAPI app, settings, Supabase client, health route, CORS for the web origin, Render deploy | `apps/api/` | | | unclaimed | |
| `web-skeleton` | Next.js app, Supabase client, layout with the five surfaces as routes, Vercel deploy | `apps/web/` | | | unclaimed | |

## Lanes

| Slug | Feature | Folders | Owner | Branch | Status | Notes |
|---|---|---|---|---|---|---|
| `ingest` | Upload or pick a fixture call, Scribe batch transcription with diarisation, transcript stored | `apps/api/app/routers/calls.py`, `apps/api/app/services/transcribe.py` | | | unclaimed | |
| `extract` | Claude structured extraction to contacts, companies, deals, notes, tasks, activities | `apps/api/app/services/extract.py`, `apps/api/app/prompts/extract-*.md` | | | unclaimed | Depends on `ingest` |
| `draft` | Follow-up email draft per call, approve marks sent and logs an activity | `apps/api/app/services/draft.py`, `apps/web/app/calls/[id]/` | | | unclaimed | Depends on `extract` |
| `scorecard` | Rubric document, LLM-as-judge scorecard per call, ten-call labelled eval and script | `apps/api/app/services/score.py`, `apps/api/evals/` | | | unclaimed | |
| `analysis-ui` | Analysis tab: scorecards, aggregate lens, ICP view with evidence | `apps/web/app/analysis/` | | | unclaimed | |
| `icp` | Embed won-deal summaries, derive the ICP, generate the Origami brief | `apps/api/app/services/icp.py` | | | unclaimed | Picks the embedding model |
| `leads` | Origami search from the brief, job polling, rows to `leads`, similarity scoring against won deals | `apps/api/app/services/origami.py`, `apps/api/app/routers/leads.py` | | | unclaimed | Start at `count: 10` |
| `outreach` | Outreach draft per lead, approve, leads table UI | `apps/api/app/services/outreach.py`, `apps/web/app/leads/` | | | unclaimed | Depends on `leads` |
| `calls-ui` | Calls list and call detail: transcript, extracted fields, scorecard, draft | `apps/web/app/calls/` | | | unclaimed | |
| `coach-shell` | Fork Cheating Daddy into `apps/coach`, remove Gemini, connect to the FastAPI WebSocket, keep overlay and audio capture | `apps/coach/` | | | unclaimed | GPL-3.0 stays |
| `coach-brain` | WebSocket endpoint: Scribe realtime in, rolling Claude suggestions out with deal context | `apps/api/app/ws/coach.py`, `apps/api/app/prompts/coach-*.md` | | | unclaimed | |
| `video` | 3 to 5 minute demo video, Apple keynote style, per-feature walkthroughs | `docs/video/` | | | unclaimed | Starts Sunday once the loop runs |
| `submission` | README current, live URLs, track named, form submitted before Monday 12:00pm | `README.md`, `PROJECT.md` | | | unclaimed | |

## Blocked and parked

| Slug | Why | Unblocks when |
|---|---|---|
| | | |
