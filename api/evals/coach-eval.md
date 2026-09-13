# Call coach completion eval

The live coach removes a suggestion card from the rep's screen when the model decides the rep asked it or the customer answered it. A wrong "covered" decision hides a question the rep still needs, so precision matters more than recall here. `run_coach_eval.py` checks that decision against the configured model with ten hand-written turns: three that should complete the card and seven that must not (negation, quoted speech, a hypothetical, an unfinished question, an unknown speaker, a customer offering rather than answering, and a customer repeating an unsupported claim).

Each case seeds the same card ("What budget have you set aside?"), appends one committed turn, runs one real analysis through `app/services/coach_reasoning.py` and applies it through the same `apply_analysis` guards the live session uses. No expected label enters the model context.

```sh
cd api && PYTHONPATH=. uv run python evals/run_coach_eval.py
```

## Results, 13 September 2026

Model `openai/gpt-5.4` through OpenRouter. Latency is one analysis call from Melbourne, including network.

| Run | Prompt | Code guards | Correct | Precision | Recall | Median latency | Slowest |
|---|---|---|---|---|---|---|---|
| 1 | `coach-session-v1.md` | quote, role, confidence | 8/10 | 0.60 (3 of 5) | 1.00 | 3.2 s | 6.1 s |
| 2 | `coach-session-v2.md` | plus: a quoted question is never an answer | 9/10 | 0.75 (3 of 4) | 1.00 | 2.7 s | 4.0 s |
| 3 | `coach-session-v2.md` | plus: trailing-off speech never completes | 10/10 | 1.00 (3 of 3) | 1.00 | 2.8 s | 3.9 s |

Run 1 marked "If I asked what your budget was, would that be too early?" as asked and the customer's "Would you like to know our budget?" as answered. Prompt v2 spells out that talking about asking is not asking and offering information is not answering, and a deterministic guard rejects an answer whose quoted evidence is itself a question. Run 2 then marked the unfinished "What budget have you… actually, let us discuss the renewal first." as asked, which run 1 had handled; a second guard now rejects evidence that trails off with an ellipsis. Both guards have unit tests in `api/tests/test_coach_sessions.py`, so they hold regardless of what the model returns.

## Decisions and limits

- `gpt-5.4` stays the coach model: it is the model production already uses, every analysis finished under 6.2 s, and recall stayed at 1.00 in all three runs. The analysis timeout was raised from 5 s to 10 s after run 1 measured 6.1 s; a slower result is still applied, while a result that predates a rep action is discarded.
- This is a spot check, not a benchmark: ten cases, one run per configuration, one card, English only, typed text rather than Scribe output. Run-to-run model variation is visible between runs 1 and 2. The earlier plan's target of 95% precision and 90% recall needs a larger labelled set of paraphrases and real transcripts before it can be claimed.
- It does not measure suggestion quality (whether the next question is useful), transcription accuracy or end-to-end delay from speech to card; those need live calls.
