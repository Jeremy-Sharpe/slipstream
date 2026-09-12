import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const candidates = [
  process.env.HG_STACK,
  resolve(process.cwd(), "..", "hourglass-claude-stack"),
  resolve(homedir(), "projects", "hourglass-claude-stack"),
  resolve(homedir(), "repos", "hourglass-claude-stack"),
].filter(Boolean);

const runner = candidates
  .map((root) => resolve(root, "hg-evals", "bin", "hg-evals.mjs"))
  .find(existsSync);

if (!runner) {
  console.error(
    "Cannot find hourglass-claude-stack. Set HG_STACK to its checkout directory.",
  );
  process.exit(2);
}

const result = spawnSync(process.execPath, [runner, "run", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(2);
}
process.exit(result.status ?? 2);
