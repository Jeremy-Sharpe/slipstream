# Slipstream call coach

An original MIT Electron companion for calls in other apps. It opens at the top right, stays above the calling app, can be moved/resized/collapsed, and shows customer-specific questions and approved talking points. The backend tracks what was asked, answered, mentioned, skipped and completed across the whole session.

## Run locally

Start the API from `api/` using the existing `uv sync` and `uv run uvicorn app.main:app --reload` commands. Configure `api/.env` with an ElevenLabs key for speech and a supported reasoning provider key. Select the model using the existing `REASONING_MODEL` setting (for example a supported Claude model with `ANTHROPIC_API_KEY`). Set `INGEST_TOKEN` when enabling paid providers. The application fails visibly if a provider is unavailable; it does not substitute a canned coaching script.

In the web application's `.env.local`, set:

```dotenv
API_BASE_URL=http://localhost:8000
INGEST_TOKEN=the-same-server-token-as-the-api
```

Neither setting is exposed to browser JavaScript. Without `API_BASE_URL` the proxy uses the same API as the rest of the website (`NEXT_PUBLIC_API_BASE_URL`, then the production API). Run the Next.js app normally, then start the desktop coach:

The same code runs on any deployment; only environment variables change. On a hosted web server set `INGEST_TOKEN` to the API's value, and set `API_BASE_URL` to where that server reaches the API. If that address only works inside the server (for example `http://127.0.0.1:8000` on the VPS), also set `COACH_PUBLIC_API_URL` to the API's public HTTPS origin, because the desktop coach connects from the rep's computer. The website proxy lives at `/gateway/coach` so a host that routes `/api/*` to the API still reaches it. Every launch link carries the public API and website origins, so a packaged coach follows whichever deployment created the session with no manual settings; it accepts only HTTPS origins or local development addresses, and shows the coaching server before listening starts.

```sh
cd coach
npm ci
npm start
```

In Slipstream, press **Start call with coach** in the top bar, enter who you are calling and choose what the coach should listen to, then press **Prepare coach**. Open the desktop link or paste it into the coach. Check the coach's API and website connection settings match the web app. Click **Start listening** to request capture permissions and begin audio.

The first target is Apple silicon macOS with native system audio capture (macOS 14.2+). The app must have microphone and system-audio permission. Use the packaged app for the real capture test: terminal-launched Electron can inherit different macOS permission behaviour. Audio meters detect actual samples, and prolonged silence is visible. The complete OS permission/capture matrix has not been certified yet.

## Controls

- Drag the header or resize the window edges. Reset position restores a visible top-right window. A−/A+ provide keyboard-accessible resizing.
- Collapse keeps listening. `Cmd/Ctrl+Shift+Space` hides/shows the window; the tray indicator still shows capture state.
- Pause stops microphone and system capture and flushes outstanding speech. `Cmd/Ctrl+Shift+P` toggles pause/resume.
- Done and Skip advance a suggestion; Undo restores the previous manually dismissed item.
- End stops capture, waits for final transcript acknowledgements, processes the recording and saves a canonical call. Failed recording processing offers retry or saving the available live transcript. An unconfirmed final speech warning means the retained recording may contain speech absent from that transcript.
- The coached-call page (`/coach/<id>`, opened by **Review call**) follows the call while it is live, then shows what happened to each suggestion, the evidence quotes and the commitments heard.

## Data and transport

The web proxy keeps the API ingest token on the server. A ten-minute single-use handoff establishes a scoped desktop capability with a 24-hour lifetime. Recovery credentials are stored using Electron safeStorage when available. Failed handoffs are kept separate from active calls and can be replaced.

Capture runs at 16 kHz signed little-endian PCM. Microphone and system audio use separate Scribe realtime connections and short-lived provider tokens minted by the API. Only committed transcript events go to the coach WebSocket. This reuses the existing API transport rather than introducing another audio relay. The local mixed PCM recording becomes a WAV for batch transcription and upload; the recording limit is 50 MB (approximately 26 minutes). Calls can be saved from live transcripts if recording upload is unavailable.

Both-source mode treats the microphone as rep and system audio as customer. Headphones reduce duplicate audio. Speakerphone and single-source modes use unknown attribution, so automatic speaker-dependent completion is conservative and manual controls remain available. Noise/echo and overlapping participants still need live evaluation.

The website currently starts every session from customer details the rep enters, so advice comes from those details, the approved seller profile and the live call. The API also accepts existing Supabase contact and deal IDs, and without Supabase it uses synthetic fixture identities and in-memory session storage; the website picker for those arrives with CRM history. The active customer's fixture answers and demo outcome are held out. Comparable calls supply evidence, never approval to repeat an unsupported claim. Mentions require a literal approved seller excerpt. The current approved source is `fixtures/seller.json`; a managed product-knowledge UI is a future extension.

With Supabase, apply `supabase/migrations/20260913040000_coach_sessions.sql` after the existing migrations. It creates private session/event tables, a version-checked save function and a private recording bucket. This migration has been parsed but has not been applied to a hosted database by this implementation. Without Supabase, restarting the API loses sessions; restarting the companion preserves its transcript outbox but cannot reconstruct a lost server session.

Run one API worker for the demo, matching the existing architecture. Database version checks protect stale saves; live socket ownership and model concurrency limits are process-local. Real customer use still requires the project's tenant/auth/retention work. The web app and existing CRM policies are an unauthenticated synthetic-data demo.

When the API stores recordings (Supabase configured), the local copy is removed once the call is saved; with the in-memory API the recording stays on the computer for export. Recording stops at the 50 MB limit (about 26 minutes) while coaching continues, and that call is saved from the live transcript. If the server has lost the session, for example after an API restart, End marks the call finished locally so another call can start, and the recording stays available to export. A crash can leave a local recording until recovery/cleanup. The final call uses batch transcript segments when recording processing succeeds and otherwise the committed live transcript; live provenance and coaching events remain in the session. Downstream extraction/review is handled by the existing API lane.

## Verify

```sh
# From repository root
cd api && uv run pytest
uv run ruff check app/services/coach_*.py app/routers/coach_sessions.py tests/test_coach_sessions.py
# Explicit paid evaluation, after configuring a reasoning provider
PYTHONPATH=. uv run python evals/run_coach_eval.py

# From coach/
npm test
npm run package
```

From the repository root, run `npx tsc --noEmit`, `npm run lint`, and `npm run build`. In environments where Turbopack cannot bind its worker port, `npx next build --webpack` verifies the production build.

The semantic evaluation tests paraphrased questions, volunteered answers, negation, quoted speech, unfinished questions and unknown speaker roles. Report its actual precision/recall and latency before claiming automatic-completion quality. Unit tests verify state/transport contracts; they are not evidence of live model quality.

## Distribution and outstanding live checks

`npm run package` produces `dist/mac-arm64/Slipstream Coach.app`. `npm run dist` creates a DMG, and the Coach installers GitHub Actions workflow runs the tests and builds that DMG on macOS. Every build is unsigned. General distribution requires a Developer ID certificate, signing/notarisation, a download location and a tested installation flow.

Before the live demo, verify actual microphone/system audio with the packaged app, headphones, Zoom/Meet or the intended call app, and full-screen/multiple displays. Run provider-backed coaching and the semantic eval, exercise network interruption and call-end upload, apply the database migration, deploy the new API endpoints and point the hosted website/companion to that API. No deployment, hosted migration, paid model evaluation or real audio capture is claimed by the local test suite.
