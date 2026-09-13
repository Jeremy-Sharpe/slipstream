import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("email delivery keeps HTTP transport separate from its state machine", async () => {
  const [router, service, campaigns, factory] = await Promise.all([
    readFile(new URL("api/app/routers/deliveries.py", root), "utf8"),
    readFile(new URL("api/app/services/deliveries.py", root), "utf8"),
    readFile(new URL("api/app/routers/campaigns.py", root), "utf8"),
    readFile(new URL("api/app/factory.py", root), "utf8"),
  ]);

  assert.ok(router.split("\n").length <= 80, "delivery router should remain transport-only");
  assert.match(router, /from app\.services import deliveries/);
  assert.doesNotMatch(router, /def _claim|def _start_submission|def _complete|def _rollback_before_invocation/);
  assert.match(service, /async def _claim/);
  assert.match(service, /async def _start_submission/);
  assert.match(service, /async def _complete/);
  assert.match(service, /async def _rollback_before_invocation/);
  assert.match(campaigns, /from app\.services import deliveries/);
  assert.match(factory, /deliveries as delivery_service/);
});
