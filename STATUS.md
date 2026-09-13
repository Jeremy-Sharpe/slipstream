# Status

Who is on what, what the live environment actually holds, and what only a human can unblock. Updated 13 September 2026.

`BOARD.md` stays the source of truth for per-feature status. Do not restate board rows here. This file answers three questions the board does not: who is working on what right now, which keys and URLs are real, and what is waiting on a person.

## People

| Person | Lanes | Where they are up to |
|---|---|---|
| Anna | `fixtures`, `scorecard`, `icp`, `leads`, `outreach`, `live-extraction`, `model-bakeoff` | Fixtures, scorecard, ICP and live extraction are merged. Her work now feeds the OpenRouter-only demo bootstrap; the optional real Origami adapter remains untested with a credential. |
| Jeremy | `schema`, `api-skeleton`, `ingest`, `email-ingest`, `extract`, `draft`, `coach-brain`, all five `web-wire-*` lanes, `coach-shell`, `coach-release`, `ci`, `playbook-store`, `submission` | Product code and automated submission evidence are merged. Production uses OpenRouter `openai/gpt-5.4` reasoning and `text-embedding-3-small`, serves ten safe fictional prospects for the latest ICP and a safely paused campaign, and remains memory-backed. 363 API tests pass; strict T1 now passes at 8/10. |
| Max (Maxim Durand) | Clay-style conversations UI foundation | Merged into main on 12 September and since wired to the live pipeline by Jeremy's agent. |
| Romain | Not recorded on the board | No commits under this name and no board rows. The automated fallback video is already public; the remaining team-owned action is submitting the external form or optionally recording a human-presented replacement. |

## Environment

| Thing | Where | State |
|---|---|---|
| Production UI | https://slipstream-hackathon.vercel.app | Vercel production deployment `dpl_35iFEtxJ18tBy7kF541UVzLh64HX` serves the PR #51 dynamic Revenue Loop. Its first HTML response already contains OpenRouter, API revision `c342825`, 12 calls plus two emails, ICP v1 and one queued/zero sent; JavaScript is not required to discover the live proof |
| Production API | https://slipstream-api.3-104-149-193.sslip.io | Live at exact revision `c3428258ab461e37b65bee9888527a6d8aaa622a`; readiness verifies OpenRouter `openai/gpt-5.4` reasoning and `text-embedding-3-small`. The bounded demo evidence endpoint verifies 13 deals, 12 calls, two emails and ten safe fictional prospects. Storage is `memory`; Supabase, Origami and delivery remain disabled. Canonical Maya extraction and approved-unsent draft are present. |
| API environment file | `/etc/slipstream/api.env` on the VPS, root owned, 0600 | Loaded by the systemd unit. Every key the API needs has to exist here as well as locally |
| Local API environment | `api/.env`, gitignored | Not present in the current workspace. Production secrets exist only in the root-owned VPS environment |
| Hosted database | Supabase | Only migration `20260912000000` is applied. The email, scorecard and playbook persistence migrations are merged but unapplied, so those later tables/functions do not exist live |
| Repository CI | GitHub Actions | Main revision `c342825` passed web lint/build, 363 API tests plus Ruff, 40 smoke tests, fixture validation, scheduler, coach, all migrations and pgTAP in run `34734911042` |
| Coach installers | GitHub Actions | Main revision `d876e5c` produced retained unsigned Linux, macOS and Windows artifacts in run `34694011356`; signing/notarisation remains intentionally unconfigured |

## Keys

Personal accounts only. Nothing from a work or company account touches this project, including credentials, infrastructure and stored knowledge.

| Key | Whose | State |
|---|---|---|
| `ELEVENLABS_API_KEY` | Anna | Present locally |
| `ORIGAMI_API_KEY` | Optional customer integration | Not configured and no account was created. It does not block the OpenRouter proof; the real v3 adapter remains available |
| `OPENROUTER_API_KEY` | Deployment secret | Installed only in the root-owned VPS environment and verified without printing or committing it. Powers reasoning, embeddings and the fictional lead proof |
| `OPENAI_API_KEY` | Anna | Key created and valid, account has no credits. Optional now that OpenRouter covers embeddings |
| `ANTHROPIC_API_KEY` | Anna | Not created. Only needed if the bake-off runs Claude models natively rather than through OpenRouter |

Never share a key in the group chat. Each person can create their own on their own account, and only the production copy on the VPS needs to move between people.

## Measured costs

Derived from the fixtures on 12 September, not estimated. The 13 call scripts average 1,808 tokens each, and the pipeline makes three reasoning calls per call.

| Item | Cost |
|---|---|
| One full pipeline pass over 13 fixtures, 39 calls on a flagship model | $0.43 |
| One ICP derivation | $0.02 |
| Embeddings for 13 deals and 10 leads | under $0.001 |
| One bake-off run across the three OpenAI tiers | $0.60 |
| A weekend of development at five full passes | about $3 |

Embeddings are noise at this volume. The public proof caps generation at ten fictional leads and reuses a current cohort instead of repeatedly spending on unchanged evidence.

## Needs a person

1. Apply the eight unapplied migrations to the hosted Supabase project with `supabase db push`. Until then durable email, scorecard, playbook, ICP and campaign storage is unavailable.
2. Submit the external form before the deadline. The public 4:30 fallback video is already linked; optionally replace it with a human-presented cut first.
