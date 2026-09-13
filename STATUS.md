# Status

Who is on what, what the live environment actually holds, and what only a human can unblock. Updated 13 September 2026.

`BOARD.md` stays the source of truth for per-feature status. Do not restate board rows here. This file answers three questions the board does not: who is working on what right now, which keys and URLs are real, and what is waiting on a person.

## People

| Person | Lanes | Where they are up to |
|---|---|---|
| Anna | `fixtures`, `scorecard`, `icp`, `leads`, `outreach`, `live-extraction`, `model-bakeoff` | Fixtures, scorecard, ICP and live extraction are merged. Her work now feeds the OpenRouter-only demo bootstrap; the optional real Origami adapter remains untested with a credential. |
| Jeremy | `schema`, `api-skeleton`, `ingest`, `email-ingest`, `extract`, `draft`, `coach-brain`, all five `web-wire-*` lanes, `coach-shell`, `coach-release`, `ci`, `playbook-store`, `submission`, `revenue-dna-freshness`, `judge-value-proof`, `revenue-dna-shock-test`, `web-vps-fallback` | Product code and automated submission evidence are merged. Production runs OpenRouter `mistralai/mistral-medium-3.1` reasoning (the bake-off pick, switched from `openai/gpt-5.4` on 13 September) with `text-embedding-3-small`, serves ten safe fictional prospects for the latest ICP and a safely paused campaign, and remains memory-backed. Revenue DNA proves the targeting cohort is current and gates stale searches. The newest UI is independently hosted, production-smoked and browser-checked at desktop and phone widths. 367 API tests and 47 smoke tests pass; the latest targeted scores imply 75/80 preliminary and 20/20 final-round points, or 95/100 combined. |
| Max (Maxim Durand) | Clay-style conversations UI foundation; separate `feat/one-thread` prototype | The foundation is merged and wired to the live pipeline. The later branch was reviewed on 13 September: it has unrelated Git history and replaces the integrated product with a static three-route prototype, so it is retained as a visual reference rather than merged. Its sticky run timeline concept is already covered by the live detail view's sticky CRM evidence and timeline. |
| Romain | Not recorded on the board | No commits under this name and no board rows. The automated fallback video is already public; the remaining team-owned action is submitting the external form or optionally recording a human-presented replacement. |

## Environment

| Thing | Where | State |
|---|---|---|
| Production UI | https://slipstream.3-104-149-193.sslip.io | Standalone Next web revision `7b37118` is live behind Caddy and includes the value cards, outcome shock and complete five-route phone-width polish. Full production contract smoke passes; a real Chromium click propagated a hypothetical win across Signal, Detect, Protect and Adapt while confirming live state was unchanged. The service is active with zero restarts. |
| Backup UI | https://slipstream-hackathon.vercel.app | Vercel deployment `dpl_F17QVRsNEv2zMTVq7NXLyzq77xJV` remains healthy but trails the presentation host because the provider's one-day free-deployment quota rejected newer builds. Do not use it for the judged demo until it is promoted after quota reset. |
| Production API | https://slipstream-api.3-104-149-193.sslip.io | Live at exact revision `8111ea6c84cc89acc0675e9716fbcd07eb665e64`; readiness verifies OpenRouter `mistralai/mistral-medium-3.1` reasoning (the bake-off pick, switched from `openai/gpt-5.4` on 13 September at 10:44 UTC by editing `/etc/slipstream/api.env` and restarting; the previous line is kept in `api.env.bak-20260913`) and `text-embedding-3-small`. After the restart the paused demo campaign was re-seeded and the demo bootstrap re-run once, in that order, so the ICP is version 1 with ten current leads. The production smoke with `--exercise-fixture` passed against the Vercel UI on Mistral. The bounded demo evidence endpoint verifies 13 deals, 12 calls, two emails, ten safe fictional prospects and a current Revenue DNA fingerprint. Storage is `memory`; Supabase, Origami and delivery remain disabled. |
| API environment file | `/etc/slipstream/api.env` on the VPS, root owned, 0600 | Loaded by the systemd unit. Every key the API needs has to exist here as well as locally |
| Local API environment | `api/.env`, gitignored | Not present in the current workspace. Production secrets exist only in the root-owned VPS environment |
| Hosted database | Supabase | Only migration `20260912000000` is applied. The email, scorecard and playbook persistence migrations are merged but unapplied, so those later tables/functions do not exist live |
| Repository CI | GitHub Actions | Application revision `16520b8` passed web lint/build, 367 API tests plus Ruff, 41 smoke tests, fixture validation, scheduler, coach, all migrations and pgTAP in run `34736562025`; main `3c6014f` then raised only the production-smoke timeout for legitimate hosted-model latency and passed all six jobs. |
| Coach installers | GitHub Actions | Main revision `d876e5c` produced retained unsigned Linux, macOS and Windows artifacts in run `34694011356`; signing/notarisation remains intentionally unconfigured |

## Keys

Personal accounts only. Nothing from a work or company account touches this project, including credentials, infrastructure and stored knowledge.

| Key | Whose | State |
|---|---|---|
| `ELEVENLABS_API_KEY` | Anna | Present locally |
| `ORIGAMI_API_KEY` | Optional customer integration | Not configured and no account was created. It does not block the OpenRouter proof; the real v3 adapter remains available |
| `OPENROUTER_API_KEY` | Deployment secret | Installed only in the root-owned VPS environment and verified without printing or committing it. Powers reasoning, embeddings and the fictional lead proof. The account behind it ran dry on 13 September during the model rerun (HTTP 402) and Anna topped it up to $20.00 the same afternoon; $12.79 of credit remained after the rerun, with $8.15 left under the key's own $15.00 limit, and the key expires 19 September |
| `OPENAI_API_KEY` | Anna | Key created and valid, account has no credits. Optional now that OpenRouter covers embeddings |
| `ANTHROPIC_API_KEY` | Anna | Not created. Only needed if the bake-off runs Claude models natively rather than through OpenRouter |

Never share a key in the group chat. Each person can create their own on their own account, and only the production copy on the VPS needs to move between people.

## Measured costs

Derived from the fixtures on 12 September, not estimated. The 13 call scripts average 1,808 tokens each, and the pipeline makes three reasoning calls per call.

| Item | Cost |
|---|---|
| One full pipeline pass over 13 fixtures, 39 calls on a flagship model | $0.43 |
| One extraction on `openai/gpt-5.4` through OpenRouter, billed 13 September over 13 calls | $0.030 |
| One extraction on `mistralai/mistral-medium-3.1` through OpenRouter, billed 12 September over 13 calls | $0.0034 |
| The 13 September model rerun: Haiku 4.5, Sonnet 5 twice, Opus 5, gpt-5.4, 65 calls | $3.53 |
| One ICP derivation | $0.02 |
| Embeddings for 13 deals and 10 leads | under $0.001 |
| One bake-off run across the three OpenAI tiers | $0.60 |
| A weekend of development at five full passes | about $3 |

Embeddings are noise at this volume. The public proof caps generation at ten fictional leads and reuses a current cohort instead of repeatedly spending on unchanged evidence.

## Needs a person

1. Apply the eight unapplied migrations to the hosted Supabase project with `supabase db push`. Until then durable email, scorecard, playbook, ICP and campaign storage is unavailable.
2. Submit the external form before the deadline. The public 4:30 fallback video is already linked; optionally replace it with a human-presented cut first.


## Operational notes

- The API host is reachable over the team tailnet as `agent-vps` (Tailscale SSH as `ubuntu`, passwordless sudo); the public IP has port 22 closed. A restart wipes memory storage, so the recovery order is: seed the demo campaign (`scripts/seed-demo-campaign.mjs` on the box with the ingest token from `api.env`), then one `POST /api/v1/demo/bootstrap`. Bootstrapping before seeding leaves the ICP stale and the evidence endpoint `incomplete`.
- `npm run smoke:production -- --exercise-fixture` must target the Vercel UI: the presentation host has no `/campaigns` route, so the smoke's campaign-page check returns 404 there.
