# Scorecard Comparison

| model | discovery within 1 | discovery exact | next step | objection | talk ratio | parse failures | mean latency ms | total cost USD | cost per call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| anthropic/claude-haiku-4.5 | 100.0% | 58.3% | 91.7% | 58.3% | 100.0% | 0 | 9250.75 | $0.068312 | $0.005693 |
| anthropic/claude-sonnet-5 | 100.0% | 50.0% | 83.3% | 58.3% | 100.0% | 0 | 23672.17 | $0.356694 | $0.029725 |
| anthropic/claude-opus-5 | 100.0% | 50.0% | 91.7% | 58.3% | 100.0% | 0 | 19435.00 | $0.691700 | $0.057642 |
| openai/gpt-5.4-nano | 83.3% | 58.3% | 91.7% | 66.7% | 100.0% | 0 | 4208.83 | $0.013572 | $0.001131 |
| openai/gpt-5.4-mini | 100.0% | 25.0% | 83.3% | 50.0% | 100.0% | 0 | 3598.25 | $0.052987 | $0.004416 |
| openai/gpt-5.4 | 100.0% | 50.0% | 100.0% | 75.0% | 100.0% | 0 | 5341.42 | $0.177895 | $0.014825 |
| deepseek/deepseek-v3.2 | 100.0% | 50.0% | 91.7% | 75.0% | 100.0% | 0 | 17409.25 | $0.007403 | $0.000617 |
| qwen/qwen3.6-27b | 25.0% | 16.7% | 25.0% | 25.0% | 25.0% | 9 | 27010.58 | $0.040759 | $0.003397 |
| meta-llama/llama-4-maverick | 75.0% | 25.0% | 83.3% | 50.0% | 100.0% | 0 | 14429.50 | $0.016623 | $0.001385 |
| moonshotai/kimi-k2.6 | 25.0% | 16.7% | 25.0% | 0.0% | 25.0% | 9 | 59318.67 | $0.099877 | $0.008323 |
| mistralai/mistral-medium-3.1 | 100.0% | 41.7% | 75.0% | 50.0% | 100.0% | 0 | 3871.58 | $0.018389 | $0.001532 |

## Decision

Pick: `deepseek/deepseek-v3.2`.
Runners-up within spread: openai/gpt-5.4.
`anthropic/claude-haiku-4.5` ruled out by: objection.
`anthropic/claude-sonnet-5` ruled out by: next_step, objection.
`anthropic/claude-opus-5` ruled out by: objection.
`openai/gpt-5.4-nano` ruled out by: discovery_tolerance.
`openai/gpt-5.4-mini` ruled out by: next_step, objection.
`qwen/qwen3.6-27b` ruled out by: discovery_tolerance, next_step, objection.
`meta-llama/llama-4-maverick` ruled out by: discovery_tolerance, next_step, objection.
`moonshotai/kimi-k2.6` ruled out by: discovery_tolerance, next_step, objection.
`mistralai/mistral-medium-3.1` ruled out by: next_step, objection.