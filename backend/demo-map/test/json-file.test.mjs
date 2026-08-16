import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readJsonFile } from "../src/json-file.mjs";

test("JSON file reader returns parsed values", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-json-file-"));
  const path = join(root, "valid.json");
  await writeFile(path, '{"ok":true}', "utf8");
  assert.deepEqual(await readJsonFile(path, "test manifest"), { ok: true });
});

test("JSON file reader classifies read and parse failures", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-json-file-"));
  const invalidPath = join(root, "invalid.json");
  await writeFile(invalidPath, "{", "utf8");
  await assert.rejects(readJsonFile(join(root, "missing.json"), "runtime package"), /Unable to read runtime package/);
  await assert.rejects(readJsonFile(invalidPath, "runtime package"), /Invalid JSON in runtime package/);
});
