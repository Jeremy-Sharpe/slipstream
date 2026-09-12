import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deployDir = path.join(root, "deploy", "supabase");

test("Supabase VPS scripts are syntactically valid and pin a private runtime", async () => {
  const installer = path.join(deployDir, "install.sh");
  const starter = path.join(deployDir, "slipstream-supabase-start");
  await execFileAsync("bash", ["-n", installer, starter]);

  const [startSource, dropIn] = await Promise.all([
    readFile(starter, "utf8"),
    readFile(path.join(deployDir, "slipstream-api-supabase.conf"), "utf8"),
  ]);
  assert.match(startSource, /SUPABASE_VERSION="2\.117\.0"/);
  assert.match(startSource, /api_url" == "http:\/\/127\.0\.0\.1:54321"/);
  assert.match(startSource, /published a database port beyond loopback/);
  assert.match(startSource, /supabase migration up --local/);
  assert.match(dropIn, /Requires=slipstream-supabase\.service/);
  assert.match(dropIn, /EnvironmentFile=\/etc\/slipstream\/supabase\.env/);
  assert.doesNotMatch(startSource, /eyJ[A-Za-z0-9._-]{20,}/);
});
