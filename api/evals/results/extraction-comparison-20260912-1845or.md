# Extraction eval comparison

| model | contact_name | contact_email | company_name | company_headcount | deal_outcome | deal_amount | next_step | promises | objection_handling | grounded | parse failures | mean latency | total cost | cost/call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| deepseek/deepseek-v3.2 | 92% | 8% | 92% | 85% | 23% | 8% | 62% | 54% | 23% | 92% | 1 | 29709 ms | $0.0176 | $0.0014 |
| meta-llama/llama-4-maverick | 100% | 8% | 85% | 85% | 31% | 8% | 69% | 77% | 23% | 100% | 0 | 14103 ms | $0.0168 | $0.0013 |
| mistralai/mistral-medium-3.1 | 92% | 8% | 92% | 92% | 23% | 8% | 69% | 54% | 54% | 100% | 0 | 7405 ms | $0.0448 | $0.0034 |
| anthropic/claude-haiku-4.5 | 62% | 8% | 62% | 62% | 15% | 8% | 46% | 15% | 15% | 62% | 5 | 10539 ms | $0.1059 | $0.0081 |

## Decision
No model was picked.
