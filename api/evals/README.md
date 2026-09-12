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
| `anthropic/claude-sonnet-5` | $2.00 / $10.00 | Product default candidate |
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

No key-backed numbers have been recorded yet.

Key-backed reports are written to [results/](results/).
