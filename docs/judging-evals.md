# Judging evals

Every criterion the judges score, turned into a check the team can run. An LLM judge scores each rubric line from the same artefacts the real judges get (the repo, bounded server-rendered snapshots of the public Revenue Loop, Conversations, call detail, Intelligence, Leads and Campaigns routes, deployed provider and aggregate-to-lead API evidence, and the written pitch and demo script), and deterministic checks cover the submission requirements. A criterion passes when the judge's score reaches the team's target. The rubric wording is in `docs/hackathon.md`; the judge data is in `evals/criteria.mjs`; the `criteria-doc-sync` check fails if this table, that data and the rubric disagree.

## How to run

The runner is the shared Hourglass evals runner in `hourglass-claude-stack`, driven by your own Claude Code login. No API key and no Codex involved. Each judge run uses Sonnet through the subscription.

```bash
npm run evals:dry            # deterministic checks only, seconds, no model
npm run evals                # everything, 13 judge runs, roughly 10 to 20 minutes
npm run evals -- --scenario T1   # one criterion
```

Set `HG_STACK` if the stack checkout is not at `~/repos/hourglass-claude-stack`. Set `SLIPSTREAM_PROD_URL` to judge a preview deployment instead of the README URL. Reports land in `.hg-evals-reports/<timestamp>/eval-report.md`; each failed criterion lists the judge's evidence and the specific gaps that would lift the score, so read the gaps and fix those.

## LLM-judged criteria

Target is the score the team is building for, not the maximum. It sits at the bottom of the second-highest band or higher, so a pass means the judges would place us in the band we are aiming at. Points and targets in this table are checked against `evals/criteria.mjs`.

| ID | Criterion | Points | Target | Judged from | Passes when the judge finds |
|---|---|---|---|---|---|
| T1 | Functionality & Execution | 10 | 8 | Production URL, production API, codebase | The live URL works end-to-end over its data with no faked, hardcoded or single-path steps; loading, empty and error states exist; known limitations are stated in the README |
| T2 | Technical Difficulty | 8 | 6 | Codebase, README | The AI pipelines use multi-step reasoning, structured outputs, chaining or embeddings, and the README explains why the architecture is shaped that way |
| T3 | Code Quality & Architecture | 6 | 5 | Codebase, README | Clear module boundaries, no monolith files or duplication, README covers what it does, how to run it, architecture and framework choices |
| T4 | Use of Data / Models | 6 | 5 | Codebase, README | Every model choice is justified on size, cost and latency versus accuracy; fixtures vary in outcome; some evaluation of output quality is recorded in the repo |
| I1 | Originality of Idea | 10 | 7 | README, production URL | A known problem approached from a genuinely new angle, not a call recorder or CRM add-on with a twist |
| I2 | Creativity in Solution Design | 8 | 6 | Production URL, codebase | AI is woven into the workflow rather than bolted on as a chat box; distinctive design choices; creative use of the 48-hour constraint |
| I3 | Differentiation | 7 | 6 | README | Named alternatives (call recorders, conversation intelligence, CRM AI features, coaching tools) and a specific, credible reason Slipstream is better |
| B1 | Problem Significance | 8 | 7 | README | A named target user segment, a clearly defined problem and evidence of the pain point |
| B2 | Feasibility & Viability | 8 | 6 | README | Cost per call or user, first CRM and phone integrations, data access and recording privacy, adoption path |
| B3 | Impact & Value Proposition | 9 | 7 | README, production URL | Specific, at least semi-quantified value (time saved per call, follow-ups sent, deals influenced) and who benefits by how much |
| F1 | Clarity of Pitch | 6 | 5 | `docs/pitch.md` | Problem, solution, how it works, why it matters, in 400 to 700 spoken words, no unexplained jargon |
| F2 | Live Demo Quality | 8 | 7 | `docs/demo-script.md`, production URL, production API | Leads with the differentiating feature, every step maps to the live app, proves the pitch's claims, has a fallback |
| F3 | Team Engagement & Q&A | 6 | 5 | Q&A section of `docs/pitch.md` | Hard questions listed with direct, specific, honest answers, spread across team members |

Preliminary criteria T1 to B3 sum to 80 points; finals criteria F1 to F3 sum to 20. Targets sum to 63 of 80 for the preliminary round and 17 of 20 for finals.

## Deterministic submission checks

These run under `--dry` in seconds. They enforce the README conventions the judge scenarios also rely on.

| ID | Check | Passes when |
|---|---|---|
| S1 | Production URL line | README has a line `Production URL: https://...` (or `SLIPSTREAM_PROD_URL` is set) |
| S2 | Hosted deployment responds | That URL returns HTTP 200 and is not localhost |
| S3 | Demo video line | README has a line `Demo video: https://...` |
| S4 | Track named | README has a line `Track: Track 1...` (1, 2 or 3) |
| S5 | README sections | Headings exist for architecture, model choices, known limitations, problem and target user, alternatives and differentiation, feasibility and value |
| S6 | No secrets tracked | No `.env*`, `.pem` or `credentials.json` files are committed |
| S7 | Repository is public | The GitHub API reports the origin repo as public |

## Manual only

Two things no check can score. Put them on the submission-day checklist.

- Watch the demo video once, end to end, against T1: it must show the live app working, 3 to 5 minutes, no slides or narration over static screens.
- Rehearse the live pitch with a timer and one person asking the Q&A list cold. The finals judges score the room, not the script.

## What a fail means

A failed judge criterion is a to-do list, not a verdict. Open the report, read the gaps for that criterion, make the change in the product or README, and re-run that one scenario. Do not tune the rubric or the target to make it pass; the real judges will not.
