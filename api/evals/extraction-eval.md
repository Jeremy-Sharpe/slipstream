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
