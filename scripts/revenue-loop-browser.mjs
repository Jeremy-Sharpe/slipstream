import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 3119;
const base = `http://127.0.0.1:${port}`;
const api = "https://slipstream-api.3-104-149-193.sslip.io";
const ready = { revision: "browser-check", environment: "production", storage: "memory", integrations: {}, reasoning_provider: "local", reasoning_model: "qwen-test", embedding_provider: "local", embedding_model: "nomic-test" };
const icp = { id: "icp-check", version: 1, profile: { summary: "Observed wins", industries: ["Professional services", "Allied health"], headcount_band: "25-80", roles: ["Founder"], triggers: ["Renewal"], confidence: 0.9, origami_brief: "Find similar firms", source_summary: { deals: 3, calls: 2, emails: 1, outcome_labelled: 3 } }, evidence: ["industry", "headcount_band", "contact_role", "trigger"].map((attribute) => ({ attribute, deal_ids: ["deal-1"], why: "Won deals support it" })) };
const campaigns = [{ id: "83b2a7b2-1ace-4dc5-b90a-d0dba9d2ed4c", name: "Hackathon demo — intentionally unsent", status: "paused", scheduled_for: "2099-01-01T00:00:00Z", created_by: "fixture", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", counts: { queued: 1, running: 0, sent: 0, retryable: 0, failed: 0, reconcile: 0 }, items: [{ position: 0, draft_id: "draft-1", state: "queued", outcome: null, http_status: null, detail: null, retryable: false, reconciliation_required: false, receipt: null, attempt_count: 0, next_attempt_at: "2099-01-01T00:00:00Z", last_attempt_at: null }] }];

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(`${base}/legacy/demo`)).ok) return; } catch { /* server is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Next production server did not start");
}

function mockApi(page, shouldFail) {
  return page.route(`${api}/**`, (route) => {
    if (shouldFail()) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "offline" }) });
    const url = route.request().url();
    const body = url.endsWith("/ready") ? ready : url.includes("/icp/latest") ? icp : url.includes("/campaigns?") ? campaigns : null;
    return route.fulfill({ status: body ? 200 : 503, contentType: "application/json", body: JSON.stringify(body ?? { detail: "not mocked" }), headers: { "access-control-allow-origin": "*" } });
  });
}

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: "ignore" });
try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 800, height: 800 }, reducedMotion: "no-preference" });
    const page = await context.newPage();
    let failRefresh = false;
    await mockApi(page, () => failRefresh);
    await page.goto(`${base}/legacy/demo`);
    await page.getByText("Connected", { exact: true }).waitFor();

    await page.getByRole("button", { name: "Play guided loop" }).click();
    assert.match(await page.locator('[aria-current="step"]').innerText(), /One sales call/);
    await page.waitForTimeout(1900);
    assert.match(await page.locator('[aria-current="step"]').innerText(), /CRM writes itself/);
    await page.getByRole("button", { name: "Pause guided loop" }).click();
    await page.waitForTimeout(1900);
    assert.match(await page.locator('[aria-current="step"]').innerText(), /CRM writes itself/);
    await page.getByRole("button", { name: "Resume guided loop" }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(1900);
    assert.match(await page.locator('[aria-current="step"]').innerText(), /CRM writes itself/, "enabling reduced motion stops active playback");
    await page.getByRole("button", { name: "Next step" }).click();
    assert.match(await page.locator('[aria-current="step"]').innerText(), /Safe follow-up/);

    const verticalBeforeReveal = await page.evaluate(() => window.scrollY);
    await page.getByRole("button", { name: "Show complete loop" }).click();
    await page.waitForTimeout(100);
    const revealBounds = await page.locator('[aria-current="step"]').evaluate((step) => {
      const viewport = step.parentElement?.parentElement;
      if (!viewport) return null;
      const item = step.getBoundingClientRect(); const bounds = viewport.getBoundingClientRect();
      return { itemLeft: item.left, itemRight: item.right, viewportLeft: bounds.left, viewportRight: bounds.right, scrollLeft: viewport.scrollLeft };
    });
    assert.ok(revealBounds && revealBounds.itemLeft >= revealBounds.viewportLeft - 1 && revealBounds.itemRight <= revealBounds.viewportRight + 1, `the active horizontal step is revealed: ${JSON.stringify(revealBounds)}`);
    assert.equal(await page.evaluate(() => window.scrollY), verticalBeforeReveal, "horizontal reveal preserves the page's vertical position");
    await page.getByRole("button", { name: /One sales call/ }).click();
    await page.waitForTimeout(100);
    const firstRevealed = await page.locator('[aria-current="step"]').evaluate((step) => { const viewport = step.parentElement?.parentElement; if (!viewport) return false; const item = step.getBoundingClientRect(); const bounds = viewport.getBoundingClientRect(); return item.left >= bounds.left - 1 && item.right <= bounds.right + 1; });
    assert.equal(firstRevealed, true, "backward navigation reveals the first step without clipping");
    assert.equal(await page.evaluate(() => window.scrollY), verticalBeforeReveal, "backward horizontal reveal preserves vertical position");

    const links = [
      [/One sales call/, "Open transcript", "#transcript"], [/CRM writes itself/, "Inspect CRM evidence", "#crm-writeback"], [/Safe follow-up/, "Review exact draft", "#follow-up-draft"], [/The team compounds/, "See win patterns", "#patterns"], [/ICP emerges/, "Open cited ICP", "#icp"], [/Next search writes itself/, "Open search brief", "#brief"], [/Outreach stays controlled/, "Inspect exact execution", "#delivery-execution"],
    ];
    for (const [stepName, linkName, hash] of links) {
      await page.getByRole("button", { name: stepName }).click();
      await page.getByRole("link", { name: linkName }).click();
      await page.waitForURL((url) => url.hash === hash);
      await page.locator(hash).waitFor({ state: "visible" });
      await page.waitForTimeout(100);
      const intersectsViewport = await page.locator(hash).evaluate((element) => { const bounds = element.getBoundingClientRect(); return bounds.top < window.innerHeight && bounds.bottom > 0; });
      assert.equal(intersectsViewport, true, `${hash} intersects the viewport after following its evidence link`);
      await page.goBack();
      await page.waitForURL(`${base}/legacy/demo`);
      await page.locator('[aria-current="step"]').waitFor();
      assert.match(await page.locator('[aria-current="step"]').innerText(), stepName, "presenter selection restores after evidence navigation");
    }

    failRefresh = true;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.getByText("Proof unavailable", { exact: true }).first().waitFor();
    await context.close();

    const denied = await browser.newContext();
    await denied.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException("denied"); }; Storage.prototype.setItem = () => { throw new DOMException("denied"); }; });
    const deniedPage = await denied.newPage();
    await mockApi(deniedPage, () => true);
    await deniedPage.goto(`${base}/legacy/demo`);
    await deniedPage.getByRole("button", { name: "Play guided loop" }).click();
    assert.match(await deniedPage.locator('[aria-current="step"]').innerText(), /One sales call/);
    await denied.close();
  } finally { await browser.close(); }
  console.log("Revenue Loop browser checks passed");
} finally { server.kill("SIGTERM"); }
