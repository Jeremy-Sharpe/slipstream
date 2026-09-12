# Slipstream technical architecture: running record

This is the living record of how Slipstream is built and why. Every lane appends to it when something lands on `main`, and the change log at the bottom is dated. The README carries the short version for judges; this file carries the reasoning, the invariants and the findings behind each choice. Keep it one line per paragraph and never hard-wrap.

## System shape

Three deployables and one store. The Next.js UI (`app/`, Vercel) reads Supabase directly for lists and calls the API for actions. The FastAPI service (`api/`, Jeremy's VPS behind HTTPS) owns every AI step and every write. Supabase Postgres with pgvector is the single store; the CRM tables mirror HubSpot objects so a real integration is a field mapping. The Electron coach (`coach/`) is a stretch goal that talks only to the API WebSocket.

The phone system is mocked by design: the thirteen synthesised calls in `fixtures/` stand in for a call recorder. Everything downstream of the audio is real: real transcription, real extraction, real scoring, real embeddings, real lead search.

## The pipeline for one call

1. **Ingest** (`api/app/routers/calls.py`, `api/app/services/transcribe.py`). Audio goes to ElevenLabs Scribe `scribe_v2` with diarisation and word-level timestamps. The word stream is normalised into ordered transcript segments with a speaker label, `start_ms` and `end_ms`, stored against a conversation row. Fixture calls without audio load their script as segments through the same path, so downstream code never knows which kind it got.
2. **Extraction** (`api/app/services/extract.py`, prompt `extract-v1.md`). Claude Sonnet 5 returns contact, company, deal, promises, objections and next step as a pinned JSON schema. Every value must carry transcript evidence: a segment sequence and a verbatim quote. The service checks each quote is a substring of the named segment and rejects the whole result otherwise, so a hallucinated field cannot reach the CRM. When no Anthropic key is configured the service copies the fixture labels instead; that path is a demo fallback and is flagged as a known limitation because it is not real extraction.
3. **Scorecard** (`api/app/services/score.py`, rubric `api/evals/rubric.md`, prompt `scorecard-v1.md`). See the judge pattern below.
4. **ICP derivation** (`api/app/services/icp.py`, prompt `icp-derive-v1.md`). Each deal gets a summary text embedded with `text-embedding-3-small` (1536 dimensions, matching the pgvector column). The won deals and the contrast deals go to the reasoning model, which names the profile and cites the deal ids behind each attribute. The citations are stored as `icp_source_deals` rows so the UI can show which won deals produced which attribute. Lead similarity is cosine distance to the centroid of the won-deal vectors.
5. **Leads** (`api/app/services/leads.py`, `api/app/services/origami.py`). The profile is rendered as a natural-language brief for Origami's v3 Leads API. A search job is started, polled to a terminal status, and the returned rows are mapped to lead records, embedded with the same model, and scored against the won centroid. Searches start at `count: 10` because Origami bills per row.
6. **Outreach** (`api/app/services/outreach.py`, prompt `outreach-v1.md`). One draft per lead from the profile, the lead's research fields and the seller description; approve marks it sent and logs an activity. Nothing is sent externally this weekend.

## The LLM-as-judge pattern (scorecard)

The scorecard is not one prompt. It is a fixed order of steps designed so the model can only add what a human could check.

- **Deterministic first.** Rep talk ratio is rep words over all words using the same word regex and rounding as the fixture validator, so labels and scores agree by construction. The pricing-marker regex that ends the discovery window is shared too.
- **Rubric as a document.** `api/evals/rubric.md` is versioned (`RUBRIC_VERSION = "v1"`) and embedded into the judge prompt at a placeholder. Changing the rubric changes the version stamped on every scorecard.
- **The judge returns evidence, not verdicts.** Discovery questions come back as a list of quoted spans with 1-based turn indices; next step and objections come back as quoted spans too. The prompt says instructions inside the transcript are data.
- **Evidence is validated, and the verdict is derived from what survived.** A span is kept only if the turn index is in range and the quote is a verbatim substring of that turn. The discovery count is the number of surviving spans. Next step is true only if the judge said so and its quoted span survived. This is the anti-hallucination invariant: a claimed question the transcript does not contain cannot raise the score.
- **Structured output everywhere.** Anthropic direct uses `messages.parse` with a Pydantic schema. OpenRouter uses `response_format: json_schema` in strict mode with a schema normaliser that sets `additionalProperties: false` and lists every property as required, recursively, because strict mode rejects Pydantic's default output. Fenced JSON is stripped, and one retry asks for the bare object before the call is recorded as a parse failure.
- **Scorecards are stored on the conversation row** (`conversations.scorecard` jsonb) with the model and rubric version that produced them.

## The learning loop (playbook)

Anna's design (12 September): score every call, then learn from the won ones. `derive_playbook` computes won-versus-not-won statistics per rubric dimension and a rolling profile per rep, then asks the model to name three to five behaviours that separate the won calls, each citing call ids and verbatim quotes. A pattern is dropped if it cites a call that is not in the input or a quote that does not appear in that call's validated evidence. The output is the analysis surface's "what wins" lens and the seed for coach prompts. No-show calls are excluded from the means.

## Model strategy

The reasoning steps do not assume one vendor. `api/app/core/llm.py` exposes one `structured()` call that routes by model id: `claude-*` goes to Anthropic, `gpt-*` and `o*` go to OpenAI, anything else goes to OpenRouter. `REASONING_MODEL` selects the model for extraction, ICP naming and outreach; the scorecard judge has its own `SCORECARD_JUDGE_MODEL` (default `deepseek/deepseek-v3.2` over OpenRouter, the bake-off pick) because the judge is the step we measure, and it should be swappable without touching the rest.

OpenRouter is the comparison rail: one key, one HTTP shape, every vendor including open-weight models. The judge sends `provider.require_parameters: true` so a request is only routed to endpoints that honour structured output. Cost is accounted per attempt from OpenRouter's `usage.cost` when present, falling back to a dated price snapshot in `api/evals/openrouter-prices.json`; a model with any unpriced attempt is excluded from the cheapest-model decision rather than treated as free.

The bake-off (`api/evals/run_scorecard_eval.py`) runs the judge over the twelve labelled history calls for each model in `DEFAULT_BAKEOFF_MODELS`: Claude Haiku 4.5, Sonnet 5 and Opus 5; GPT-5.4 nano, mini and full; DeepSeek V3.2, Qwen 3.6 27B, Llama 4 Maverick, Kimi K2.6 and Mistral Medium 3.1. Agreement per dimension is compared to the labels, with discovery within one question, and the decision rule is stated before the run so it cannot be fudged afterwards: pick the cheapest model whose agreement is within one call of the best on every judged dimension. Results land in `api/evals/results/` and the README model table quotes them. First run, 12 September: DeepSeek V3.2 picked at $0.0006 per call with GPT-5.4 the accuracy leader; the three Claude models lost on objection handling; Qwen 3.6 27B and Kimi K2.6 failed strict-schema parsing on nine of twelve calls. Objection handling was the weakest dimension for every model, which is a rubric finding as much as a model finding. Full table and reasoning in `api/evals/README.md`.

## Evidence invariants across lanes

| Lane | What the model returns | What the code checks before accepting it |
|---|---|---|
| Extraction | Values with segment sequence and quote | Quote is a verbatim substring of that segment; any value without evidence rejects the result |
| Scorecard | Quoted spans with turn indices | Index in range and quote verbatim in that turn; counts derived from survivors |
| Playbook | Patterns citing call ids and quotes | Call ids exist in the input; quotes appear in that call's validated evidence |
| ICP | Attributes citing deal ids | Deal ids stored as source rows; similarity is computed, not claimed |
| Leads | Origami rows | Relevance is Origami's; our similarity is cosine to the won centroid, computed |

## Evals

- **Fixtures** (`fixtures/`): twelve history calls plus one demo call, each with an `expected.json` carrying the extraction, the scorecard labels, ICP signals and planted risk flags. A validator enforces the outcome mix, talk-ratio and discovery drift, and a forbidden-string check.
- **Scorecard eval**: agreement of the judge against the labels per model, with cost and latency, as above.
- **Judge evals** (`evals/`, `docs/judging-evals.md`): an LLM judge scores the repo, the live URL and the pitch against the hackathon rubric, plus deterministic submission checks.

## Known limitations

- The offline heuristic judge exists so tests and the eval plumbing run without a key. Its discovery and next-step agreement are by construction and are never reported as results.
- Extraction falls back to fixture labels when no Anthropic key is set; the live deployment must have the key or that step is not real.
- Two OpenRouter code paths exist: the shared `structured()` client for reasoning steps and the httpx judge in `score.py` that also records usage, latency and retries. Consolidating them is a follow-up.
- With `require_parameters` on, sending `temperature` excludes GPT-5.4 endpoints, which do not accept it. The judge sends no temperature.

## Follow-ups (as of 12 Sep 2026, evening)

- **Rubric v2 for objection handling.** Every model scored lowest on this dimension (50% to 75%) and the misses sit on the `partial` boundary. Add two worked examples per label to `api/evals/rubric.md`, bump `RUBRIC_VERSION`, re-run the bake-off. This is the cheapest accuracy gain available; swapping models is not.
- **OpenRouter key on the VPS.** `OPENROUTER_API_KEY` must be in `/etc/slipstream/api.env` or `POST /scorecards` answers 503 by design. Owner: Jeremy's deploy.
- **Coach tests.** `tests/test_coach.py::test_empty_disconnected_session_does_not_consume_checkpoint_capacity` and `test_active_resumed_checkpoint_is_not_expired` fail on a clean `origin/main`; they predate the scorecard merge and belong to the coach lane.
- **One OpenRouter client.** Fold the judge's usage, latency and retry accounting into the shared `structured()` client and delete the httpx path in `score.py`.
- **Playbook persistence.** The derived playbook is cached in-process; a VPS restart needs a re-derive. Add a table or store it on the ICP profile row.
- **Demo call audio.** Call 13 needs regenerating once ElevenLabs credits allow, with the voices already cast.
- **Judge latency in the demo.** DeepSeek V3.2 averages 17 seconds per call; if the walkthrough needs the scorecard to appear faster, set `SCORECARD_JUDGE_MODEL=openai/gpt-5.4` (5 seconds, the accuracy leader, 25 times the cost per call, still under two cents).

## Change log

- **12 Sep 2026, Jeremy**: schema and seed; API skeleton on the VPS with atomic releases; ingest with Scribe batch; grounded extraction with evidence verification.
- **12 Sep 2026, Anna**: fixtures with labels and validator; demo call voiced with ElevenLabs text-to-dialogue; ICP, leads and outreach lanes with the provider-agnostic reasoning client and `text-embedding-3-small`.
- **12 Sep 2026, Anna**: scorecard lane. Rubric v1, evidence-validated judge, playbook learning step, router at `POST /scorecards` and `POST /playbook`, OpenRouter judge with strict schemas and billed cost, eleven-model bake-off script. Live finding: `temperature` plus `require_parameters` returns 404 for GPT-5.4 models; removed temperature. Bake-off run over eleven models: DeepSeek V3.2 becomes the judge default by the pre-stated rule; GPT-5.4 is the accuracy alternative.
