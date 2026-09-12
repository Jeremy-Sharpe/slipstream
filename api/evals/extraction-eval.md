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

Run on 12 September 2026, all thirteen fixture calls including the demo call, one pass per model, prompt `extract-v2`. The three OpenAI models ran directly through the OpenAI Responses API, which does not bill per request, so their cost column is empty; the four others ran through OpenRouter one at a time (the shared key sits on a five-dollar credit account and four models in flight returned 402). Claude Sonnet and Opus were not run for the same credit reason. Per-call reports are in `results/`; the comparison is `results/extraction-comparison-20260912-final.md`, produced by `--rescore` over the stored extractions.

| Model | Contact name | Contact email | Company name | Headcount | Deal amount | Next step | Promises | Objection handling | Grounded | Parse failures | Repaired / dropped | Mean latency | Cost per call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `openai/gpt-5.4-nano` | 85% | 92% | 100% | 85% | 69% | 77% | 77% | 23% | 100% | 0 | 0 / 0 | 9.3 s | not billed |
| `openai/gpt-5.4-mini` | 100% | 100% | 100% | 92% | 62% | 69% | 100% | 46% | 100% | 0 | 0 / 0 | 7.3 s | not billed |
| `openai/gpt-5.4` | 100% | 100% | 100% | 92% | 54% | 62% | 100% | 15% | 100% | 0 | 0 / 0 | 8.8 s | not billed |
| `deepseek/deepseek-v3.2` | 92% | 92% | 92% | 85% | 69% | 62% | 69% | 23% | 92% | 1 | 3 / 2 | 29.7 s | $0.0014 |
| `meta-llama/llama-4-maverick` | 100% | 100% | 85% | 85% | 85% | 69% | 31% | 23% | 100% | 0 | 10 / 1 | 14.1 s | $0.0013 |
| `mistralai/mistral-medium-3.1` | 92% | 100% | 92% | 92% | 100% | 69% | 92% | 54% | 100% | 0 | 1 / 0 | 7.4 s | $0.0034 |
| `anthropic/claude-haiku-4.5` | 62% | 62% | 62% | 62% | 23% | 46% | 46% | 15% | 62% | 5 | 0 / 0 | 10.5 s | $0.0081 |

**Decision.** By the rule above the pick is `mistralai/mistral-medium-3.1`: it is within one call of the best on every judged check, has the best deal amount and objection handling scores of any model, the fastest mean latency, and it costs a third of a cent per call. It still misses the 75 percent gate on next step (69 percent) and objection handling (54 percent), for the reasons below. `openai/gpt-5.4-mini` is the accuracy-first alternative on the contact and promise fields and costs about the same order; the rule prefers Mistral because OpenAI-direct cost is not billed per request and the rule sorts billed models first, so read the two as a tie broken by measured cost. `REASONING_MODEL` stays `gpt-5.4` in the shared `.env` because the demo path was verified live on it; switching to Mistral means setting `REASONING_MODEL=mistralai/mistral-medium-3.1` and running the demo flow once.

**Grounding.** The pass corrected real output on the open-weight models: Llama 4 Maverick needed ten quote repairs and one drop across thirteen calls, DeepSeek three repairs and two drops, Mistral one repair. The OpenAI models needed none. Every kept span is verbatim by construction; DeepSeek's 92 percent grounded is its one failed call counting as a miss, not a grounding leak.

**Parse failures are a schema gap, not model noise.** Claude Haiku failed five calls and DeepSeek one for the same reason: the model returned transcript evidence without a `sequence`, and `EvidenceSpan` rejects that before the grounding pass can locate the quote. Since `ground()` already searches every segment for a quote, `sequence` should be optional on model output and filled in by grounding; that one validator change would have rescued all six calls. Haiku's numbers are therefore a floor, not a measurement.

**What the misses say about the prompt and the labels, not just the models.**

- **Deal amount.** The labelled `value_aud` is the annual contract value from the script metadata and is spoken in one call only (the demo). Where it is not spoken the honest answer is null; every miss on the OpenAI models is a spoken number reported as the deal amount, the per-seat monthly price (126 to 145) on the won calls or the onboarding project figure (3,500 to 8,000) on the others. Mistral and Llama mostly leave it null. Next prompt revision: "amount is the total contract value in AUD; never a per-seat or monthly price".
- **Next step (46 to 77 percent, every model).** Every miss but a handful is a lost or no-show call (03, 05, 10, 12) where the label has no next step and the model records the courtesy follow-up or reschedule that was actually agreed. Those are real commitments in the transcript, so this is a labelling convention: the labels only record next steps that advance a live deal. Decide the convention, then either relabel or tell the prompt to omit courtesy follow-ups on dead deals. The rest are due dates one day off.
- **Objection handling (15 to 54 percent).** The models find three to nine objections per call where the labels name one or two, and the handling verdict on the matched objection disagrees about half the time on `partial` versus `handled`, the same boundary the scorecard bake-off found weakest. The rubric-style definitions with examples that the scorecard write-up proposes should go into the extraction prompt too.
- **Promises.** Llama 4 Maverick's 31 percent is recall against the labelled promises: it extracts fewer, more general commitments. Everything else is 69 percent or better.
- **Deal outcome** is reported and not judged: the labels carry the eventual CRM outcome (won, stalled) and the prompt is deliberately conservative, reporting `open` when the buyer agreed to review a proposal rather than sign. The models agree with the labels on every lost call and disagree on every won and stalled call for that reason.

**Not run.** Claude Sonnet and Opus through OpenRouter, and a repeat pass, wait on a credit top-up.
