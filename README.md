# Slipstream

Accelerated sales for small B2B teams. Slipstream listens to every sales call, coaches the rep live, writes the call into the CRM with a drafted follow-up, derives the ideal customer profile from the deals that actually closed, and sources new leads that match.

Built for the Forward: AI in Business Hackathon, University of Melbourne, September 2026. Track 1: Improve an Existing Business Capability. Built with ElevenLabs.

- **Live app:** (added at submission)
- **Demo video:** (added at submission)

## Start here

- `PROJECT.md`: the product, the problem, the architecture, the data model, the model choices and how they map to the judging rubric.
- `CLAUDE.md`: the working rules for every contributor and every coding agent.
- `BOARD.md`: who is building what.

## Layout

```
apps/web           Next.js UI (Vercel)
apps/api           FastAPI AI pipeline (Render)
apps/coach         Electron live-coach overlay, forked from Cheating Daddy (GPL-3.0)
packages/fixtures  Synthesised sales calls used as demo data
supabase/          Migrations and seed
```

Run instructions per app are in `CLAUDE.md`. Copy `.env.example` to `.env` in the app you are running.

## Licence

MIT, except `apps/coach`, which is GPL-3.0 (see its own `LICENSE`).
