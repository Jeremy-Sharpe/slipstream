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

Run on 12 September 2026, all thirteen fixture calls including the demo call, one pass per model, prompt `extract-v2`. The three OpenAI models ran directly through the OpenAI Responses API (cost is not billed per request there, so the table shows tokens via latency only); the open-weight and Claude models run through OpenRouter and are recorded below as they complete. Per-call reports are in `results/`; the comparison is `results/extraction-comparison-20260912-openai.md`.

| Model | Contact name | Contact email | Company name | Headcount | Deal amount | Next step | Promises | Objection handling | Grounded | Parse failures | Mean latency |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `openai/gpt-5.4-nano` | 85% | 92% | 100% | 85% | 69% | 77% | 77% | 23% | 100% | 0 | 9.3 s |
| `openai/gpt-5.4-mini` | 100% | 100% | 100% | 92% | 62% | 69% | 100% | 46% | 100% | 0 | 7.3 s |
| `openai/gpt-5.4` | 100% | 100% | 100% | 92% | 54% | 62% | 100% | 15% | 100% | 0 | 8.8 s |

**Decision so far.** `openai/gpt-5.4-mini` is the pick among the OpenAI models by the rule above (within one call of the best on every judged check, cheapest of those), and it misses the 75 percent gate on three checks: deal amount, next step and objection handling. The gate is a target, not a pass mark we lowered; the misses are explained below and the first two are prompt and label work, not model work. `REASONING_MODEL` stays `gpt-5.4` until the OpenRouter models are in, because the demo path was verified live on it.

**Grounding held at 100 percent on every call for every model.** No model needed a repair and nothing was dropped on the OpenAI runs: with the call date and the schema in front of them, the models quote verbatim. The pass is still load-bearing as a guarantee rather than as a correction, and the earlier probe without the call date showed both gpt-5.4-mini and DeepSeek inventing a year for "11 September".

**What the misses say about the prompt and the labels, not just the models.**

- **Deal amount (54 to 69 percent).** The labelled `value_aud` is the annual contract value from the script metadata and is spoken in one call only (the demo). Where it is not spoken the honest answer is null, and every miss on all three models is a spoken number reported as the deal amount: the per-seat monthly price (126 to 145) on the won calls, or the onboarding project figure (3,500 to 8,000) on the others. The schema says `amount` with no unit. Next prompt revision: "amount is the total contract value in AUD; never a per-seat or monthly price".
- **Next step (62 to 77 percent).** Every miss but one is a lost or no-show call (03, 05, 10, 12) where the label has no next step and the model records the courtesy follow-up or reschedule that was actually agreed. Those are real commitments in the transcript, so this is a labelling convention: the labels only record next steps that advance a live deal. The remaining miss is gpt-5.4 dating call-02's proposal review one day early. Decide the convention, then either relabel or tell the prompt to omit courtesy follow-ups on dead deals.
- **Objection handling (15 to 46 percent).** The models find three to nine objections per call where the labels name one or two, and the handling verdict on the matched objection disagrees about half the time on `partial` versus `handled`, the same boundary the scorecard bake-off found weakest. The rubric-style definitions with examples that the scorecard write-up proposes should go into the extraction prompt too.
- **Deal outcome** is reported and not judged: the labels carry the eventual CRM outcome (won, stalled) and the prompt is deliberately conservative, reporting `open` when the buyer agreed to review a proposal rather than sign. The models agree with the labels on every lost call and disagree on every won and stalled call for that reason.

**Not run tonight.** The shared OpenRouter key sits on a five-dollar credit account with about a dollar and a half left; four models in flight returned 402 and the run was stopped. The open-weight and Claude models were restarted one at a time (`--concurrency 1`, stamp `20260912-1845or`); if their reports are not in `results/`, that run did not finish before the session closed and needs re-running after a top-up, and the full nine-model comparison with billed cost waits on the same top-up.
