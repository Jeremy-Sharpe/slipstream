# Model bake-off (parked until the demo loop runs)

Decided 12 September, Anna: run a small evaluation to choose the model for each AI step, include cheap open-weight models, and put the result in the video and README. Parked until the loop works end to end so nobody spends the weekend tuning models on a product that does not exist yet. This is the artefact for the "Use of Data / Models" criterion (6 points: deliberate choices with reasoning and some evaluation).

## What gets measured

Inputs: the 13 labelled fixture calls in `fixtures/` (12 history calls plus the demo call). Every model runs the same three prompts per call.

| Task | Grading | Metric |
|---|---|---|
| CRM extraction (contact, company, deal outcome, promises, objections, next step) | Programmatic against `expected.json` | Field accuracy, JSON validity |
| Scorecard (discovery count, next step secured, objection handling) | Programmatic against `expected.json` | Label agreement, discovery count within 1 |
| Risk flags (the five planted claims in the demo call, zero in the other twelve) | Programmatic | Precision and recall; the twelve clean calls are the negatives |

Recorded per call regardless: latency, input and output tokens, cost from the price table below, whether the output parsed.

Later, if time allows: a pairwise blind judge for the follow-up email draft (no single right answer, so a judge reads the transcript and two anonymised drafts and picks the better one against a short rubric: accurate to the call, next step stated, no invented promises, appropriate length). Judge model is not one of the models under test.

## Candidate models

Two or three from each vendor at different price tiers, then the open-weight models, which are the ones we most want to know about because they are the cheapest to run in production.

| Vendor | Models | Price per 1M tokens (in / out), verified 12 Sep 2026 |
|---|---|---|
| Anthropic | Haiku 4.5, Sonnet 5, Opus 5 | $1 / $5, $2 / $10, $5 / $25 |
| OpenAI | GPT-5.4-nano, GPT-5.4-mini, GPT-5.4 | $0.20 / $1.25, $0.75 / $4.50, $2.50 / $15 |
| Open weight | Three or four via OpenRouter: current Llama, Qwen, DeepSeek and Mistral or Kimi releases | To verify on openrouter.ai/models at run time; typically well under $1 / $1 |

OpenRouter gives one OpenAI-compatible endpoint and one key for every open model, so the harness needs two clients (Anthropic SDK, OpenAI SDK pointed at either OpenAI or OpenRouter), not ten. Exact open-model IDs and prices are checked the day we run, not recalled.

## Why repeats matter, in plain terms

Models are not deterministic: the same prompt can give a different answer each time. With only 13 calls, one run is a noisy score. If model A gets 11 of 13 right and model B gets 10 of 13, that gap is a single call, and the next run could flip it. Repeating the run three times gives each model a mean and a spread; if two models' spreads overlap, the honest result is "tied", and the cheaper one wins. Repeats cost linearly, so the plan is one full run across all models, then three repeats only on the demo call, where the risk-flag result matters most for the video.

## Cost estimate

Assumption: about 39 calls per model at roughly 2k input and 400 output tokens. One full run over ten models is under $10; thinking-heavy flagships could double their share. Three repeats on the demo call add under $2. If wrong, the harness prints spend per model as it goes and stops at a cap set in the config.

## Prerequisites

- Anthropic API key (personal account) in `evals/models/.env`.
- OpenAI key (already on Anna's machine).
- OpenRouter key (personal account, a few dollars of credit).
- The extraction, scorecard and risk-flag prompts from `api/app/prompts/` once Jeremy's lanes land, so the eval tests the prompts the product actually uses.

## Output

`evals/models/RESULTS.md` with the table and a chart image for the video, and the README "Model choices" table updated with the measured numbers and the reasoning for each pick (accuracy first, then cost and latency). The decision rule, stated up front so we cannot fudge it afterwards: pick the cheapest model whose accuracy is within the repeat spread of the best on that task.
