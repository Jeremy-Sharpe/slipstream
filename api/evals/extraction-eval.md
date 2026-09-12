# Extraction Eval

## What It Measures

This eval runs the live extraction path over the labelled call fixtures, one or more times per model, and compares the grounded `ExtractionResult` against `expected.json["extraction"]` for contact, company, deal, next-step, promise, objection, and evidence-grounding agreement.

## How To Run

Default comparison: `UV_OFFLINE=1 uv run python evals/run_extraction_eval.py`

Single model: `UV_OFFLINE=1 uv run python evals/run_extraction_eval.py --model deepseek/deepseek-v3.2 --only call-01-northstar-labs`

Offline plumbing check with the fake model path: `UV_OFFLINE=1 uv run pytest tests/test_extraction_eval.py`

## Checks

| key | rule |
|---|---|
| `contact_name` | `norm(a) == norm(b)` where `norm` casefolds, collapses whitespace, and straightens curly quotes |
| `contact_email` | normalised exact |
| `contact_phone` | digits only equal |
| `contact_title` | normalised exact against expected `role` |
| `company_name` | normalised exact |
| `company_industry` | token Jaccard of the two normalised strings at least 0.5 |
| `company_industry_exact` | normalised exact (reported, not judged) |
| `company_headcount` | int equal to expected `headcount` |
| `company_location` | normalised exact |
| `deal_stage` | expected mapped with `{"closed_won": "customer", "closed_lost": "evaluation", "proposal": "evaluation"}` else unchanged, equal to extracted `stage.value` |
| `deal_outcome` | expected mapped `{"no_show": "stalled"}` else unchanged, equal |
| `deal_amount` | int equal to expected `value_aud` (both `None` also passes) |
| `next_step` | presence equal; when both present, `due_date` equal to expected `due` as an ISO string; when expected `due` is absent, presence alone passes |
| `promises` | `abs(len(extracted) - len(expected)) <= 1` |
| `objections` | `abs(len(extracted) - len(expected)) <= 1` |
| `objection_handling` | match each expected objection to the extracted objection with the highest token Jaccard on `text`, threshold 0.4; pass when every matched pair agrees on `handling` and at least one matched; an expected list that is empty passes when the extracted list is empty |
| `grounded` | every evidence span in the result is `source == "transcript"` and its quote is a verbatim substring of the cited segment body |

## Decision Rule

The judged checks are `contact_name`, `contact_email`, `company_name`, `company_headcount`, `deal_outcome`, `deal_amount`, `next_step`, `promises`, and `objection_handling`; the comparison picks the cheapest model within one call of the best `mean_passed` on every judged check, or sorts by mean latency when no model reports billed cost, and the pick passes the gate only when every judged check is at least 75 percent.

## Results

Pending the live run.
