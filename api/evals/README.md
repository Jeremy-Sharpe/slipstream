# Scorecard Evals

The scorecard rubric lives in [rubric.md](rubric.md) and checks four dimensions: discovery questions, next step secured, objection handling and deterministic rep talk ratio.

Set `OPENROUTER_API_KEY=` in `api/.env` to run the bake-off through OpenRouter, or set `ANTHROPIC_API_KEY=` to run the direct Anthropic fallback.

Run the default OpenRouter comparison from `api/` with `UV_OFFLINE=1 uv run python evals/run_scorecard_eval.py --judge openrouter --models default`.

Run repeated comparisons with `UV_OFFLINE=1 uv run python evals/run_scorecard_eval.py --judge openrouter --models default --repeats 3 --max-usd 5`.

Run the offline plumbing check with `UV_OFFLINE=1 uv run python evals/run_scorecard_eval.py --judge heuristic --models a,b --out /tmp/scorecard-eval-check`.

The heuristic judge is only a plumbing check; its discovery and next-step agreement are by construction, and only OpenRouter or Anthropic runs count as results.

The eval compares every fixture call against `expected.json`: discovery passes within plus or minus one question and records exact match separately, next step and objection handling require exact agreement, and talk ratio passes within 0.03.

The decision rule is the cheapest model whose agreement is within one call of the best model on every judged dimension.

## Default Model Set

Snapshot prices were copied from OpenRouter on 12 September 2026 into [openrouter-prices.json](openrouter-prices.json).

| Model id | In / out per MTok | Why it is in |
|---|---|---|
| `anthropic/claude-haiku-4.5` | $1.00 / $5.00 | Cheapest Claude |
| `anthropic/claude-sonnet-5` | $2.00 / $10.00 | Product default candidate before the run |
| `anthropic/claude-opus-5` | $5.00 / $25.00 | Accuracy ceiling for the Claude family |
| `openai/gpt-5.4-nano` | $0.20 / $1.25 | Cheapest OpenAI |
| `openai/gpt-5.4-mini` | $0.75 / $4.50 | Mid OpenAI |
| `openai/gpt-5.4` | $2.50 / $15.00 | OpenAI flagship |
| `deepseek/deepseek-v3.2` | $0.27 / $0.40 | Open weight |
| `qwen/qwen3.6-27b` | $0.30 / $2.00 | Open weight, small |
| `meta-llama/llama-4-maverick` | $0.20 / $0.70 | Open weight |
| `moonshotai/kimi-k2.6` | $0.95 / $4.00 | Open weight |
| `mistralai/mistral-medium-3.1` | $0.40 / $2.00 | Open weight |

## Results

Run on 12 September 2026 over the twelve labelled history calls, one pass per model, eleven models through OpenRouter, 28 minutes wall clock with four models in flight, $1.54 total. Cost is OpenRouter's billed `usage.cost`; latency is per call including the strict-schema retry when one happened. Full per-call reports are in [results/](results/); the comparison is `results/scorecard-comparison-20260912-1653.md`.

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

**Decision.** Applying the rule stated above before the run, the pick is `deepseek/deepseek-v3.2`: it is within one call of the best on every judged dimension and is the cheapest model in that set by a factor of about 25 against the runner-up, `openai/gpt-5.4`. That is now the `SCORECARD_JUDGE_MODEL` default. `openai/gpt-5.4` is the accuracy-first alternative (the only model to secure next step on all twelve calls) and is three times faster; use it if latency in the demo matters more than the cost line. The three Claude models were ruled out on objection handling alone.

**What the numbers say about the rubric, not just the models.** Objection handling is the weakest dimension everywhere (50% to 75%): the labels separate `partial` from `ignored` and `handled` on judgement calls the rubric describes in one sentence each, and the misses cluster on those boundaries (DeepSeek's four misses are all `partial` versus a neighbour). Discovery exact is low because the rubric asks for genuine open questions while the fixture labels count rep turns ending in a question mark, so most models score one fewer on the won calls; within-one agreement is what the rubric promises and it is 100% for eight of eleven models. Tightening the objection definitions with examples is the next rubric revision.

**Parse failures.** Qwen 3.6 27B and Kimi K2.6 failed schema validation on nine of twelve calls each even after the retry, and Kimi averaged a minute per call, which points at thinking output consuming the token budget; both are excluded from the decision and not investigated further this weekend.
