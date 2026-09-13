import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "playwright";

const baseUrl = process.env.SLIPSTREAM_WEB_URL ?? "https://slipstream.3-104-149-193.sslip.io";
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

async function settle(milliseconds) {
  await page.waitForLoadState("domcontentloaded");
  await page.addStyleTag({
    content: "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}",
  });
  await page.waitForTimeout(milliseconds);
}

async function open(path, pause) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 30_000 });
  await settle(pause);
}

async function show(locator, pause) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(pause);
}

// Open on the whole closed loop; there are no slide-only interludes in this cut.
await open("/demo", 18_000);
const play = page.getByRole("button", { name: /play guided loop/i });
if (await play.isVisible()) await play.click();
await page.waitForTimeout(12_000);

// Show one conversation becoming an evidence-backed CRM record and draft.
await open("/conversations/call-01-northstar-labs", 15_000);
await page.evaluate(() => window.scrollTo({ top: 580, behavior: "smooth" }));
await page.waitForTimeout(20_000);
await show(page.locator("#follow-up-draft"), 18_000);

// Lead with the differentiator: outcomes invalidate targeting and protect spend.
await open("/intelligence", 12_000);
await show(page.locator("#revenue-dna"), 8_000);
const wonShock = page.getByRole("button", { name: "New deal won" });
await wonShock.waitFor({ state: "visible", timeout: 15_000 });
await wonShock.click();
await page.getByText("Hypothetical won recorded").waitFor({ state: "visible" });
await page.waitForTimeout(25_000);
await show(page.locator("#icp"), 15_000);

// Show the safe proof leads bound to the current profile.
await open("/leads", 25_000);

// Close the execution loop on the real, deliberately paused campaign record.
await open("/campaigns", 18_000);
const campaign = page.getByText("Hackathon demo — intentionally unsent", { exact: true });
if (await campaign.isVisible()) await campaign.click();
await page.waitForTimeout(8_000);

// Return to the one-screen story and its transparent value scenarios.
await open("/demo", 20_000);
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
await page.waitForTimeout(12_000);

const video = page.video();
await context.close();
await browser.close();
console.log(await video.path());
