import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("standalone presentation host preserves the API boundary", async () => {
  const [nextConfig, service, caddy] = await Promise.all([
    readFile(new URL("next.config.ts", root), "utf8"),
    readFile(new URL("deploy/web/slipstream-web.service", root), "utf8"),
    readFile(new URL("deploy/web/slipstream-web.caddy", root), "utf8"),
  ]);

  assert.match(nextConfig, /output:\s*["']standalone["']/);
  assert.match(service, /^User=www-data$/m);
  assert.match(service, /^Environment=HOSTNAME=127\.0\.0\.1$/m);
  assert.match(service, /^Environment=PORT=3010$/m);
  assert.match(service, /^WorkingDirectory=\/opt\/slipstream-web\/current$/m);

  assert.match(caddy, /^slipstream\.3-104-149-193\.sslip\.io\s*\{/m);
  assert.match(caddy, /@api path \/ready \/openapi\.json \/api\/\*/);
  assert.ok(
    caddy.indexOf("reverse_proxy 127.0.0.1:8000") < caddy.indexOf("reverse_proxy 127.0.0.1:3010"),
    "the API handler must be declared before the catch-all web handler",
  );
});
