import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 3119;
const base = `http://127.0.0.1:${port}`;
const api = "https://slipstream-api.3-104-149-193.sslip.io";
const endpoints = {
  ready: `${api}/ready`,
  icp: `${api}/api/v1/icp/latest`,
  campaigns: `${api}/api/v1/campaigns?limit=50`,
};

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(`${base}/demo`)).ok) return; } catch { /* server is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Next production server did not start");
}

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: "ignore" });
try {
  await waitForServer();
  const live = Object.fromEntries(await Promise.all(Object.entries(endpoints).map(async ([key, url]) => {
    const response = await fetch(url);
    assert.equal(response.ok, true, `${key} fixture endpoint is available`);
    return [key, await response.json()];
  })));
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 800, height: 800 } });
    await context.addInitScript(() => {
      let reduced = false;
      const listeners = new Set();
      window.matchMedia = () => ({ get matches() { return reduced; }, media: "(prefers-reduced-motion: reduce)", onchange: null, addListener: (fn) => listeners.add(fn), removeListener: (fn) => listeners.delete(fn), addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn), dispatchEvent: () => true });
      window.__setReducedMotion = (value) => { reduced = value; for (const listener of listeners) listener({ matches: value }); };
    });
    const page = await context.newPage();
    let failRefresh = false;
    await page.route(`${api}/**`, async (route) => {
      if (failRefresh) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "offline" }) });
      const url = route.request().url();
      const body = url.endsWith("/ready") ? live.ready : url.includes("/icp/latest") ? live.icp : live.campaigns;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body), headers: { "access-control-allow-origin": "*" } });
    });
    await page.goto(`${base}/demo`);
    await page.getByText("Connected", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Play guided loop" }).click();
    assert.match(await page.locator('[aria-current="step"]').innerText(), /One sales call/);
    await page.waitForTimeout(1900);
    assert.match(await page.locator('[aria-current="step"]').innerText(), /CRM writes itself/);
    await page.getByRole("button", { name: "Pause guided loop" }).click();
    await page.waitForTimeout(1900);
    assert.match(await page.locator('[aria-current="step"]').innerText(), /CRM writes itself/);
    await page.evaluate(() => window.__setReducedMotion(true));
    await page.getByRole("button", { name: "Next step" }).click();
    assert.match(await page.locator('[aria-current="step"]').innerText(), /Safe follow-up/);
    await page.getByRole("button", { name: "Show complete loop" }).click();
    const revealed = await page.locator('[aria-current="step"]').evaluate((step) => {
      const viewport = step.parentElement?.parentElement;
      if (!viewport) return false;
      const item = step.getBoundingClientRect(); const bounds = viewport.getBoundingClientRect();
      return item.left >= bounds.left - 1 && item.right <= bounds.right + 1;
    });
    assert.equal(revealed, true, "the active horizontal step is revealed");
    failRefresh = true;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.getByText("Proof unavailable", { exact: true }).first().waitFor();

    for (const target of ["/conversations/call-01-northstar-labs#transcript", "/conversations/call-01-northstar-labs#crm-writeback", "/conversations/call-01-northstar-labs#follow-up-draft", "/intelligence#patterns", "/intelligence#icp", "/intelligence#brief", "/campaigns#delivery-execution"]) {
      await page.goto(`${base}${target}`);
      assert.equal(await page.evaluate(() => document.querySelector(window.location.hash) != null), true, `${target} renders its fragment target`);
    }
    await context.close();

    const denied = await browser.newContext();
    await denied.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException("denied"); }; Storage.prototype.setItem = () => { throw new DOMException("denied"); }; });
    const deniedPage = await denied.newPage();
    await deniedPage.route(`${api}/**`, (route) => route.fulfill({ status: 503, body: "{}" }));
    await deniedPage.goto(`${base}/demo`);
    await deniedPage.getByRole("button", { name: "Play guided loop" }).click();
    assert.match(await deniedPage.locator('[aria-current="step"]').innerText(), /One sales call/);
    await denied.close();
  } finally { await browser.close(); }
  console.log("Revenue Loop browser checks passed");
} finally {
  server.kill("SIGTERM");
}
