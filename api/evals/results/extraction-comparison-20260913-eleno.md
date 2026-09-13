# Extraction eval comparison

| model | contact_name | contact_email | company_name | company_headcount | deal_amount | next_step | promises | objection_handling | grounded | parse failures | mean latency | total cost | cost/call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| mistralai/mistral-medium-3.1 | 92% | 100% | 100% | 85% | 62% | 85% | 77% | 69% | 100% | 0 | 15354 ms | $0.0428 | $0.0033 |
| openai/gpt-5.4 | 100% | 100% | 100% | 85% | 100% | 69% | 69% | 8% | 100% | 0 | 9339 ms | $0.3951 | $0.0304 |

## Decision
No model was picked.
