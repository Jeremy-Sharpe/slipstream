# Slipstream

Hackathon entry for Forward: AI in Business (DSCubed and RAID, sponsored by ElevenLabs and Eleno). Product scope, surfaces and open questions live in `PROJECT.md`. The full judging rubric, submission requirements, timeline and track definitions live in `docs/hackathon.md`. Read both before building anything.

**Submission deadline: 12:00PM Monday 14 September 2026.** Finalists announced 4:00PM, live pitch 5:30PM the same day.

## What we are judged on

Preliminary round is 80 points, scored only from three artefacts: the public repo, the production URL, and a 3 to 5 minute demo video. Finals add 20 points for a live pitch.

| Area | Points | Where it is won or lost |
|---|---|---|
| Functionality & Execution | 10 | Live deployed app, works end-to-end, no faked or hardcoded steps, handles edge cases |
| Technical Difficulty | 8 | Multi-step reasoning, embeddings, model chaining, custom evals. A single-prompt wrapper caps at 4 |
| Code Quality & Architecture | 6 | Organised repo, README, separation of concerns, justified framework choices |
| Use of Data / Models | 6 | Deliberate model choice with reasoning, plus some evaluation of output quality |
| Originality of Idea | 10 | Known problem reframed from a genuinely new angle |
| Creativity in Solution Design | 8 | AI feels genuinely useful, not bolted on |
| Differentiation | 7 | Name the alternatives and say specifically why ours is better |
| Problem Significance | 8 | Named target user segment with evidence of their pain |
| Feasibility & Viability | 8 | Realistic path to production: cost, data access, adoption |
| Impact & Value Proposition | 9 | Specific, semi-quantified value (time saved, cost reduced) |

Business and innovation together are 50 of 80 points. A polished product with a sharp, quantified pitch beats a clever build with a vague audience.

## Build rules derived from the rubric

1. **Every feature must work on the production URL.** Localhost demos are explicitly scored lower. Nothing is done until it is deployed and verified live.
2. **Mock the integration boundary, never the feature.** The CRM and phone system are mocked by design (see PROJECT.md). The flow the user sees must be real end-to-end over the fixture data: real transcript in, real drafted email out, real analysis computed. No "if demo mode, show canned result" paths. No steps that only succeed on one specific click path.
3. **Be upfront about limitations.** The 7 to 8 band rewards known limitations stated plainly. Record them in the README rather than hiding them.
4. **No visible bugs in the demo path.** Every surface needs loading, empty and error states. Test the exact flow the demo video will follow.
5. **Make the AI parts real engineering, not a single prompt.** Transcript to draft, call scoring and ICP derivation should use structured multi-step pipelines, structured outputs, and embeddings or similarity search where they fit (for example "find twenty more like the last three that closed"). Be able to say why each architecture choice was made.
6. **Justify the model choice and evaluate it.** For each model call, record in the README why that model (size, cost, latency versus accuracy) and run at least an informal spot check of outputs against the fixtures. Keep the eval notes in the repo.
7. **Keep the repo judge-readable.** Clear module boundaries, no monolith files, a README covering what it does, architecture, how to run it, model choices, known limitations, and the track we entered. Comments only where the code is not self-explanatory.
8. **The fixtures are a first-class deliverable.** Synthesised calls must vary in outcome (won, stalled, lost, no-show) and be good enough that every downstream feature looks convincing on them.
9. **Build the demo path deliberately.** The UI should surface the most differentiating feature (analysis that turns calls into an ICP and outreach) within the first minute of a walkthrough, not bury it behind setup.
10. **Write the pitch content into the product and README as you go.** Target user segment, their pain, named alternatives (call recorders, CRM AI add-ons, sales coaching tools) and why Slipstream is different, feasibility (cost per call, CRM integration path, data access), and a rough value estimate (minutes saved per call times calls per rep per week). Judges only see the three artefacts; anything not in them does not count.

## Judge evals

Every criterion above has a check in `evals/`, described in `docs/judging-evals.md`. `npm run evals:dry` runs the deterministic submission checks in seconds; `npm run evals` runs the LLM judge on all 13 criteria through your Claude Code login. Before claiming a criterion is met, run its scenario and quote the score. A fail lists the gaps that lift the score: fix those, never the rubric or the target.

## Submission checklist

- Public GitHub repo, README complete per rule 7.
- Production URL live and smoke-tested on the demo path.
- 3 to 5 minute video showing the app working end-to-end on the live URL, not slides.
- Submission description states the track.

## Track

Assumption: Track 1 (Improve an Existing Business Capability). Slipstream makes an existing sales workflow (call, follow-up, CRM update, targeting) faster and better, and the track's own examples include "a sales assistant that researches and qualifies leads". Decision open: also enter the ElevenLabs special track. That only pays off if ElevenLabs is core functionality, not just the fixture generator; see `docs/hackathon.md`.
