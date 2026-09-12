# Slipstream Fixtures

This directory contains the labelled synthetic call set for Slipstream. The calls are written as realistic Australian phone conversations, then validated against Pydantic models and cross-checks so the extraction, scorecard, coach and ICP lanes can be judged against stable expected outputs.

## Seller

The fictional seller is Harbourline IT, a 12-person managed IT and cybersecurity provider in Melbourne. Harbourline sells managed services agreements to 15 to 120 person firms, usually AUD $90 to $160 per seat per month plus a fixed onboarding project. The reps are Sam Whitfield, who does patient discovery and secures clear next steps, and Jordan Lee, who is newer and sometimes pitches before qualifying the prospect.

## Segment

The twelve history calls deliberately cluster won deals around professional services and allied health businesses with 25 to 80 staff, a concrete buying trigger, and a decision maker or practice manager on the call. The lost calls are small creative or retail businesses with no urgent trigger and price-led buying behaviour, while the stalled calls have real interest but weak buying access, timing or procurement friction. The thirteenth call is the video demo call: a funny high-pressure Jordan Lee win that should light up the coach risk flags rather than train the ICP.

## Outcome Mix

| Demo | Outcome | Count | Pattern |
|---|---|---:|---|
| false | won | 5 | Professional services and allied health, 25 to 80 staff, real trigger, dated next step |
| false | stalled | 3 | Interest exists, but procurement, missing decision makers or budget timing blocks progress |
| false | lost | 3 | Small price-led accounts or early pitching with no urgent trigger |
| false | no_show | 1 | Short reschedule message rather than a sales conversation |
| true | won | 1 | High-pressure video demo call with a strong ICP fit but deliberately risky sales behaviour |

## Layout

Each call sits under `calls/<call_id>/` with `script.json` and `expected.json`. The script contains metadata plus ordered turns, and the expected file contains the labelled CRM extraction, scorecard, objection handling, ICP signals and optional coach risk flags.

## Labelling Rule

The validator computes talk ratio directly from script words, counting words by speaker and rounding to two decimals. Discovery questions are labelled with the same heuristic the scorecard eval uses: count rep turns that end in a question mark before the first turn that contains a pricing marker such as `$`, `AUD`, `per seat`, `per user` or `monthly fee`. The validator allows a tolerance of one discovery question so human labels can survive minor transcript wording differences, but the expected files currently match the heuristic exactly.

## Validate

Run validation from this directory:

```bash
UV_OFFLINE=1 uv run python validate.py
```

Run the tests:

```bash
UV_OFFLINE=1 uv run pytest -q
```

The validator enforces schema validity, folder and id consistency, exact history outcome mix, exactly one demo call, expected text evidence, talk ratio drift, discovery count drift, next-step consistency, demo risk flags, word count bounds, turn length bounds and the forbidden brand string check.

## Generate Audio

First run the demo dry run, which works offline and makes no API calls:

```bash
UV_OFFLINE=1 uv run python generate_audio.py --dry-run --demo
```

The other twelve calls are text-only CRM history seeded through the ingest path without audio. Generate audio for `demo: true` calls first, because the video only needs `call-13-marlowe-finch-demo/audio.mp3`.

To generate audio later, copy `.env.example` if one exists or create `fixtures/.env`, set `ELEVENLABS_API_KEY`, replace the placeholder voice ids in `seller.json`, then run:

```bash
uv run python generate_audio.py --demo
```

Use `--only <call_id>` for one call, omit `--demo` to plan or generate the full set, and use `--force` to regenerate an existing `audio.mp3`. The generator chunks dialogue to at most 1,800 characters per request, calls ElevenLabs text-to-dialogue with model `eleven_v3`, writes temporary chunk files beside each call, concatenates them with `/opt/homebrew/bin/ffmpeg`, and records `audio_seconds` back into `script.json`.

To list available voices once a key is present:

```bash
uv run python generate_audio.py --list-voices
```
