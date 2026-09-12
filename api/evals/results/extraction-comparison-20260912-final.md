# Extraction eval comparison

| model | contact_name | contact_email | company_name | company_headcount | deal_amount | next_step | promises | objection_handling | grounded | parse failures | mean latency | total cost | cost/call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| openai/gpt-5.4-nano | 85% | 92% | 100% | 85% | 69% | 77% | 77% | 23% | 100% | 0 | 9321 ms | not billed | not billed |
| openai/gpt-5.4-mini | 100% | 100% | 100% | 92% | 62% | 69% | 100% | 46% | 100% | 0 | 7299 ms | not billed | not billed |
| openai/gpt-5.4 | 100% | 100% | 100% | 92% | 54% | 62% | 100% | 15% | 100% | 0 | 8760 ms | not billed | not billed |
| deepseek/deepseek-v3.2 | 92% | 92% | 92% | 85% | 69% | 62% | 69% | 23% | 92% | 1 | 29709 ms | $0.0176 | $0.0014 |
| meta-llama/llama-4-maverick | 100% | 100% | 85% | 85% | 85% | 69% | 31% | 23% | 100% | 0 | 14103 ms | $0.0168 | $0.0013 |
| mistralai/mistral-medium-3.1 | 92% | 100% | 92% | 92% | 100% | 69% | 92% | 54% | 100% | 0 | 7405 ms | $0.0448 | $0.0034 |
| anthropic/claude-haiku-4.5 | 62% | 62% | 62% | 62% | 23% | 46% | 46% | 15% | 62% | 5 | 10539 ms | $0.1059 | $0.0081 |

## Decision
Pick: mistralai/mistral-medium-3.1 (misses the 75% judged-check gate).
