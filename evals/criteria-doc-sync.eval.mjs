import { readFile } from "node:fs/promises";
import path from "node:path";
import { CRITERIA } from "./criteria.mjs";
import { REPO_ROOT } from "./lib/repo.mjs";

// The rubric lives in three places: the organisers' wording in
// docs/hackathon.md, the judge data in evals/criteria.mjs, and the human table
// in docs/judging-evals.md. This keeps them from drifting apart.
export default {
  name: "criteria-doc-sync",
  kind: "deterministic",

  async check() {
    const table = await readFile(path.join(REPO_ROOT, "docs", "judging-evals.md"), "utf8");
    const rubric = await readFile(path.join(REPO_ROOT, "docs", "hackathon.md"), "utf8");
    const results = [];

    for (const c of CRITERIA) {
      const row = new RegExp(`^\\|\\s*${c.id}\\s*\\|.*\\|\\s*${c.points}\\s*\\|\\s*${c.target}\\s*\\|`, "m");
      results.push({ name: `${c.id} row in docs/judging-evals.md matches points ${c.points} and target ${c.target}`, pass: row.test(table) });

      const heading = new RegExp(`\\*\\*${escape(c.name)}: ${c.points} points\\.\\*\\*`);
      results.push({ name: `${c.id} ${c.name} worth ${c.points} points in docs/hackathon.md`, pass: heading.test(rubric) });

      for (const band of c.bands) {
        results.push({ name: `${c.id} band "${band.slice(0, 12)}" is verbatim in docs/hackathon.md`, pass: rubric.includes(`- ${band}`), detail: rubric.includes(`- ${band}`) ? undefined : band });
      }
    }

    const idsInTable = [...table.matchAll(/^\|\s*([TIBF]\d)\s*\|/gm)].map((m) => m[1]);
    const unknown = idsInTable.filter((id) => !CRITERIA.some((c) => c.id === id));
    results.push({ name: "every criterion row in the table exists in evals/criteria.mjs", pass: unknown.length === 0, detail: unknown.join(", ") || undefined });

    const prelim = CRITERIA.filter((c) => !c.id.startsWith("F")).reduce((sum, c) => sum + c.points, 0);
    const finals = CRITERIA.filter((c) => c.id.startsWith("F")).reduce((sum, c) => sum + c.points, 0);
    results.push({ name: "preliminary criteria sum to 80 points", pass: prelim === 80, detail: String(prelim) });
    results.push({ name: "finals criteria sum to 20 points", pass: finals === 20, detail: String(finals) });

    return results;
  },
};

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
