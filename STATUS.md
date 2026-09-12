# Status

Who is on what, what the live environment actually holds, and what only a human can unblock. Updated 12 September 2026, 22:30 AEST.

`BOARD.md` stays the source of truth for per-feature status. Do not restate board rows here. This file answers three questions the board does not: who is working on what right now, which keys and URLs are real, and what is waiting on a person.

## People

| Person | Lanes | Where they are up to |
|---|---|---|
| Anna | `fixtures`, `scorecard`, `icp`, `leads`, `outreach`, `live-extraction`, `model-bakeoff` | Fixtures, scorecard, ICP and live extraction are merged. ICP ran end to end on an OpenRouter key alone. Leads and outreach are built and unit-tested but have never run against Origami because the key is still a placeholder. |
| Jeremy | `schema`, `api-skeleton`, `ingest`, `email-ingest`, `extract`, `draft`, `coach-brain`, all five `web-wire-*` lanes, `coach-shell`, `coach-release`, `ci`, `submission` | The secure coach shell and all web wiring, including revision-safe scorecard/playbook actions, are merged and deployed. Cross-platform coach installers and credential-free repository CI are verified on GitHub-hosted runners. `submission` is auditing production; 174 API tests are isolated from developer-shell credentials. Two migrations are merged but not applied to hosted Supabase, so the VPS remains on its tested in-memory store. |
| Max (Maxim Durand) | Clay-style conversations UI foundation | Merged into main on 12 September and since wired to the live pipeline by Jeremy's agent. |
| Romain | Not recorded on the board | No commits under this name and no board rows. Confirm what he is building before Sunday, or reassign `video`, which is still unclaimed. |

## Environment

| Thing | Where | State |
|---|---|---|
| Production UI | https://slipstream-hackathon.vercel.app | Vercel deployment `dpl_4X3TfZG4iKX62YiRmaYbGjVAJrwU` is Ready from `main` at `510e49a`; call, email, Intelligence and lead routes return successfully |
| Production API | https://slipstream-api.3-104-149-193.sslip.io | Live at exact revision `510e49a`; readiness healthy, CORS verified, storage `memory`, integration flags false |
| API environment file | `/etc/slipstream/api.env` on the VPS, root owned, 0600 | Loaded by the systemd unit. Every key the API needs has to exist here as well as locally |
| Local API environment | `api/.env`, 0600, gitignored | Created 12 September. Supabase and ElevenLabs filled, Origami and OpenAI blank |
| Hosted database | Supabase | Only migration `20260912000000` is applied. `20260912010000_email_ingestion` and `20260912020000_scorecard_persistence` are merged but never pushed, so the email and scorecard functions do not exist live |
| Repository CI | GitHub Actions | Main revision `d876e5c` passed web lint/build, 174 API tests plus Ruff, fixture validation plus six tests, and coach tests/build without annotations in run `34694007012` |
| Coach installers | GitHub Actions | Main revision `d876e5c` produced retained unsigned Linux, macOS and Windows artifacts in run `34694011356`; signing/notarisation remains intentionally unconfigured |

## Keys

Personal accounts only. Nothing from a work or company account touches this project, including credentials, infrastructure and stored knowledge.

| Key | Whose | State |
|---|---|---|
| `ELEVENLABS_API_KEY` | Anna | Present locally |
| `ORIGAMI_API_KEY` | Jeremy's paid account | Still a placeholder comment in the shared `.env`. Blocks the live leads run |
| `OPENROUTER_API_KEY` | Anna | Working. Reasoning and embeddings both fall back to OpenRouter when no native key is set, verified live on the ICP derivation |
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

Embeddings are noise at this volume. Origami credits are the only variable cost that matters, charged per row, which is why every search starts at ten.

## Needs a person

1. Apply the two unapplied migrations to the hosted Supabase project with `supabase db push`. Until then any deployed call to the email or scorecard functions fails.
2. Get the real Origami key from Jeremy into `api/.env` and `/etc/slipstream/api.env`, then restart the API. Leads and outreach cannot run live without it.
3. Confirm what Romain is building, or reassign the `video` row.
4. Regenerate the demo call audio once ElevenLabs credits allow, with `generate_audio.py --demo`.
5. Decide the fate of `feat/scorecard-wire` on origin: it is superseded by the scorecard store that merged with PR #4 and must not be merged as is; port its list, derive-over-all and latest-playbook endpoints or delete it. Details under Follow-ups in `docs/architecture.md`.
6. Record and publish the 3-to-5-minute demo video, paste its public URL into `README.md`, and submit the external form. This is the only submission check an unattended coding agent cannot truthfully complete.
