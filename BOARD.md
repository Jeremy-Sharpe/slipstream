# Board

Claim a feature by writing your name and branch on its row and pushing that change to `main` before writing code. Rules in `CLAUDE.md`. Status is one of `unclaimed`, `in progress`, `blocked`, `done`.

Order matters. The foundation rows unblock everything else and should be claimed first.

## Foundation (blocks everyone)

| Slug | Feature | Folders | Owner | Branch | Status | Notes |
|---|---|---|---|---|---|---|
| `web-skeleton` | Next.js app, layout, the three surfaces as routes, mock data | `app/` | Jeremy | main | done | Prototype at repo root, mock data. Deploy to Vercel still to do |
| `schema` | Supabase project, pgvector, migrations for the tables in PROJECT.md, seed script | `supabase/` | Jeremy's agent | feat/schema | in progress | Blocks every lane |
| `fixtures` | 8 to 12 synthesised sales calls via ElevenLabs text-to-dialogue: scripts, audio, expected outcomes. Varied: won, stalled, lost, no-show | `fixtures/` | | | unclaimed | Every surface is judged against these |
| `api-skeleton` | FastAPI app, settings, Supabase client, health route, CORS for the web origin, VPS deploy | `api/` | | | unclaimed | Deploys to Jeremy's VPS behind HTTPS, not Render |
| `web-deploy` | Vercel project for the UI, env vars, production URL in README | Vercel, `README.md` | | | unclaimed | |
| `web-split` | Move analysis and leads markup out of `app/page.tsx` into `app/analysis` and `app/leads`, nav into `components/shell/`, then break the conversations surface into components and data modules | `app/page.tsx`, `app/conversations/`, `components/`, `lib/` | | | unclaimed | Hour one unblocks Max's UI lane; see `docs/start-here.md` for the folder split |

## Lanes

| Slug | Feature | Folders | Owner | Branch | Status | Notes |
|---|---|---|---|---|---|---|
| `ingest` | Upload or pick a fixture call, Scribe batch transcription with diarisation, transcript stored | `api/app/routers/calls.py`, `api/app/services/transcribe.py` | | | unclaimed | |
| `extract` | Claude structured extraction to contacts, companies, deals, notes, tasks, activities, with confidence and transcript spans | `api/app/services/extract.py`, `api/app/prompts/extract-*.md`, `api/app/schemas/` | | | unclaimed | Depends on `ingest` |
| `draft` | Follow-up email draft per call, approve marks sent and logs an activity | `api/app/services/draft.py`, `api/app/routers/drafts.py` | | | unclaimed | Depends on `extract` |
| `scorecard` | Rubric document, LLM-as-judge scorecard per call, ten-call labelled eval and script | `api/app/services/score.py`, `api/evals/` | | | unclaimed | |
| `icp` | Embed won-deal summaries, derive the ICP with evidence, generate the Origami brief | `api/app/services/icp.py` | | | unclaimed | Picks the embedding model |
| `leads` | Origami search from the brief, job polling, rows to `leads`, similarity scoring against won deals | `api/app/services/origami.py`, `api/app/routers/leads.py` | Anna | | in progress | Start at `count: 10` |
| `outreach` | Outreach draft per lead, approve | `api/app/services/outreach.py` | Anna | | in progress | Depends on `leads` |
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
| | | |
