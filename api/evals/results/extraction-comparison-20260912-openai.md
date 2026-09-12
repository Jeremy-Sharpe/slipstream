# Extraction eval comparison

| model | contact_name | contact_email | company_name | company_headcount | deal_amount | next_step | promises | objection_handling | grounded | parse failures | mean latency | total cost | cost/call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| openai/gpt-5.4-nano | 85% | 92% | 100% | 85% | 69% | 77% | 77% | 23% | 100% | 0 | 9321 ms | not billed | not billed |
| openai/gpt-5.4-mini | 100% | 100% | 100% | 92% | 62% | 69% | 100% | 46% | 100% | 0 | 7299 ms | not billed | not billed |
| openai/gpt-5.4 | 100% | 100% | 100% | 92% | 54% | 62% | 100% | 15% | 100% | 0 | 8760 ms | not billed | not billed |

## Decision
Pick: openai/gpt-5.4-mini (misses the 75% judged-check gate).
Cost was not billed for any model; eligible models were sorted by latency.
