import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { parseVerdict } from "../evals/lib/judge.mjs";
import {
  PRODUCTION_API_SURFACES,
  fetchProductionSurfaces,
  productionApiUrl,
  readmeField,
  renderProductionSurfaces,
} from "../evals/lib/repo.mjs";

test("judge evidence includes the live OpenRouter aggregate-to-lead proof", () => {
  assert.equal(
    PRODUCTION_API_SURFACES.some(({ path }) => path === "/api/v1/demo/evidence"),
    true,
  );
  assert.equal(
    PRODUCTION_API_SURFACES.some(({ path }) => path === "/api/v1/integrations/verify"),
    true,
  );
});

test("production evidence fetches and labels every requested public route", async (t) => {
  const server = createServer((request, response) => {
    response.writeHead(200, { "content-type": "text/html" });
    response.end(
      `<html><body><h1>${request.url}</h1><p>visible route evidence</p>` +
        `<script>secret implementation noise</script></body></html>`,
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const requested = [
    { label: "Landing", path: "/" },
    { label: "Deep route", path: "/deep" },
  ];

  const surfaces = await fetchProductionSurfaces(baseUrl, requested);
  const rendered = renderProductionSurfaces(baseUrl, surfaces);

  assert.equal(surfaces.length, 2);
  assert.match(rendered, /## Landing[\s\S]*URL: http:\/\/127\.0\.0\.1:\d+\/[\s\S]*visible route evidence/);
  assert.match(rendered, /## Deep route[\s\S]*visible route evidence/);
  assert.doesNotMatch(rendered, /secret implementation noise/);
  assert.equal(surfaces.every(({ snapshot }) => snapshot.ok), true);
});

test("verdict parser accepts brace characters inside final evidence strings", () => {
  const verdict = {
    criterion: "T3",
    score: 6,
    band: "5-6: Clean, modular, well-documented.",
    evidence: ["api/app/{routers,services,schemas}: clear boundaries"],
    gaps: [],
  };
  const output = `Assessment prose with another {brace}.\n\n${JSON.stringify(verdict)}`;

  assert.deepEqual(parseVerdict(output), verdict);
});

test("production evidence reports an invalid base URL without aborting the eval", async () => {
  const surfaces = await fetchProductionSurfaces("not a URL", [
    { label: "Landing", path: "/" },
  ]);

  assert.equal(surfaces[0].snapshot.ok, false);
  assert.match(surfaces[0].snapshot.note, /invalid production URL/);
});

test("verdict parser accepts a pretty-printed final JSON object", () => {
  const verdict = {
    criterion: "T3",
    score: 5,
    evidence: ["components/{feature}/index.ts"],
    gaps: ["none"],
  };

  assert.deepEqual(parseVerdict(`Notes first.\n${JSON.stringify(verdict, null, 2)}`), verdict);
});

test("verdict parser accepts an explicit final score when a judge omits JSON", () => {
  const verdict = parseVerdict(
    'Assessment complete. Final score already delivered: **T1 = 8/10**, band "8: Strong".',
    { id: "T1", points: 10 },
  );

  assert.equal(verdict.criterion, "T1");
  assert.equal(verdict.score, 8);
  assert.match(verdict.band, /prose fallback/);
});

test("verdict parser does not infer a score from ordinary assessment prose", () => {
  assert.equal(
    parseVerdict("T1 could move from 6/10 to 8/10 with a better demo.", { id: "T1", points: 10 }),
    null,
  );
});

test("production API is discoverable from README with an environment override", () => {
  const readme = "Production API: https://api.example.test\n";
  assert.equal(readmeField(readme, "productionApi"), "https://api.example.test");
  assert.equal(productionApiUrl(readme), process.env.SLIPSTREAM_API_URL || "https://api.example.test");
});
