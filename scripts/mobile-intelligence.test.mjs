import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("intelligence dashboards collapse fixed desktop grids on phones", async () => {
  const [view, header, primitives, sections] = await Promise.all([
    readFile(new URL("components/intelligence/IntelligenceView.tsx", root), "utf8"),
    readFile(new URL("components/intelligence/IntelligenceHeader.tsx", root), "utf8"),
    readFile(new URL("components/intelligence/primitives.tsx", root), "utf8"),
    readFile(new URL("components/intelligence/sections.tsx", root), "utf8"),
  ]);

  assert.match(header, /flex flex-col[^"\n]+sm:flex-row/);
  assert.match(view, /grid grid-cols-2[^"\n]+lg:grid-cols-4/);
  assert.match(primitives, /flex min-h-16 flex-col[^"\n]+sm:flex-row/);
  assert.match(sections, /grid grid-cols-1[^"\n]+sm:grid-cols-3/);
  assert.match(sections, /grid grid-cols-1[^"\n]+md:grid-cols-3/);
  assert.doesNotMatch(sections, /className="grid grid-cols-\[240px_1fr_56px_80px\]/);
});
