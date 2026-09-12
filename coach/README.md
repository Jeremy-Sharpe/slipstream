# Slipstream Coach

An always-on-top Electron overlay for transparent, consent-based live sales coaching. It connects to Slipstream's deployed coaching WebSocket and, when the server has ElevenLabs credentials, uses a server-issued single-use Scribe token for microphone transcription. No provider API key enters the renderer.

## Run

```bash
npm ci
npm test
npm start
```

The default **Demo transcript** mode needs no provider credentials: enter rep and prospect turns manually, and the deployed API returns deterministic next-move coaching and saves the completed call. **Live rep microphone** mode requests a short-lived token from `POST /api/v1/coach/scribe-token`, captures the rep's microphone through the official ElevenLabs client, and forwards only committed transcript text to Slipstream. Capturing both sides requires a consented mixed call-audio source, which this hackathon build does not claim to provide.

The overlay does not hide itself from screen capture and is intended for calls where recording and coaching consent has been obtained. The optional ingest token is sent only to the Slipstream API through the Electron main process; ElevenLabs receives only its single-use token.

## Build installers

Run `npm run make` inside `coach/` to create an unsigned installer for the current operating system. The `Coach installers` GitHub Actions workflow runs the same locked build and the nine coach tests on Linux, macOS and Windows. Start it manually from Actions or push a `coach-v*` tag; successful installers are retained as workflow artifacts for 14 days.

The hackathon artifacts are intentionally unsigned. macOS Gatekeeper and Windows SmartScreen may warn on first launch; production distribution needs platform signing and notarisation credentials supplied through repository secrets, never committed files.

## Attribution and license

This is a modified adaptation of [sohzm/cheating-daddy](https://github.com/sohzm/cheating-daddy) at revision `3cccc36f5ed63d7116e4bf93566899871e0199dc`. Gemini, interview-answering, screenshot capture, hidden-window behaviour, and upstream storage were removed. The upstream GPL-3.0 license is preserved in [LICENSE](LICENSE), with modification details in [NOTICE](NOTICE).
