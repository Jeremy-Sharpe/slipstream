import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function readUiCalls() {
  const source = await readFile(path.join(root, "lib/data/calls.ts"), "utf8");
  const declaration = source.indexOf("= [");
  const start = declaration < 0 ? -1 : declaration + 2;
  const end = source.lastIndexOf("];\n\nexport const callById");
  assert.notEqual(start, -1, "generated call array starts with [");
  assert.notEqual(end, -1, "generated call array has the expected export boundary");
  return JSON.parse(source.slice(start, end + 1));
}

test("voiced demo call UI stays aligned with its canonical fixture", async () => {
  const [calls, script, expected] = await Promise.all([
    readUiCalls(),
    readJson("fixtures/calls/call-13-marlowe-finch-demo/script.json"),
    readJson("fixtures/calls/call-13-marlowe-finch-demo/expected.json"),
  ]);
  const call = calls.find(({ id }) => id === script.call_id);
  assert.ok(call, `UI contains ${script.call_id}`);

  assert.deepEqual(
    {
      rep: call.rep,
      prospect: call.prospect,
      company: call.company,
      domain: call.domain,
      at: call.at,
      durationSeconds: call.durationSeconds,
      outcome: call.outcome,
      trigger: call.trigger,
    },
    {
      rep: script.rep,
      prospect: script.prospect.name,
      company: script.company.name,
      domain: script.company.domain,
      at: script.scheduled_at,
      durationSeconds: script.duration_target_seconds,
      outcome: script.outcome,
      trigger: script.trigger,
    },
  );
  assert.deepEqual(
    call.turns.map(({ speaker, name, text }) => ({ speaker, name, text })),
    script.turns,
  );
  assert.equal(call.extraction.contact.name.value, expected.extraction.contact.name);
  assert.equal(call.extraction.contact.email.value, expected.extraction.contact.email);
  assert.equal(call.extraction.nextStep.value, expected.extraction.next_step.description);
  assert.equal(call.scorecard.notes, expected.scorecard.notes);
  assert.match(call.draft.body, new RegExp(`Hi ${script.prospect.name.split(" ")[0]},`));
  assert.match(call.draft.body, new RegExp(`${script.rep}$`));
  assert.doesNotMatch(JSON.stringify(call), /Dev Patel|Jordan Lee|dev@marlowefinch\.example/);
});
