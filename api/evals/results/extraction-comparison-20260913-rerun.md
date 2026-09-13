# Extraction eval comparison

| model | contact_name | contact_email | company_name | company_headcount | deal_amount | next_step | promises | objection_handling | grounded | parse failures | mean latency | total cost | cost/call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| anthropic/claude-haiku-4.5 | 100% | 100% | 100% | 92% | 62% | 69% | 69% | 23% | 100% | 0 | 10587 ms | $0.1675 | $0.0129 |
| anthropic/claude-sonnet-5 | 69% | 69% | 69% | 62% | 69% | 38% | 54% | 38% | 69% | 4 | 30820 ms | $0.4387 | $0.0337 |
| anthropic/claude-opus-5 | 85% | 85% | 85% | 77% | 77% | 54% | 69% | 15% | 85% | 2 | 26894 ms | $1.1899 | $0.0915 |
| openai/gpt-5.4 | 100% | 100% | 100% | 92% | 54% | 69% | 100% | 23% | 100% | 0 | 10282 ms | $0.3875 | $0.0298 |

## Decision
No model was picked.
