# Architecture decision record

Every load-bearing technical decision in Slipstream, with the context it was made in, the alternatives that were considered and the evidence behind it. Entries are numbered in roughly the order they were made and dated to the day they landed on `main`. `docs/architecture.md` is the running record of how the system is shaped; `docs/model-bakeoff.md` holds the measured model evaluations; `docs/judging-evals.md` holds the LLM judge that scores the submission against the hackathon rubric. This file is the index of why.

Format per entry: what was decided, why, what else was on the table, what it costs us, and where a reader can check it.

## D01: Three deployables, one API seam (12 Sep 2026)

**Decision.** A Next.js UI (`app/`), a FastAPI service (`api/`) that owns every AI step and every write, and an Electron coach (`coach/`) that talks only to the API. Browser and desktop never call a model provider directly.

**Why.** The AI half wants Python: the Anthropic, OpenAI and ElevenLabs SDKs, pgvector clients and the eval tooling all live there. The UI half wants a hosted Next.js app. One HTTP and WebSocket seam between them is exactly where a telephony or CRM integration plugs in later.

**Alternatives.** A single Next.js app with route handlers doing the model calls. Rejected because the evaluation harness, grounding passes and embeddings would have been rewritten in TypeScript for no product gain, and the API would then be inseparable from the UI a customer might not want.

**Consequences.** Two deploy targets and a CORS and token boundary to maintain. `lib/types.ts` mirrors `api/app/schemas/`, and both are listed as shared contracts in `CLAUDE.md`.

**Evidence.** `README.md` Architecture; `PROJECT.md` Architecture and Boundaries.

## D02: Mock the integration boundary, never the feature (12 Sep 2026)

**Decision.** The phone system is mocked by design: thirteen synthetic calls in `fixtures/` stand in for a call recorder. The CRM is our own Postgres tables shaped like HubSpot objects (contacts, companies, deals, notes, tasks, activities). Everything between those two boundaries runs for real over the fixture data: real transcription when audio exists, real extraction, real scoring, real embeddings, real drafts.

**Why.** The rubric penalises faked or hardcoded steps and rewards working end to end. A live HubSpot sandbox and a telephony webhook would have consumed the weekend on OAuth and consent flows without changing a single AI step.

**Alternatives.** A HubSpot developer sandbox (time), a canned "demo mode" with precomputed results (explicitly banned in `CLAUDE.md` build rule 2).

**Consequences.** A real HubSpot integration is a field mapping, not a redesign. The no-phone-system limitation is stated in the README rather than hidden.

**Evidence.** `CLAUDE.md` build rules 1 and 2; `supabase/migrations/`; `README.md` Known limitations.

## D03: The labelled fixture corpus is a first-class deliverable (12 Sep 2026, rewritten 13 Sep 2026)

**Decision.** Twelve history calls spanning won, stalled, lost and no-show outcomes, one voiced demo call with five planted risk flags, and seven publicly listed Eleno clients as call-less won deals. Every call carries an `expected.json` with the extraction fields, the scorecard labels and ICP signals. `fixtures/validate.py` enforces the outcome mix, talk-ratio and discovery drift, a forbidden-string check, and that no public-client name appears in any call script or label.

**Why.** Every evaluation in the repo and every demo path runs over the same labelled data, so a model result and a UI screen are describing the same calls. Labels written before the models ran are what make a bake-off honest.

**Alternatives.** Recording real calls (privacy, consent and no labels), or fewer unlabelled scripts (nothing to measure against).

**Consequences.** The 13 September rebrand from a managed IT seller to Eleno replaced five calls and edited the rest, which invalidated the historical bake-off tables for the new cohort; the two production candidates were re-run on the Eleno cohort and the old tables are kept as the dated historical record.

**Evidence.** `fixtures/README.md`; `fixtures/validate.py`; `fixtures/crm/clients.json`; `api/evals/extraction-eval.md` (Eleno cohort section).

## D04: Every model claim carries transcript evidence, and the code verifies it before accepting anything (12 Sep 2026)

**Decision.** Extraction values, scorecard spans, playbook patterns and coaching narratives all come back from the model with a citation (a segment sequence or turn index and a verbatim quote). A deterministic pass checks the quote is a substring of the cited segment. Extraction rejects the whole result if any value lacks evidence; the scorecard derives its counts only from spans that survived; the playbook drops any pattern citing a call not in the input or a quote not in that call's validated evidence.

**Why.** The failure mode the product exists to remove is a CRM full of fluent fiction. Trusting a structured output because it parsed would reproduce that failure with better formatting. Evidence a human can click on is the difference between a suggestion and a fact.

**Alternatives.** Confidence scores from the model (unfalsifiable), or a second model checking the first (more spend, same trust problem).

**Consequences.** A rep can see a null where the model paraphrased, which the README records as a limitation. The grounding pass in `ground()` repairs re-cased and re-punctuated quotes before dropping, and the eval reports repair and drop counts per model, so grounding is measured rather than assumed.

**Evidence.** `api/app/services/extract.py`; `api/app/services/score.py`; the evidence-invariants table in `docs/architecture.md`.

## D05: Deterministic first, model second (12 Sep 2026)

**Decision.** Anything that can be computed is computed, and the model is only asked for what a human would have to read the transcript to judge. Rep talk ratio uses the same word regex and rounding as the fixture validator. Revenue DNA freshness is a SHA-256 fingerprint, not a model opinion. Campaign delivery, CRM sync and the pricing-marker regex that ends the discovery window are all code.

**Why.** Deterministic values agree with the labels by construction, cost nothing, and give the judge fewer places to be wrong. The 13 September AI-usage audit listed what stays deterministic by design so nobody "adds AI" to a step that does not need it.

**Alternatives.** Asking the judge for the talk ratio alongside everything else. Rejected: it would have been a measured, avoidable error source.

**Evidence.** `api/app/services/score.py`; `docs/architecture.md` change log, 13 Sep 2026 (`feat/model-coverage`).

## D06: The scorecard rubric is a versioned document (12 Sep 2026)

**Decision.** `api/evals/rubric.md` defines discovery questions, next step secured, objection handling and talk ratio in prose. `RUBRIC_VERSION` in `score.py` is embedded into the judge prompt and stamped on every stored scorecard.

**Why.** A rubric in a prompt string cannot be reviewed by a sales lead, and a scorecard without a rubric version cannot be compared across time. The bake-off also showed that objection handling was the weakest dimension for every model, which is a rubric finding as much as a model finding; a versioned document is what makes a rubric revision a measurable change.

**Consequences.** Rubric v2 with worked examples per objection label is the recorded next accuracy gain, ahead of swapping models.

**Evidence.** `api/evals/rubric.md`; `api/evals/README.md` results discussion.

## D07: One provider-agnostic structured-output helper, and a separate setting for the judge (12 Sep 2026)

**Decision.** `api/app/core/llm.py` exposes one `structured()` call that routes by model id: `claude-*` to Anthropic, `gpt-*` and `o*` to OpenAI, anything vendor-prefixed to OpenRouter, and a loopback-only local runtime when configured. `REASONING_MODEL` selects the model for extraction, ICP naming, drafts and outreach; `SCORECARD_JUDGE_MODEL` selects the judge on its own.

**Why.** The judge is the step we measure most, so it must be swappable without touching the rest. Routing by id means the bake-off and production use the same code path, and OpenRouter gives one key and one HTTP shape across every vendor including open-weight models.

**Alternatives.** Hard-coding one vendor SDK per step. Rejected because the bake-off would then have tested a different client than production runs.

**Consequences.** Two OpenRouter code paths exist (the shared client and the httpx judge in `score.py` that also records usage, latency and retries); consolidating them is a recorded follow-up.

**Evidence.** `api/app/core/llm.py`; `api/app/core/config.py`; `docs/architecture.md` Model strategy.

## D08: Strict structured outputs everywhere (12 Sep 2026)

**Decision.** Every model call returns a Pydantic schema. Anthropic direct uses `messages.parse`; OpenRouter uses `response_format: json_schema` in strict mode with a normaliser that sets `additionalProperties: false` and marks every property required, recursively. The judge sends `provider.require_parameters: true` so a request only reaches endpoints that honour structured output. Fenced JSON is stripped and one retry asks for the bare object before a parse failure is recorded.

**Why.** Free-text parsing is where hackathon demos break. Strict schemas turned model misbehaviour into a countable parse-failure column in the bake-off instead of a runtime surprise.

**Findings that shaped it.** With `require_parameters` on, sending `temperature` excluded GPT-5.4 endpoints, so the judge sends none. Qwen 3.6 27B and Kimi K2.6 failed strict validation on nine of twelve calls, which excluded them from selection rather than crashing the product. Claude Haiku's five extraction parse failures were a schema artefact (omitted evidence sequence numbers); the raw schema now accepts that shape long enough for grounding to locate the quote. A production 502 on 14 September traced to DeepSeek returning an evidence item with an empty quote; blank items are now dropped before validation.

**Evidence.** `api/app/core/llm.py`; `api/app/services/score.py`; `docs/architecture.md` change log, 14 Sep 2026.

## D09: Models are chosen by a predeclared decision rule over a measured bake-off (12 Sep 2026, reruns 13 Sep 2026)

**Decision.** For each model-backed step, run the production prompt and schema over the labelled fixtures for every candidate, grade programmatically against the labels, and apply a rule written down before the run: pick the cheapest model whose agreement is within one call of the best on every judged dimension. When the rule is silent, the secondary criteria (mean judged pass rate, then cost) are stated and applied, and the failed gates are recorded rather than lowered.

**Why.** "Use of Data / Models" is scored on deliberate choice with reasoning plus some evaluation of output quality. Choosing by reputation gives neither. A rule stated first cannot be fudged after seeing which model a teammate likes.

**Outcomes.** Scorecard judge: DeepSeek V3.2, within one call of the best on every dimension and about 25 times cheaper than the accuracy runner-up GPT-5.4. Extraction: Mistral Medium 3.1 on the historical cohort by the rule, kept on the Eleno cohort on mean pass rate and cost after the rule went silent, with deal amount recorded as its known weakness. Coach card completion: `openai/gpt-5.4` on a ten-case spot check, explicitly labelled a spot check and not a benchmark. The three Claude models were evaluated for both judge and extractor and did not win either on this data at this cost; the reasons are recorded per model.

**Evidence.** `docs/model-bakeoff.md`; `api/evals/README.md`; `api/evals/extraction-eval.md`; `api/evals/coach-eval.md`.

## D10: Cost is accounted from the provider ledger, and unknown is never zero (12 Sep 2026, verified 13 Sep 2026)

**Decision.** Cost per attempt comes from OpenRouter's `usage.cost` when present, falling back to a dated price snapshot in `api/evals/openrouter-prices.json`. A model with any unpriced attempt is excluded from the cheapest-model decision rather than treated as free. Direct-provider runs that did not report cost are marked `not billed`, meaning not measured, not free.

**Why.** The first harness wrote zero cost and latency for failed parse attempts, which made the first total a lower bound. The 13 September rerun reconciled the key's daily usage against the summed per-request values and attributed the difference to rejected outputs the provider bills but the runner records as null.

**Evidence.** `api/evals/README.md` Results; `api/evals/extraction-eval.md` "Cost is ledger-verified".

## D11: Revenue DNA turns model freshness into a spending gate (12 Sep 2026)

**Decision.** Each stored ICP carries a SHA-256 fingerprint over the bounded CRM facts, interactions and outcomes that produced it. `GET /icp/freshness` recomputes the fingerprint without model spend. Before a paid Origami search is created, the leads service checks freshness and refuses to spend against a stale profile; existing leads scored against an older target version are counted for re-scoring.

**Why.** This is the product's original mechanic. Call tools report on yesterday and lead tools spend against a persona; a dashboard warning that the persona is stale is ignored. A boundary that blocks the next credit is not.

**Alternatives.** A "last updated" timestamp on the profile. Rejected because time is not the trigger, outcomes are.

**Evidence.** `api/app/services/icp.py`; `api/app/services/leads.py`; `README.md` Alternatives and differentiation.

## D12: Approval never claims delivery, and the delivery lifecycle lives in a service (12 Sep 2026; service extraction 13 Sep 2026, Jeremy's agent)

**Decision.** Approving a draft is an audited state that sends nothing. A credential-gated Resend adapter can deliver only the exact approved copy and persist its receipt. The claim, lease, submission, rollback and completion state machine and bounded batch orchestration were extracted from a 1,097-line router into `api/app/services/deliveries.py`; the router validates transport inputs only, and an architectural smoke test fails if lifecycle logic drifts back into HTTP code.

**Why.** Sending email on a hackathon deployment with no credential must be impossible, not merely unconfigured. Campaigns and direct sends sharing one state machine is what makes the pause, resume and reconciliation semantics testable once instead of twice.

**Evidence.** `api/app/services/deliveries.py`; `api/app/services/email_delivery.py`; `docs/email-delivery.md`; `docs/campaign-automation.md`.

## D13: ElevenLabs for both the record and the live coach (12 Sep 2026)

**Decision.** Scribe `scribe_v2` batch with diarisation and word timestamps for uploaded audio; Scribe v2 Realtime over WebSocket for the coach, with the rep's microphone and the call audio as two separate streams; `eleven_v3` text-to-dialogue to voice the demo call.

**Why.** Word timestamps and speaker labels feed talk ratio and who-committed-to-what. Using the same vendor for batch and realtime means the coach and the stored record agree on what was said. Two audio streams is how the coach knows who is speaking without a diarisation guess.

**Consequences.** The coach is macOS-only because call audio capture needs macOS 14.2 or later, and four of the five playable example recordings were voiced with the open-weight Kokoro-82M model because the ElevenLabs key was not on the machine that generated them; both are stated in the README.

**Evidence.** `api/app/services/transcribe.py`; `coach/`; `fixtures/generate_audio.py`; `README.md` Model choices.

## D14: The coach prefers precision over recall, with deterministic guards under the model (13 Sep 2026, Romain)

**Decision.** A suggestion card leaves the rep's screen only when the model can quote the turn that covered it, the speaker role fits and confidence is at least 0.9. Two code guards sit under the prompt: a quoted question is never an answer, and trailing-off speech never completes a card. Both have unit tests. A model result computed before a rep action is discarded; new transcript turns never discard one.

**Why.** A wrong "covered" decision hides a question the rep still needs. The ten-case spot check went from 0.60 to 1.00 precision at 1.00 recall across three runs as the prompt and guards were fixed, and the guards hold regardless of what the model returns.

**Evidence.** `api/app/services/coach_reasoning.py`; `api/tests/test_coach_sessions.py`; `api/evals/coach-eval.md`.

## D15: Prompts are versioned files, and the transcript is untrusted data (12 Sep 2026)

**Decision.** Every prompt lives in `api/app/prompts/` as one file per task with the version in the filename (`extract-v2.md`, `scorecard-v1.md`, `coach-session-v2.md`). Every prompt states that transcript text is data and that instructions inside a transcript or a lead row are never followed.

**Why.** A prompt revision is a diff a reviewer can read, and the eval records which prompt version produced which numbers. Sales calls are adversarial input by nature; a prospect can say anything.

**Evidence.** `api/app/prompts/`; `CLAUDE.md` Prompts.

## D16: A keyless deployment fails visibly, never quietly (12 Sep 2026)

**Decision.** When a provider key is missing, a model action returns 503 or a fallback that is labelled as such (fixture labels for extraction, the template email for drafts), and the UI shows a locked message. `/ready` reports which providers and which persistence layer are live. There is no demo mode that shows a canned result.

**Why.** The rubric scores faked steps in the lowest band, and a labelled fallback is a stated limitation while a silent one is a lie the judges can catch by reading the code.

**Evidence.** `api/app/routers/health.py`; `README.md` Known limitations; `CLAUDE.md` build rule 2.

## D17: Public lead generation is fictional, named as such, and guarded (13 Sep 2026)

**Decision.** With Origami unconfigured, the demo generates exactly ten fictional prospects through OpenRouter with invented company and contact names on `.example` domains, marked Fictional in the UI, with no deliverable contact details. A guard keeps generated names clear of the real Eleno clients, the fixture companies and the retired seller brand. The same derived brief goes to Origami v3 when a customer configures it.

**Why.** Eleno is a real company and a sponsor. Inventing facts about its clients or emailing real people from a hackathon deployment was never acceptable, and the judges must be able to tell a proof from an enrichment.

**Evidence.** `api/app/services/leads.py`; `api/app/prompts/demo-leads-v2.md`; `docs/architecture.md` change log, 13 Sep 2026.

## D18: The ingest token stays server-side behind a same-origin gateway (13 Sep 2026)

**Decision.** Browser calls go through `app/gateway`, which adds `SLIPSTREAM_INGEST_TOKEN` on the server. Pasted transcripts are relayed server-side onto the coach WebSocket. The coach desktop app redeems a single-use handoff for a scoped session token instead of holding the ingest token.

**Why.** A token in the browser bundle is public. The gateway is also the one place a future tenant login attaches.

**Evidence.** `app/gateway/`; `PROJECT.md` Coach flow; `README.md` How it works.

## D19: Supabase pgvector is the durable design; the VPS runs the same repository interface in memory (12 Sep 2026, boundary reported 13 Sep 2026)

**Decision.** Migrations in `supabase/migrations/` define the schema with pgvector, and the API owns all access through a repository interface. The deployed VPS uses an in-memory implementation of that interface because its Supabase credentials and later migrations are not installed; `/ready` reports this boundary and the README lists it as a limitation.

**Why.** Shipping the memory-backed API kept the live URL working end to end while the schema work continued, and the interface means installing the credentials is configuration, not code.

**Consequences.** Data on the hosted API does not survive a restart. The judge eval's own five-point gap names this first.

**Evidence.** `supabase/migrations/`; `api/app/routers/health.py`; `docs/judging-evals.md` Final internal result.

## D20: An LLM judge scores our own submission against the organisers' rubric, and the rubric is never tuned to pass (12 Sep 2026)

**Decision.** Every scored criterion in `docs/hackathon.md` is data in `evals/criteria.mjs`, with a target the team is building for. One scenario per criterion gives Sonnet the repo snapshot, bounded text snapshots of the live routes and API, and the organisers' band wording verbatim, and asks for a score, evidence with file paths and the specific gaps that would lift the score. Deterministic checks cover the submission requirements, and a doc-sync check fails if the human table, the criteria data and the rubric disagree.

**Why.** Judges only see three artefacts. A model reading exactly those artefacts, strictly, is the cheapest honest proxy for a judge, and its gaps list is a to-do list. The rule in `docs/judging-evals.md` is explicit: fix the gaps, never the rubric or the target.

**Result.** Internal run on 13 September 2026: 15 of 15 scenarios passed, 95 of 100 points, with the five-point gap stated rather than hidden. This is an internal evaluation, not an official score.

**Evidence.** `evals/`; `evals/lib/judge.mjs`; `docs/judging-evals.md`.

## D21: Adversarial model review before merge on the risky lanes (12 to 13 Sep 2026)

**Decision.** Most backend rows, including the schema, the API skeleton, ingest, extraction, email delivery, campaign controls and the scheduler worker, went through one or more hostile review rounds by a model that did not write the code before merge, and the board row records the outcome.

**Why.** Shared contracts and anything that could send email or spend credit are the places a weekend bug is expensive. A reviewer that did not build the thing finds what the author's own loop misses.

**Evidence.** `BOARD.md`: search the notes column for "hostile review"; the `schema`, `api-skeleton`, `campaign-controls` and `scheduler-worker` rows are the clearest examples.
