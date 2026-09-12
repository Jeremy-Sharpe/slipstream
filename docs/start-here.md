# Start here: who does what

Four people, about 44 hours from Saturday afternoon to the Monday 12:00PM submission. Anna and Jeremy write the backend and infrastructure; Romain and Max own the UI and the judge-facing writing, with their Claude doing the code. That split matches the marks: 50 of the 80 preliminary points and all 20 finals points are business, pitch and communication. Nobody is waiting on anyone else to start. Every person has a first task they can begin the minute they read this.

How ownership works: `BOARD.md` is the claim table. Before you start a row, write your name on it and push that one-line change to `main`. The rules are in `CLAUDE.md`. Each section below ends with a block to paste into your own Claude Code session so it knows its lane.

## Setup for everyone (15 minutes)

1. Install Claude Code if you have not: https://docs.claude.com/en/docs/claude-code and sign in with your Claude account.
2. Get the repo: `git clone https://github.com/Jeremy-Sharpe/slipstream.git` then `cd slipstream`. Ask Anna or Jeremy for write access if your push is refused.
3. Run `claude` inside the folder and paste your block from below. It reads `CLAUDE.md`, `BOARD.md`, `PROJECT.md` and `docs/hackathon.md` for you.
4. Keys never go in chat with Claude and never in git. Whoever creates an account puts the key in the group chat once; everyone copies it into their local `.env`.

## The cut line

The minimum loop that scores is: fixture call in, transcript, extracted CRM fields with approval, follow-up draft, scorecard, ICP, leads, all on the live URL. The Electron coach and the live email channel are stretch goals decided Sunday afternoon, only if the loop already runs end to end. Do not start them before then.

## Where things run

- UI: Vercel, deployed from `main`. Anna owns it.
- API: Jeremy's VPS, deployed from `main` by a script in `api/`. Jeremy owns it. This replaces the Render plan in `PROJECT.md`.
- Database: Supabase, hosted. Anna owns the project; migrations live in `supabase/`.

## Anna: schema, deploys, fixtures, then ICP to leads

Rows: `schema`, `web-deploy`, `fixtures`, then `icp`, `leads`, `outreach`.

Accounts to create today, on personal billing: Supabase (enable the `vector` extension), Anthropic API key, Vercel (connect the repo), ElevenLabs, Origami (paid plan, key from Settings then Developers). Share the keys in the group chat.

Saturday: schema and seed merged first, because every other lane reads them. Vercel connected and the production URL on the README `Production URL:` line. Then fixtures: 8 to 12 two-speaker sales call scripts in `fixtures/`, one target customer segment (agree it with Max, it has to match the README), outcomes spread across won, stalled, lost and no-show, the good calls showing discovery questions, a secured next step and a handled objection, the bad ones missing them, each with an expected-outcome file. Generate the audio with ElevenLabs text-to-dialogue. Sunday: ICP derivation from won-deal embeddings, the Origami brief and leads flow, outreach drafts. Every Origami search starts at `count: 10`; credits are spent per row, so no searches until the ICP is real. Run `npm run evals -- --scenario T4` and `I2` on Sunday night and fix the gaps.

Paste into Claude:

```
Read CLAUDE.md, BOARD.md, PROJECT.md and docs/start-here.md. I am Anna. My rows are schema, web-deploy, fixtures, then icp, leads and outreach, in that order. Claim each row on BOARD.md before starting it. Work only in the folders the row lists. Every row is done when it runs on the live URL, not localhost. Before I claim a criterion is met, run its judge scenario from evals/ and quote the score.
```

## Jeremy: the API on the VPS and the call pipeline

Rows: `api-skeleton`, then `ingest`, `extract`, `draft`, `scorecard`.

Infrastructure: the API runs on your VPS. Add a deploy script under `api/` that pulls `main`, installs with `uv`, and restarts the service, and post the public API URL in the chat so Anna can set `NEXT_PUBLIC_API_BASE_URL` on Vercel and `WEB_ORIGIN` on the API. HTTPS matters: the browser will refuse a plain-HTTP API from a Vercel page, so put Caddy or nginx with a certificate in front of uvicorn.

Saturday: FastAPI skeleton with settings, Supabase client, health route and CORS, running on the VPS behind HTTPS, merged. Then ingest: a fixture call uploaded or picked, Scribe batch transcription with diarisation, transcript stored. Sunday: extract (Claude structured output with a pinned schema, confidence and transcript span per field), draft (follow-up email per call, approve marks it sent and logs an activity), scorecard (rubric in `api/evals/rubric.md`, LLM-as-judge per call, the ten-call labelled eval and its script, which is the artefact for the Use of Data criterion). Run `npm run evals -- --scenario T1`, `T2` and `T4` on Sunday night and fix the gaps.

Paste into Claude:

```
Read CLAUDE.md, BOARD.md, PROJECT.md and docs/start-here.md. I am Jeremy. My rows are api-skeleton, then ingest, extract, draft and scorecard, in that order. The API deploys to my VPS from main, not Render; add the deploy script under api/ and put HTTPS in front of uvicorn. Claim each row on BOARD.md before starting it. The schema in supabase/ is Anna's; api/app/schemas is mine but tell the chat before changing a shape the UI reads. Every row is done when it runs on the live API URL.
```

## Frontend: two lanes that never touch the same file

Romain and Max split the UI by surface, not by task, so both run in parallel from hour one with no merge conflicts. Neither writes code by hand; each one's Claude does it and explains what it did.

| | Romain | Max |
|---|---|---|
| Surface | Conversations: the feed, call detail, transcript, extracted fields with approval, scorecard, follow-up draft | Analysis and Leads: scorecard aggregates, ICP with evidence, Origami brief, leads table, outreach drafts |
| Owns | `app/page.tsx`, `app/conversations/`, `components/conversations/`, `components/shell/` (nav, layout), `app/layout.tsx`, `app/globals.css`, `lib/types.ts`, `lib/data/conversations.ts` | `app/analysis/`, `app/leads/`, `components/analysis/`, `components/leads/`, `lib/data/analysis.ts`, `lib/data/leads.ts`, CSS modules inside those folders |
| Writing | `docs/demo-script.md`, `docs/video/` | README pitch sections, `docs/pitch.md` |
| Judge scenarios to run | T1, T3 | B1, B2, B3, I3, F1, F3 |

The one dependency: the current `app/page.tsx` holds every surface in a single file. Romain's first hour moves the analysis and leads markup out verbatim into `app/analysis/page.tsx` and `app/leads/page.tsx`, puts the nav in `components/shell/`, and merges. Max spends that hour on the README, which touches no code. After that merge the folders above are the boundary: Max's Claude never edits `app/globals.css` or anything under `components/shell/`, and Romain's never edits `app/analysis` or `app/leads`. If either needs a change on the other side, ask in the chat. Shared types in `lib/types.ts` mirror Jeremy's `api/app/schemas`; Romain owns the file, Max adds fields by asking.

## Romain: conversations surface, demo script, video

Rows: split `app/page.tsx` (claim it as `web-split` on the board), then `web-wire-conversations`, then `demo-script`, `video`.

The judge scored code quality 2 of 6 because the whole app is one hand-minified file, so the split is real points as well as the foundation for wiring.

Saturday, hour one: move the analysis and leads markup out of `app/page.tsx` verbatim into `app/analysis/page.tsx` and `app/leads/page.tsx`, the nav into `components/shell/`, merge, and tell Max in the chat. Rest of Saturday: break the conversations surface into components under `components/conversations/` with the mock data in `lib/data/conversations.ts` and the shared types in `lib/types.ts`, keeping the screens exactly as they look now. Split `app/globals.css` into readable per-component styles. Run `npm run evals -- --scenario T3` and quote the score in the chat. Sunday: replace the mock conversations with Supabase reads and API calls as Jeremy's rows land (transcript, extracted fields with approval, scorecard, draft), with loading, empty and error states on every screen. Then `docs/demo-script.md`, a step-by-step script against the live app that leads with the ICP-to-leads feature and has a fallback for anything that fails, and the 3 to 5 minute video recorded on the live URL, no slides, once the loop runs.

Paste into Claude:

```
Read CLAUDE.md, BOARD.md, PROJECT.md and docs/start-here.md. I am Romain and I am not a developer; explain anything technical in plain words and do the technical steps for me. Hour one: move the analysis and leads markup out of app/page.tsx verbatim into app/analysis/page.tsx and app/leads/page.tsx, put the nav in components/shell/, merge to main, and tell me so I can message Max. Then split the conversations surface into components/conversations/, lib/data/conversations.ts and lib/types.ts, keeping the screens exactly as they are, and run npm run evals -- --scenario T3. My rows are web-split, web-wire-conversations, demo-script and video; claim each on BOARD.md before starting. I own app/page.tsx, app/conversations, components/conversations, components/shell, app/layout.tsx, app/globals.css, lib/types.ts and lib/data/conversations.ts. Never edit app/analysis, app/leads, components/analysis, components/leads or README.md; those are Max's.
```

## Max: README pitch, analysis and leads surfaces, the pitch

Rows: the README pitch sections, then `web-wire-analysis`, `web-wire-leads`, then `pitch`.

The README sections alone are worth 32 preliminary points: Problem Significance, Feasibility, Impact and Differentiation are all scored from the README.

Saturday, hour one: the README sections the judges read, while Romain carves out your routes. Who exactly the target user is (one segment, named, agreed with Anna so the fixtures match), what the pain costs them today, the alternatives by name (call recorders, conversation intelligence tools, CRM AI add-ons, sales coaching tools) and the specific reason Slipstream is different, a rough value estimate (minutes saved per call times calls per rep per week, follow-ups sent the same day), and the feasibility path (cost per call, first CRM integration, privacy of recordings). Short, specific, no marketing words. Run `npm run evals -- --scenario B1`, `B2`, `B3` and `I3` and fix the gaps each reports. Rest of Saturday, once Romain's split has merged: break `app/analysis` and `app/leads` into components under `components/analysis/` and `components/leads/` with mock data in `lib/data/analysis.ts` and `lib/data/leads.ts`, styles as CSS modules in those folders. Sunday: wire both surfaces to live data as Anna's ICP and leads rows land, with loading, empty and error states, then `docs/pitch.md`, 400 to 700 spoken words, problem, solution, how it works, why it matters, plus a Q&A section with the hard questions and who answers each. Run `npm run evals -- --scenario F1` and `F3` and fix the gaps.

Paste into Claude:

```
Read CLAUDE.md, BOARD.md, PROJECT.md, docs/hackathon.md and docs/start-here.md. I am Max and I am not a developer; explain anything technical in plain words and do the technical steps for me. Hour one: the README pitch sections (problem and target user, alternatives and differentiation, feasibility and value), then run npm run evals -- --scenario B1, B2, B3 and I3 and show me the gaps. Once Romain says app/analysis and app/leads exist on main, pull and break them into components/analysis, components/leads, lib/data/analysis.ts and lib/data/leads.ts with CSS modules in those folders. My rows are web-wire-analysis, web-wire-leads and pitch; claim each on BOARD.md before starting. I own README.md, app/analysis, app/leads, components/analysis, components/leads, lib/data/analysis.ts, lib/data/leads.ts and docs/pitch.md. Never edit app/page.tsx, app/globals.css, components/shell, components/conversations or lib/types.ts; those are Romain's, ask in the chat if I need a change there.
```

## Unassigned until Sunday 1pm

`coach-shell`, `coach-brain` and the live email channel. Whoever is furthest ahead at the Sunday 1pm checkpoint takes the coach if the loop already runs; otherwise it is cut and the ElevenLabs special track rests on Scribe batch and text-to-dialogue. `submission` goes to Max on Monday morning.

## Checkpoints in the group chat

- Saturday 9pm: everyone posts what merged and what is blocked. Anna confirms the Vercel URL is live; Jeremy confirms the API health route answers over HTTPS.
- Sunday 1pm: does the loop run end to end on the live URL? This is the coach and email go or no-go.
- Sunday 8pm: full `npm run evals` run, every failing criterion has an owner.
- Monday 10am: final deploy, video link in the README, `npm run evals:dry` green, form submitted by 11:30 to leave a margin.
