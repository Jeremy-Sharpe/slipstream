# Demo video fallback

This folder contains the exact narration and browser choreography for the public fallback
demo. It captures only the production URL and does not need provider credentials or mutate
delivery state. A teammate may replace the published fallback with a human-presented cut.

## Render

1. Install Playwright without changing the repository lockfile:
   `npm install --no-save --package-lock=false playwright@1.55.0`
2. Install its Chromium build: `npx playwright@1.55.0 install chromium`
3. Run `node docs/video/capture.mjs`; the script prints the recorded WebM path.
4. Synthesize `narration.txt` with Piper `en_US-lessac-medium`, `--length-scale 1.30` and `--sentence-silence 0.2`.
5. Normalize narration to -16 LUFS and combine it with the WebM as H.264/AAC, stopping at the shorter stream.
6. Verify that the result is 3–5 minutes, 1440×900, has audible narration, and shows the
   paused live campaign with zero sends before publishing it.

The published asset is a safety net for submission, not evidence that unconfigured model,
Origami, CRM receiver, or email-delivery credentials are installed.

## Published fallback

- URL: https://github.com/Jeremy-Sharpe/slipstream/releases/download/demo-video-v2/slipstream-demo-v2.mp4
- Duration: 3 minutes 48 seconds
- Format: H.264 video at 1440×900, mono AAC narration
- SHA-256: `150384b4825642c3dcf27093ebd1ecbd795aea17035a2a79a8abdae2ca0c8a12`

Eight sampled frames were visually inspected across the full timeline. Automated media
inspection confirmed both streams, -16.4 dB mean and -1.2 dB peak audio, and no silence
longer than two seconds.
