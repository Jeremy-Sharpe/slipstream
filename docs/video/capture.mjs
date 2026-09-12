import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "playwright";

const baseUrl = process.env.SLIPSTREAM_WEB_URL ?? "https://slipstream-hackathon.vercel.app";
const outputDir = resolve(process.env.SLIPSTREAM_VIDEO_DIR ?? ".artifacts/demo-video");
const viewport = { width: 1440, height: 900 };

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  colorScheme: "light",
  deviceScaleFactor: 1,
  recordVideo: { dir: outputDir, size: viewport },
  viewport,
});
const page = await context.newPage();

async function settle(milliseconds = 2_000) {
  await page.waitForLoadState("domcontentloaded");
  await page.addStyleTag({
    content: "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}",
  });
  await page.waitForTimeout(milliseconds);
}

async function open(path, pause) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await settle(pause);
}

async function card(kicker, title, body, pause) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;width:100vw;height:100vh;display:grid;place-items:center;
    background:#fff;color:#121826;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    main{width:1080px;border:1px solid #e5e7eb;border-radius:24px;padding:72px;box-shadow:0 24px 80px #0f172a14}
    .brand{font-size:28px;font-weight:800;margin-bottom:70px}.bolt,.kicker{color:#ff5a3d}
    .kicker{font-size:18px;font-weight:750;letter-spacing:.08em;text-transform:uppercase}
    h1{font-size:64px;line-height:1.02;letter-spacing:-.045em;margin:18px 0 24px;max-width:920px}
    p{font-size:27px;line-height:1.5;color:#536078;max-width:900px;margin:0}
  </style></head><body><main><div class="brand"><span class="bolt">ϟ</span> slipstream</div>
  <div class="kicker">${kicker}</div><h1>${title}</h1><p>${body}</p></main></body></html>`;
  await page.goto(`data:text/html,${encodeURIComponent(html)}`);
  await page.waitForTimeout(pause);
}

await card(
  "Hackathon walkthrough",
  "The sales layer that makes every conversation useful.",
  "Calls and email in. Evidence-backed CRM updates, follow-up, intelligence, leads and safe campaigns out.",
  14_000,
);

await open("/", 24_000);
await page.mouse.move(520, 320, { steps: 24 });
await page.waitForTimeout(4_000);
await page.mouse.click(520, 320);
await settle(34_000);

for (const y of [640, 1_420, 2_300]) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "smooth" }), y);
  await page.waitForTimeout(14_000);
}

await open("/intelligence", 28_000);
await page.evaluate(() => window.scrollTo({ top: 650, behavior: "smooth" }));
await page.waitForTimeout(18_000);

await open("/leads", 34_000);
await page.mouse.move(1_122, 23, { steps: 20 });
await page.waitForTimeout(4_000);

await open("/campaigns", 25_000);
const campaign = page.getByText("Hackathon demo — intentionally unsent", { exact: true });
if (await campaign.isVisible()) {
  await campaign.click();
}
await page.waitForTimeout(13_000);

await card(
  "Slipstream",
  "Conversation → CRM → follow-up → intelligence → pipeline",
  "Evidence stays attached. Human approval stays explicit. Provider actions fail closed.",
  14_000,
);

const video = page.video();
await context.close();
await browser.close();
console.log(await video.path());

