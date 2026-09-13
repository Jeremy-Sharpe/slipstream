# Slipstream Fixtures

This directory contains the labelled synthetic call set for Slipstream. The calls are written as realistic Australian phone conversations, then validated against Pydantic models and cross-checks so the extraction, scorecard, coach and ICP lanes can be judged against stable expected outputs.

## Seller

The seller is Eleno, a Melbourne team of specialist AI and automation engineers who discover, build, deploy and manage custom AI agents and workflow automation for growing Australian businesses, mainly non-bank lenders, financial services firms, real estate agencies and auction houses, and who transfer the IP to the client rather than selling a subscription. Eleno is a real company and a sponsor of the hackathon this repo was built for; the description in `seller.json` is taken from its public website. Everything else about the seller in these fixtures is a demo assumption, not a fact about Eleno: the team size, the pricing bands, the reps and every call.

The reps are fictional personas and never Eleno staff: Sam Whitfield, who does patient discovery and secures clear next steps, and Jordan Lee, who is newer and sometimes pitches before qualifying the prospect. The demo call uses a third fictional persona, Jordan Belfort, whose job is to trip the coach's risk flags.

## Real clients

`crm/clients.json` lists the seven clients Eleno showcases publicly (Bell Potter, Leonard Joel, Denning Investment Partners, Ark Capital, Gorman Commercial, Nichols Crowder and North East Link). The API loads them as won CRM deals with no call, no email, no contact person, no headcount and no deal value, so the derived ICP can count their industries without anything being invented about them. Their domains are reserved `.example` domains, never their real ones. The validator fails if any of these names appears in a call script or label, and if a row carries a contact, headcount or amount.

## Segment

The twelve history calls cluster won deals around Eleno's public segments: a quantitative investment research boutique, a non-bank commercial lender, a financial planning firm, a commercial real estate agency and an auction house, all with 25 to 80 staff, a concrete workflow trigger, and a decision maker or operations lead on the call. The lost calls are small creative or retail businesses with no urgent trigger and price-led buying behaviour, while the stalled calls have real interest but weak buying access, timing or governance friction. The thirteenth call is the video demo call: a funny, fictional high-pressure Jordan Belfort and Donnie Azoff win that should light up the coach risk flags rather than train the ICP. It is deliberately separate from the two ordinary reps in `seller.json`.

## Outcome Mix

| Demo | Outcome | Count | Pattern |
|---|---|---:|---|
| false | won | 5 | Financial services, lending, property and auctions, 25 to 80 staff, real trigger, dated next step |
| false | stalled | 3 | Interest exists, but governance, missing decision makers or budget timing blocks progress |
| false | lost | 3 | Small price-led accounts or early pitching with no urgent trigger |
| false | no_show | 1 | Short reschedule message rather than a sales conversation |
| true | won | 1 | High-pressure video demo call with a strong ICP fit but deliberately risky sales behaviour |

## Layout

Each call sits under `calls/<call_id>/` with `script.json` and `expected.json`. The script contains metadata plus ordered turns, and the expected file contains the labelled CRM extraction, scorecard, objection handling, ICP signals and optional coach risk flags. `emails/icp-evidence.json` holds the one inbound email that enriches a won deal, and `crm/clients.json` holds the real-client deals described above.

## Labelling Rule

The validator computes talk ratio directly from script words, counting words by speaker and rounding to two decimals. Discovery questions are labelled with the same heuristic the scorecard eval uses: count rep turns that end in a question mark before the first turn that contains a pricing marker such as `$`, `AUD`, `per seat`, `per user` or `monthly fee`. The `AUD` marker has no word boundary, so any word containing those letters (audit, audio, fraud, audience) also ends the count; won and stalled scripts keep such words out of the discovery section. The validator allows a tolerance of one discovery question so human labels can survive minor transcript wording differences, but the expected files match the heuristic exactly.

## Validate

Run validation from this directory:

```bash
UV_OFFLINE=1 uv run python validate.py
```

Run the tests:

```bash
UV_OFFLINE=1 uv run pytest -q
```

The validator enforces schema validity, folder and id consistency, exact history outcome mix, exactly one demo call, expected text evidence, talk ratio drift, discovery count drift, next-step consistency, demo risk flags, word count bounds, turn length bounds, the forbidden brand string check, the seller staff name check and the real-client name check.

## Generate Audio

First run the demo dry run, which works offline and makes no API calls:

```bash
UV_OFFLINE=1 uv run python generate_audio.py --dry-run --demo
```

The other twelve calls are text-only CRM history seeded through the ingest path without audio. Generate audio for `demo: true` calls first, because the video only needs `call-13-marlowe-finch-demo/audio.mp3`.

To generate audio, create `fixtures/.env` with `ELEVENLABS_API_KEY`, check the voice ids in `seller.json`, then run:

```bash
uv run python generate_audio.py --demo
```

Use `--only <call_id>` for one call, omit `--demo` to plan or generate the full set, and use `--force` to regenerate an existing `audio.mp3`. The generator chunks dialogue to at most 1,800 characters per request, calls ElevenLabs text-to-dialogue with model `eleven_v3`, writes temporary chunk files beside each call, concatenates them with `/opt/homebrew/bin/ffmpeg`, and records the measured `audio_seconds` back into `script.json`.

To list available voices once a key is present:

```bash
uv run python generate_audio.py --list-voices
```
