import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// The eval scenarios and criteria live in this repo; the generic runner that
// executes them does not. Point EVALS_RUNNER at the runner script, or write
// its path into an untracked .evals-runner file at the repo root.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pointerFile = resolve(repoRoot, ".evals-runner");

const runner = [
  process.env.EVALS_RUNNER,
  existsSync(pointerFile) ? readFileSync(pointerFile, "utf8").trim() : null,
]
  .filter(Boolean)
  .map((value) => resolve(repoRoot, value))
  .find(existsSync);

if (!runner) {
  console.error(
    "Cannot find the eval runner. Set EVALS_RUNNER to its path, or write that path into .evals-runner at the repo root.",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const reportDir = args.includes("--report-dir") ? [] : ["--report-dir", ".eval-reports"];

const result = spawnSync(process.execPath, [runner, "run", ...reportDir, ...args], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(2);
}
process.exit(result.status ?? 2);
