# Model evaluation: how every model was chosen

Slipstream makes three kinds of model call that we measure: the scorecard judge, CRM extraction, and the live coach's card-completion decision. Each one was chosen by running the production prompt and schema over the labelled fixture calls for every candidate, grading the output programmatically against the labels, and applying a decision rule that was written down before the run. This file is the consolidated record; the per-run tables, per-call reports and cost ledgers live under `api/evals/`. The original plan for this evaluation was written on 12 September and is kept at the bottom of this file so the reader can see what was planned, what ran, and what did not.

## Summary

| Step | Candidates | Graded against | Rule | Pick | Runner and record |
|---|---|---|---|---|---|
| Scorecard judge | 11 models across Anthropic, OpenAI and five open-weight vendors | Scorecard labels on 12 history calls | Cheapest within one call of the best on every judged dimension | `deepseek/deepseek-v3.2` | `api/evals/run_scorecard_eval.py`, `api/evals/README.md` |
| CRM extraction | 7 models on 12 Sep; Claude Haiku, Sonnet (twice), Opus and gpt-5.4 rerun on 13 Sep; the two production candidates on the rebranded Eleno cohort on 13 Sep | Extraction labels on all 13 calls, eight judged checks | Same rule, plus a 75% per-check gate | `mistralai/mistral-medium-3.1` | `api/evals/run_extraction_eval.py`, `api/evals/extraction-eval.md` |
| Coach card completion | `openai/gpt-5.4` across three prompt and guard revisions | Ten hand-written turns, three positive and seven negative | Precision first; recall must not drop | `openai/gpt-5.4`, labelled a spot check | `api/evals/run_coach_eval.py`, `api/evals/coach-eval.md` |
| Transcription, embeddings, fixture voices | Not bake-off tested | | | ElevenLabs Scribe v2, `text-embedding-3-small`, `eleven_v3` | Reasoning in `README.md` Model choices |

Talk ratio, Revenue DNA freshness, campaign delivery and CRM sync are deterministic and were never candidates for a model.

## Method

**Corpus.** Thirteen labelled synthetic calls in `fixtures/`: twelve history calls spread across won, stalled, lost and no-show, and one voiced demo call. Each carries an `expected.json` written before any model ran, holding the extraction fields and the scorecard labels. `fixtures/validate.py` keeps the labels internally consistent. The 13 September rebrand to Eleno replaced five calls and edited the rest, so results are always dated and named to their cohort.

**Same code as production.** The runners call the same services the API serves (`score_call`, the `structured()` helper, the grounding pass), with the same prompt files and schemas. A model that wins the bake-off is the model production runs, not an approximation of it.

**Programmatic grading, not a model.** Each check is a rule against the label: normalised exact match for names, token Jaccard for free text, spoken-or-null for values the call never states, discovery count within one question, exact agreement for next step and objection handling. The full check table is in `api/evals/extraction-eval.md`. Parse failures, latency, tokens and billed cost are recorded per call regardless of correctness.

**Predeclared rule.** Pick the cheapest model whose agreement is within one call of the best on every judged dimension. For extraction the pick must also clear 75% on every judged check or the gate is reported as failed. When the rule is silent, the secondary criteria (mean judged pass rate, then cost) are stated and applied. Gates were never lowered after a result.

**Cost from the ledger.** Cost is OpenRouter's per-request `usage.cost` when present, with a dated price snapshot in `api/evals/openrouter-prices.json` as the fallback. A model with any unpriced attempt is excluded from the cheapest-model decision. Runs that did not report cost are marked `not billed`, meaning not measured here, never free. On 13 September the key's daily usage was reconciled against the summed per-request values and the difference was attributed to schema-rejected outputs the provider bills but the runner records as null.

**Single pass, stated as such.** Almost every row below is one pass per model. Models are not deterministic, so a one-call gap on thirteen calls is inside run-to-run noise; that is why the rule uses a one-call margin rather than a strict ranking, and why Sonnet 5 was run twice when its first run failed on output budget. The repeat plan (three passes per model) was costed but not run because the shared OpenRouter credit was exhausted twice over the weekend.

**What never counts.** The offline heuristic judge exists so tests and the eval plumbing run without a key. Its discovery and next-step agreement are by construction and are never reported as a result.

## Scorecard judge: eleven models, 12 September 2026

Run over the twelve labelled history calls, one pass per model, eleven models through OpenRouter, 28 minutes wall clock with four models in flight. Historical cohort (pre-rebrand). Comparison report `api/evals/results/scorecard-comparison-20260912-1653.md`; per-model reports alongside it.

| Model | Discovery within 1 | Discovery exact | Next step | Objection | Parse failures | Mean latency | Cost per call |
|---|---:|---:|---:|---:|---:|---:|---:|
| `anthropic/claude-haiku-4.5` | 100% | 58% | 92% | 58% | 0 | 9.3 s | $0.0057 |
| `anthropic/claude-sonnet-5` | 100% | 50% | 83% | 58% | 0 | 23.7 s | $0.0297 |
| `anthropic/claude-opus-5` | 100% | 50% | 92% | 58% | 0 | 19.4 s | $0.0576 |
| `openai/gpt-5.4-nano` | 83% | 58% | 92% | 67% | 0 | 4.2 s | $0.0011 |
| `openai/gpt-5.4-mini` | 100% | 25% | 83% | 50% | 0 | 3.6 s | $0.0044 |
| `openai/gpt-5.4` | 100% | 50% | 100% | 75% | 0 | 5.3 s | $0.0148 |
| `deepseek/deepseek-v3.2` | 100% | 50% | 92% | 75% | 0 | 17.4 s | $0.0006 |
| `qwen/qwen3.6-27b` | 25% | 17% | 25% | 25% | 9 | 27.0 s | $0.0034 |
| `meta-llama/llama-4-maverick` | 75% | 25% | 83% | 50% | 0 | 14.4 s | $0.0014 |
| `moonshotai/kimi-k2.6` | 25% | 17% | 25% | 0% | 9 | 59.3 s | $0.0083 |
| `mistralai/mistral-medium-3.1` | 100% | 42% | 75% | 50% | 0 | 3.9 s | $0.0015 |

Talk ratio agreed on every call for every model that parsed, as it must: it is computed, not judged.

**Decision.** `deepseek/deepseek-v3.2` is the `SCORECARD_JUDGE_MODEL` default: within one call of the best on every judged dimension and about 25 times cheaper than the runner-up, `openai/gpt-5.4`. GPT-5.4 is the accuracy-first alternative (the only model to secure next step on all twelve calls) and three times faster. The three Claude models were ruled out on objection handling alone.

**What it said about the rubric.** Objection handling was the weakest dimension for every model (50% to 75%); the misses cluster on the `partial` boundary the rubric describes in one sentence. Discovery exact is low because the rubric asks for genuine open questions while the labels count rep turns ending in a question mark; within-one agreement, which is what the rubric promises, is 100% for eight of eleven models. Rubric v2 with worked examples per label is the recorded next step and the cheapest accuracy gain available.

**Parse failures.** Qwen 3.6 27B and Kimi K2.6 failed strict schema validation on nine of twelve calls even after the retry; Kimi averaged a minute per call, which points at thinking output consuming the token budget. Both were excluded rather than investigated further.

**Live finding.** With `provider.require_parameters: true`, sending `temperature` returned 404 for GPT-5.4 endpoints, which do not accept it. The judge sends no temperature.

## CRM extraction: three runs, 12 to 13 September 2026

### Seven models, 12 September, historical cohort

One pass over all thirteen calls with prompt `extract-v2`. Three OpenAI models ran directly (cost not reported by that runner, so `not billed`); four ran sequentially through OpenRouter after a concurrent attempt hit the shared account's credit ceiling. Comparison `api/evals/results/extraction-comparison-20260912-final.md`.

| Model | Contact name | Contact email | Company name | Headcount | Deal amount | Next step | Promises | Objection handling | Grounded | Parse failures | Mean latency | Measured cost/call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `openai/gpt-5.4-nano` | 85% | 92% | 100% | 85% | 69% | 77% | 77% | 23% | 100% | 0 | 9.3 s | not billed |
| `openai/gpt-5.4-mini` | 100% | 100% | 100% | 92% | 62% | 69% | 100% | 46% | 100% | 0 | 7.3 s | not billed |
| `openai/gpt-5.4` | 100% | 100% | 100% | 92% | 54% | 62% | 100% | 15% | 100% | 0 | 8.8 s | not billed |
| `deepseek/deepseek-v3.2` | 92% | 92% | 92% | 85% | 69% | 62% | 69% | 23% | 92% | 1 | 29.7 s | $0.0014 |
| `meta-llama/llama-4-maverick` | 100% | 100% | 85% | 85% | 85% | 69% | 31% | 23% | 100% | 0 | 14.1 s | $0.0013 |
| `mistralai/mistral-medium-3.1` | 92% | 100% | 92% | 92% | 100% | 69% | 92% | 54% | 100% | 0 | 7.4 s | $0.0034 |
| `anthropic/claude-haiku-4.5` | 62% | 62% | 62% | 62% | 23% | 46% | 46% | 15% | 62% | 5 | 10.5 s | $0.0081 |

**Decision.** `mistralai/mistral-medium-3.1`: highest mean judged pass rate (86.5%), best deal-amount and objection-handling scores, 7.4 s mean latency, $0.0034 per call. It misses the 75% gate on next step (69%) and objection handling (54%), and the gate was not lowered.

**Grounding changed real outputs.** Llama needed ten quote repairs and one drop, DeepSeek three repairs and two drops, Mistral one repair. Every span kept after the deterministic pass is verbatim in the transcript.

### Claude models and the production model rerun, 13 September, historical cohort

Same cohort and prompt, with the optional-`sequence` schema fix, concurrency 1, every call billed through OpenRouter. Rows are scored over all thirteen calls with a failure counted as a miss on every check, which is what production would see. Comparison `api/evals/results/extraction-comparison-20260913-rerun.md`.

| Model | Completed | Contact name | Contact email | Company name | Headcount | Deal amount | Next step | Promises | Objection handling | Grounded | Parse failures | Mean latency | Billed cost/call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `anthropic/claude-haiku-4.5` | 13/13 | 100% | 100% | 100% | 92% | 62% | 69% | 69% | 23% | 100% | 0 | 10.6 s | $0.0129 |
| `anthropic/claude-sonnet-5` run 1 | 9/13 | 69% | 69% | 69% | 62% | 69% | 38% | 54% | 38% | 69% | 4 | 30.8 s | $0.0487 |
| `anthropic/claude-sonnet-5` run 2 | 12/13 | 92% | 92% | 92% | 85% | 92% | 62% | 77% | 54% | 92% | 1 | 33.2 s | $0.0521 |
| `anthropic/claude-opus-5` | 11/13 | 85% | 85% | 85% | 77% | 77% | 54% | 69% | 15% | 85% | 2 | 26.9 s | $0.1082 |
| `openai/gpt-5.4` via OpenRouter | 13/13 | 100% | 100% | 100% | 92% | 54% | 69% | 100% | 23% | 100% | 0 | 10.3 s | $0.0298 |

**Findings.** Haiku's earlier five parse failures were a schema artefact; with `sequence` optional it parses every call and matches gpt-5.4 on every contact and company field, but fails the rule on deal amount, promises and objection handling. Sonnet 5 is the strongest Claude extractor (100% on contact, company and deal amount over completed calls, the best objection score of any model, zero grounding repairs) and its failures are output budget and a 120-word summary limit rather than extraction quality; even its better run misses the one-call margin on next step and costs fifteen times Mistral at four times the latency. Opus 5 scores below Sonnet on the two hardest checks at twice the price. gpt-5.4 through OpenRouter behaves like gpt-5.4 direct on every check, so the production route adds no quality penalty. The Claude cost gap is explained by tokens: for the same prompt and schema Sonnet run 2 used about twice gpt-5.4's input tokens and more than twice its output tokens, likely reasoning tokens billed as output (unverified against provider metadata).

**Decision after the rerun: unchanged.** Mistral Medium 3.1 remains the only model within one call of the best on every judged check.

### The two production candidates on the Eleno cohort, 13 September

The rebrand replaced five calls and edited the rest, so the historical tables do not describe the fixtures now on `main`. Both candidates ran over the rebranded cohort with `extract-v2`, concurrency 1, all thirteen calls, billed through OpenRouter. Comparison `api/evals/results/extraction-comparison-20260913-eleno.md`.

| Model | Completed | Contact name | Contact email | Company name | Headcount | Deal amount | Next step | Promises | Objection handling | Grounded | Mean judged pass | Mean latency | Billed cost/call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `mistralai/mistral-medium-3.1` | 13/13 | 92% | 100% | 100% | 85% | 62% | 85% | 77% | 69% | 100% | 83.8% | 15.4 s | $0.0033 |
| `openai/gpt-5.4` | 13/13 | 100% | 100% | 100% | 85% | 100% | 69% | 69% | 8% | 100% | 78.9% | 9.3 s | $0.0304 |

**No model clears the rule on this cohort.** Mistral is five calls behind on deal amount; gpt-5.4 is eight calls behind on objection handling. The runner reports no pick.

**Decision: keep Mistral, record deal amount as its known weakness.** With the rule silent, mean judged pass rate (83.8% against 78.9%) and cost (nine times cheaper) both favour Mistral. Its deal-amount misses are the documented monthly-versus-annual confusion; gpt-5.4 almost never labels how an objection was handled. A rep sees a wrong deal value as a wrong number in a field they check, whereas a wrong objection label silently shapes the coaching, so the trade was judged acceptable for the demo and is stated in the README's limitations. Production moved from `openai/gpt-5.4` to `mistralai/mistral-medium-3.1` on 14 September (PR #90).

## Coach card completion: a spot check, 13 September 2026

The coach removes a suggestion card when the model decides the rep asked it or the customer answered it, so a wrong "covered" decision hides a question the rep still needs and precision matters more than recall. Ten hand-written turns seed the same card ("What budget have you set aside?"): three should complete it and seven must not (negation, quoted speech, a hypothetical, an unfinished question, an unknown speaker, a customer offering rather than answering, a customer repeating an unsupported claim). Each case runs one real analysis through `coach_reasoning.py` and the same `apply_analysis` guards the live session uses. Model `openai/gpt-5.4` through OpenRouter.

| Run | Prompt | Code guards | Correct | Precision | Recall | Median latency | Slowest |
|---|---|---|---|---|---|---|---|
| 1 | `coach-session-v1.md` | quote, role, confidence | 8/10 | 0.60 (3 of 5) | 1.00 | 3.2 s | 6.1 s |
| 2 | `coach-session-v2.md` | plus: a quoted question is never an answer | 9/10 | 0.75 (3 of 4) | 1.00 | 2.7 s | 4.0 s |
| 3 | `coach-session-v2.md` | plus: trailing-off speech never completes | 10/10 | 1.00 (3 of 3) | 1.00 | 2.8 s | 3.9 s |

Each miss became a prompt clause and a deterministic guard with a unit test, so the fix holds regardless of what the model returns. Ten cases, one run per configuration, typed text rather than Scribe output: this is a spot check, not a benchmark, and the README says so. After production extraction moved to Mistral, the same ten cases on Mistral returned truncated analysis JSON on two runs, so the coach is not on the demo path until it has its own model setting.

## Where an LLM is the judge, and where it is not

Slipstream uses a model as a judge in four places, and each one is bounded by code that checks the judge's evidence.

1. **The scorecard judge in the product.** The model returns quoted spans with turn indices per rubric dimension, never a bare verdict. A span is kept only if the index is in range and the quote is verbatim in that turn; the discovery count and the next-step flag are derived from the survivors. Its coaching narratives (went well, to improve, summary) are kept after the same validation, with deterministic sentences as the per-field fallback. Rubric in `api/evals/rubric.md`, code in `api/app/services/score.py`.
2. **The playbook judge.** After scoring every eligible call, deterministic won-versus-not-won statistics per dimension go to the model, which names three to five behaviours that separate the won calls, each citing call ids and quotes. A pattern citing a call not in the input or a quote not in that call's validated evidence is dropped.
3. **The hackathon-rubric judge on our own submission.** One Sonnet scenario per criterion reads the repo snapshot, bounded text snapshots of the live routes and API, and the organisers' band wording verbatim, then returns a score, evidence with file paths and the gaps that would lift the score. Deterministic checks cover the submission requirements and a doc-sync check keeps the human table, the criteria data and the rubric aligned. Internal result on 13 September: 15 of 15 scenarios passed, 95 of 100, with the gap stated. The rule is fix the gaps, never the rubric. Details in `docs/judging-evals.md`.
4. **Adversarial model review of code before merge.** Most backend rows on `BOARD.md` (the schema, API skeleton, ingest, extraction, email delivery, campaign controls and scheduler worker among them) record hostile review rounds by a model that did not write the code, with the outcome noted on the row.

The model bake-offs themselves are graded by rules against labels, not by a judge model, so a model is never marking its own homework. The two judge-style evaluations in the original plan that did not run are a pairwise blind judge for follow-up draft quality (no single right answer, so it needs a judge) and a precision-and-recall run for the demo call's five planted risk flags; risk flags are currently a deterministic pattern list in `api/app/services/draft.py` and were not model-tested.

## Limitations of the evaluation itself

- Thirteen calls, and one pass for most models. A one-call gap is within noise, which the rule's one-call margin absorbs but does not remove.
- The labels are hand-written by the team and carry conventions the models can reasonably disagree with (courtesy follow-ups omitted from lost-call next steps; rep turns ending in a question mark counted as discovery).
- Two extraction gates (next step, objection handling) are openly failed by every model tested.
- The 12 September tables describe the pre-rebrand cohort; only the two production candidates were re-run on the Eleno cohort.
- Coach quality beyond card completion (whether the suggested question is useful, speech-to-card delay, Scribe accuracy) is unmeasured.
- OpenAI direct runs carry no cost; Sonnet run 1's true cost was reconstructed from the ledger after the fact.

## Reproduce

```bash
cd api
UV_OFFLINE=1 uv run python evals/run_scorecard_eval.py --judge openrouter --models default
UV_OFFLINE=1 uv run python evals/run_extraction_eval.py
UV_OFFLINE=1 uv run python evals/run_extraction_eval.py --model mistralai/mistral-medium-3.1 --only call-01-northstar-labs
PYTHONPATH=. uv run python evals/run_coach_eval.py
cd .. && npm run evals            # hackathon-rubric judge, needs a Claude Code login
```

`OPENROUTER_API_KEY` in `api/.env` runs everything through OpenRouter; `--repeats 3 --launch-budget-usd 5` on the scorecard runner adds repeats behind a launch gate. Each runner writes per-model reports and a comparison table into `api/evals/results/` with a date stamp.

## The original plan, 12 September 2026

Decided 12 September, Anna: run a small evaluation to choose the model for each AI step, include cheap open-weight models, and put the result in the video and README. Parked until the loop worked end to end so nobody spent the weekend tuning models on a product that did not exist yet. Three tasks were planned: extraction, scorecard and risk flags, each graded programmatically against `expected.json`; a pairwise blind draft judge if time allowed; three repeats on the demo call. Candidates were two or three per vendor at different price tiers (Anthropic Haiku 4.5, Sonnet 5, Opus 5; OpenAI GPT-5.4 nano, mini and full) plus three or four open-weight models through OpenRouter, with prices verified on the day rather than recalled. The decision rule was stated up front: pick the cheapest model whose accuracy is within the repeat spread of the best on that task. Estimated cost was under $10 for one full run. What ran: the scorecard and extraction tasks in full, the coach completion check in place of the risk-flag task, and repeats only for Sonnet 5. What did not: the risk-flag precision-and-recall run, the draft judge, and the three-repeat plan, all for the same reason, the shared OpenRouter credit ran out twice.
