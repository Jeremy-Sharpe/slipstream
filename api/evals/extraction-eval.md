# Extraction Eval

## What It Measures

This eval runs the live extraction path over the labelled call fixtures, one or more times per model, and compares the grounded `ExtractionResult` against `expected.json["extraction"]` for contact, company, deal, next-step, promise, objection, and evidence-grounding agreement.

## How To Run

Default comparison: `UV_OFFLINE=1 uv run python evals/run_extraction_eval.py`

Single model: `UV_OFFLINE=1 uv run python evals/run_extraction_eval.py --model deepseek/deepseek-v3.2 --only call-01-northstar-labs`

Offline plumbing check with the fake model path: `UV_OFFLINE=1 uv run pytest tests/test_extraction_eval.py`

Re-score stored reports after a scoring change, no model calls: `UV_OFFLINE=1 uv run python evals/run_extraction_eval.py --rescore evals/results/extraction-<model>-<stamp>.json ... --stamp <new-stamp>`

## Checks

| key | rule |
|---|---|
| `contact_name` | `norm(a) == norm(b)` where `norm` casefolds, collapses whitespace, and straightens curly quotes |
| `contact_email` | spoken-or-null: when the labelled email never appears in the transcript the honest extraction is null and only null passes; when it is spoken, normalised exact |
| `contact_phone` | spoken-or-null on digits |
| `contact_title` | normalised exact against expected `role` |
| `company_name` | normalised exact |
| `company_industry` | token Jaccard of the two normalised strings at least 0.5 |
| `company_industry_exact` | normalised exact (reported, not judged) |
| `company_headcount` | int equal to expected `headcount` |
| `company_location` | normalised exact |
| `deal_stage` | expected mapped with `{"closed_won": "customer", "closed_lost": "evaluation", "proposal": "evaluation"}` else unchanged, equal to extracted `stage.value` |
| `deal_outcome` | expected mapped `{"no_show": "stalled"}` else unchanged, equal (reported, not judged: the labels carry the eventual CRM outcome, the prompt reports what the buyer committed to on the call) |
| `deal_amount` | spoken-or-null: the labelled annual value must appear in the transcript (`58400` or `58,400`) for a non-null extraction to count; a per-seat or monthly price reported as the amount is a miss |
| `next_step` | presence equal; when both present, `due_date` equal to expected `due` as an ISO string; when expected `due` is absent, presence alone passes |
| `promises` | recall: every labelled promise has an extracted promise with token Jaccard at least 0.4; extra promises are not penalised |
| `promises_count` | `abs(len(extracted) - len(expected)) <= 1` (reported, not judged) |
| `objections` | `abs(len(extracted) - len(expected)) <= 1` |
| `objection_handling` | match each expected objection to the extracted objection with the highest token Jaccard on `text`, threshold 0.4; pass when every matched pair agrees on `handling` and at least one matched; an expected list that is empty passes when the extracted list is empty |
| `grounded` | every evidence span in the result is `source == "transcript"` and its quote is a verbatim substring of the cited segment body |

## Decision Rule

The judged checks are `contact_name`, `contact_email`, `company_name`, `company_headcount`, `deal_amount`, `next_step`, `promises`, and `objection_handling`; the comparison picks the cheapest model within one call of the best `mean_passed` on every judged check, or sorts by mean latency when no model reports billed cost, and the pick passes the gate only when every judged check is at least 75 percent.

## Results

Anna Sekulic ran one pass over all thirteen fixture calls, including the demo call, on
12 September 2026 with prompt `extract-v2`. Three OpenAI models ran directly and four
models ran sequentially through OpenRouter after a concurrent attempt hit the shared
account's credit ceiling. The direct-provider runner did not report OpenAI cost, so those
rows are marked `not billed`; that means “not measured here”, not “free”. The preserved
comparison is `results/extraction-comparison-20260912-final.md` and the per-call reports
remain in `results/`. This evidence-only port from Anna's PR #7 deliberately excludes that
branch's obsolete implementation changes.

| Model | Contact name | Contact email | Company name | Headcount | Deal amount | Next step | Promises | Objection handling | Grounded | Parse failures | Mean latency | Measured cost/call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `openai/gpt-5.4-nano` | 85% | 92% | 100% | 85% | 69% | 77% | 77% | 23% | 100% | 0 | 9.3 s | not billed |
| `openai/gpt-5.4-mini` | 100% | 100% | 100% | 92% | 62% | 69% | 100% | 46% | 100% | 0 | 7.3 s | not billed |
| `openai/gpt-5.4` | 100% | 100% | 100% | 92% | 54% | 62% | 100% | 15% | 100% | 0 | 8.8 s | not billed |
| `deepseek/deepseek-v3.2` | 92% | 92% | 92% | 85% | 69% | 62% | 69% | 23% | 92% | 1 | 29.7 s | $0.0014 |
| `meta-llama/llama-4-maverick` | 100% | 100% | 85% | 85% | 85% | 69% | 31% | 23% | 100% | 0 | 14.1 s | $0.0013 |
| `mistralai/mistral-medium-3.1` | 92% | 100% | 92% | 92% | 100% | 69% | 92% | 54% | 100% | 0 | 7.4 s | $0.0034 |
| `anthropic/claude-haiku-4.5` | 62% | 62% | 62% | 62% | 23% | 46% | 46% | 15% | 62% | 5 | 10.5 s | $0.0081 |

**Decision.** `mistralai/mistral-medium-3.1` is the operational pick: it has the
highest mean judged pass rate (86.5%), the best deal-amount and objection-handling
scores, 7.4-second mean latency, and a measured cost of $0.0034 per call. It still misses
the predeclared 75% per-check gate on next step (69%) and objection handling (54%); the
gate was not lowered after seeing the result. `openai/gpt-5.4-mini` is the accuracy-first
alternative for contact and promise fields, but its cost was not captured and therefore
cannot be honestly compared. Production remains provider-configurable and the public VPS
is keyless, so this evaluation does not imply a currently active production model.

**Grounding changed real outputs.** Llama needed ten quote repairs and one drop,
DeepSeek three repairs and two drops, and Mistral one repair. Every span retained after
the deterministic pass is verbatim. DeepSeek's 92% grounding score represents one failed
call, not an ungrounded span escaping validation.

**Known weaknesses.** Deal-amount misses mostly confuse monthly/per-seat or onboarding
figures with annual contract value. Next-step misses are dominated by a label convention:
lost/no-show labels omit courtesy follow-ups that models correctly observe in the call.
Objection-handling misses cluster around the ambiguous `partial` versus `handled` boundary.
Claude Haiku failed five parses and DeepSeek one because those outputs omitted evidence
sequence numbers. The raw model schema now accepts that recoverable shape long enough for
the grounding pass to locate the quote, while the canonical result still rejects any
transcript evidence left without an index. The historical table is intentionally unchanged;
the models must be rerun before claiming an improved score. Claude Sonnet, Claude Opus and
repeat runs were not completed because the shared OpenRouter credit was exhausted.

## 13 September rerun: Claude models and the production model through OpenRouter

Anna Sekulic reran the Claude models and the production model on 13 September 2026 with prompt `extract-v2`, the optional-`sequence` schema from PR #23, concurrency 1, all thirteen calls including the demo call, every call billed through OpenRouter. The shared account ran dry after Haiku, the first Sonnet run and six gpt-5.4 calls; it was topped up the same afternoon and gpt-5.4, Opus 5 and a second Sonnet run then completed. Per-model reports are `results/extraction-*-20260913-rerun.md` (the second Sonnet run is `-rerun2`) and the combined table is `results/extraction-comparison-20260913-rerun.md`. Rows with failures are scored over all thirteen calls with a failure counted as a miss on every check, which is what production would see; the completed-call rates follow in prose.

| Model | Completed | Contact name | Contact email | Company name | Headcount | Deal amount | Next step | Promises | Objection handling | Grounded | Parse failures | Mean latency | Billed cost/call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `anthropic/claude-haiku-4.5` | 13/13 | 100% | 100% | 100% | 92% | 62% | 69% | 69% | 23% | 100% | 0 | 10.6 s | $0.0129 |
| `anthropic/claude-sonnet-5` run 1 | 9/13 | 69% | 69% | 69% | 62% | 69% | 38% | 54% | 38% | 69% | 4 | 30.8 s | $0.0487 |
| `anthropic/claude-sonnet-5` run 2 | 12/13 | 92% | 92% | 92% | 85% | 92% | 62% | 77% | 54% | 92% | 1 | 33.2 s | $0.0521 |
| `anthropic/claude-opus-5` | 11/13 | 85% | 85% | 85% | 77% | 77% | 54% | 69% | 15% | 85% | 2 | 26.9 s | $0.1082 |
| `openai/gpt-5.4` via OpenRouter | 13/13 | 100% | 100% | 100% | 92% | 54% | 69% | 100% | 23% | 100% | 0 | 10.3 s | $0.0298 |

**Cost is ledger-verified.** Billed cost per call is the mean of OpenRouter's per-request `usage.cost` over the calls that completed. The key's usage for the day after all five runs was $3.5291 against $2.9939 summed from those per-request values; the $0.5352 difference is the seven outputs the schema rejected (four in Sonnet run 1, two in Opus, one in Sonnet run 2), which OpenRouter bills but the runner records as `cost_usd: null`. Sonnet run 1 alone accounted for $0.2302 of that, measured before the other runs started, so its true cost was $0.6689 for thirteen calls, $0.0515 per call. The seven gpt-5.4 failures in the credit-starved first attempt were HTTP 402 refusals and were not billed. gpt-5.4 is the first billed measurement of the production model: $0.3875 for thirteen extractions, $0.0298 each, consistent with $0.0284 computed from the 12 September direct run's 38,664 input and 18,173 output tokens at OpenRouter's $2.50 and $15.00 per million.

**Token profile explains the Claude cost.** For the same prompt and schema, gpt-5.4 used 46,408 input and 18,100 output tokens over thirteen calls; Haiku used 84,006 and 16,703; Sonnet run 2 used 100,019 and 42,522 over twelve; Opus used 92,040 and 29,189 over eleven. Likely: the input gap is the Anthropic tokeniser plus OpenRouter's schema handling for Anthropic models, and the Sonnet and Opus output gap is reasoning tokens billed as output, because their per-call output ran two to three times Haiku's for a JSON document of the same shape; neither was verified against provider response metadata.

**Haiku's earlier row was a schema artefact.** With `sequence` optional it parsed all thirteen calls (five failures before), matched gpt-5.4 on every contact and company field, and needed seventeen quote repairs and one drop from the grounding pass, the most of any model except Llama 4 Maverick. It fails the predeclared rule on deal amount (8 of 13 against Mistral's 13 of 13), promises and objection handling.

**Sonnet 5 is the strongest Claude extractor and still fails the rule.** Across both runs its completed calls scored 100% on every contact and company field, 100% on deal amount, 78% to 83% on promises and 56% to 58% on objection handling, the best objection score of any model, with zero grounding repairs. Its failures are prompt compliance and output budget, not extraction quality: three run 1 outputs exceeded the 120-word summary limit the prompt states and the schema enforces, and one output in each run was cut off by the 5,000-token output cap. Even the better run misses the one-call margin on next step (8 of 13 against the best 10 of 13) and costs fifteen times Mistral at four times the latency.

**Opus 5 does not earn its price.** Two outputs broke the summary limit; on the eleven completed calls it scored 91% on deal amount, 64% on next step, 82% on promises and 18% on objection handling, below Sonnet on the two hardest checks at twice Sonnet's cost and $0.1082 per call.

**gpt-5.4 through OpenRouter behaves like gpt-5.4 direct.** Thirteen of thirteen parsed, zero grounding repairs, and every check within one call of the 12 September direct run (next step 69% against 62%, objection handling 23% against 15%), so the production route adds no quality penalty.

**Decision after the rerun: unchanged.** `mistralai/mistral-medium-3.1` is still the only model within one call of the best on every judged check, at $0.0034 per call, so it remains the pick. No Claude model displaces it: Haiku, Opus and gpt-5.4 all fall more than one call short on deal amount, and Sonnet falls short on next step. Production keeps `openai/gpt-5.4`, now with a measured cost of $0.0298 per extraction. The gates that were openly failed on 12 September stay failed: no model reached 75% on next step or objection handling. Follow-ups if credit allows: a larger output budget and a firmer summary-length instruction for the Anthropic route, then a Sonnet 5 rerun under those settings.
