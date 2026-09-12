# Scorecard Evals

The scorecard rubric lives in [rubric.md](rubric.md) and checks four dimensions: discovery questions, next step secured, objection handling and deterministic rep talk ratio.

Run the offline judge from `api/` with `UV_OFFLINE=1 uv run python evals/run_scorecard_eval.py --judge heuristic`.

Use `--judge anthropic --model claude-sonnet-5` only when `ANTHROPIC_API_KEY` is configured.

The eval compares every fixture call against `expected.json`: discovery passes within plus or minus one question and records exact match separately, next step and objection handling require exact agreement, and talk ratio passes within 0.03.

The judge default is Sonnet 5 at $2/$10 per MTok because the task needs careful quoted evidence rather than a cheap summary; Haiku 4.5 at $1/$5 per MTok is the comparison model.

The decision rule is the cheapest model whose agreement is within one call of the best model on every dimension.

## Results

No key-backed run has been recorded yet.

Reports are written to [results/](results/).
