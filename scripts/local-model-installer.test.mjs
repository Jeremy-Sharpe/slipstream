import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const installerUrl = new URL("../deploy/local-model/install.sh", import.meta.url);

test("installer cleanup orders enablement-link removal before fresh unit removal", async () => {
  const installer = await readFile(installerUrl, "utf8");
  const cleanupStart = installer.indexOf("cleanup_install() {");
  const disableReasoning = installer.indexOf(
    "systemctl disable slipstream-local-model.service || rollback_failed=1",
    cleanupStart,
  );
  const removeReasoning = installer.indexOf('rm -f "$reasoning_unit"', cleanupStart);
  const disableEmbedding = installer.indexOf(
    "systemctl disable slipstream-local-embedding.service || rollback_failed=1",
    cleanupStart,
  );
  const removeEmbedding = installer.indexOf('rm -f "$embedding_unit"', cleanupStart);

  assert.ok(cleanupStart >= 0, "installer must define transactional cleanup");
  assert.ok(disableReasoning > cleanupStart, "cleanup must disable the reasoning unit");
  assert.ok(disableEmbedding > cleanupStart, "cleanup must disable the embedding unit");
  assert.ok(
    disableReasoning < removeReasoning,
    "cleanup must remove reasoning enablement links before deleting a fresh unit",
  );
  assert.ok(
    disableEmbedding < removeEmbedding,
    "cleanup must remove embedding enablement links before deleting a fresh unit",
  );
});

test("installer source contract serializes mutations and retains rollback evidence", async () => {
  const installer = await readFile(installerUrl, "utf8");
  const lock = installer.indexOf("flock --nonblock 9");
  const firstMutation = installer.indexOf('install -d -m 0755 -o root -g root "$MODEL_DIR"');

  assert.ok(lock >= 0 && lock < firstMutation, "installer lock must precede shared mutations");
  assert.match(installer, /enabled-runtime\)\s+systemctl disable "\$unit" && systemctl enable --runtime/);
  assert.match(installer, /Rollback was incomplete; recovery backups remain at \$backup_dir/);
});
