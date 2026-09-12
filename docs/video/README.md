# Demo video fallback

This folder contains the exact narration and browser choreography for the public fallback
demo. It captures only the production URL and does not need provider credentials or mutate
delivery state. A teammate may replace the published fallback with a human-presented cut.

## Render

1. Install Playwright without changing the repository lockfile:
   `npm install --no-save --package-lock=false playwright@1.55.0`
2. Install its Chromium build: `npx playwright@1.55.0 install chromium`
3. Run `node docs/video/capture.mjs`; the script prints the recorded WebM path.
4. Synthesize `narration.txt` with a local voice and combine it with the WebM as H.264/AAC.
5. Verify that the result is 3–5 minutes, 1440×900, has audible narration, and shows the
   paused live campaign with zero sends before publishing it.

The published asset is a safety net for submission, not evidence that unconfigured model,
Origami, CRM receiver, or email-delivery credentials are installed.

## Published fallback

- URL: https://github.com/Jeremy-Sharpe/slipstream/releases/download/demo-video-v1/slipstream-demo.mp4
- Duration: 4 minutes 30 seconds
- Format: H.264 video at 1440×900, mono AAC narration
- SHA-256: `6510e912c28c597268c5a1aac18fa35e4397a53b26a9b8828f86e772fe6b1d7b`

Nine sampled frames were visually inspected across the full timeline. Automated media
inspection confirmed both streams, normalized audio around -16.5 dB mean, and no silence
longer than two seconds before the closing three-and-a-half-second tail.
