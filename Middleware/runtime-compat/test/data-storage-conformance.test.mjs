import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { LocalGameStorage, RuntimeDataStorage, RuntimeQueryList } from "../../../Frontend/demo-map/src/runtime/game-storage.mjs";
import { dataStorageContract } from "../conformance/data-storage.mjs";

test("local data storage preserves the recovered object and ReturnValue shape", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-conformance-"));
  const storage = new LocalGameStorage({ file: join(root, "storage.json") });
  const space = storage.getDataStorage("players");
  assert.ok(space instanceof RuntimeDataStorage);
  await space.set("guest", { score: 1 });
  const value = await space.get("guest");
  assert.deepEqual(Object.keys(value).sort(), [...dataStorageContract.returnValueFields].sort());
});

test("local QueryList uses page-index cursor and retains the final nonempty page", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-query-conformance-"));
  const storage = new LocalGameStorage({ file: join(root, "storage.json") });
  const space = storage.getDataStorage("scores");
  await space.set("a", 1);
  await space.set("b", 2);
  const query = await space.list({ cursor: 1, pageSize: 1, ascending: true });
  assert.ok(query instanceof RuntimeQueryList);
  assert.equal(query.getCurrentPage()[0].key, "b");
  const last = query.getCurrentPage();
  await query.nextPage();
  assert.equal(query.isLastPage, true);
  assert.deepEqual(query.getCurrentPage(), last);
});

test("storage conformance records cloud and query gaps without claiming compatibility", () => {
  assert.deepEqual(dataStorageContract.listOptionsImplemented, ["cursor", "pageSize", "constraintTarget", "ascending", "min", "max"]);
  assert.deepEqual(dataStorageContract.listOptionsUnresolved, ["mixed-type backend ordering"]);
  assert.ok(dataStorageContract.unresolved.some(item => item.includes("distributed update atomicity")));
  assert.equal(dataStorageContract.localScope, "project-file");
});

test("local list applies recovered constraint target fallback and numeric range semantics", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-list-constraints-"));
  const warnings = [];
  const storage = new LocalGameStorage({ file: join(root, "storage.json"), logger: { warn(message) { warnings.push(message); } } });
  const space = storage.getDataStorage("scores");
  await space.set("a", { stats: { score: 1 } });
  await space.set("b", { stats: { score: 7 } });
  await space.set("fallback", 4);
  const query = await space.list({ cursor: 0, pageSize: 1000, constraintTarget: "stats.score", min: 3, max: 8, ascending: true });
  assert.deepEqual(query.getCurrentPage().map(item => item.key), ["fallback", "b"]);
  assert.equal(query.isLastPage, true);
  assert.equal(warnings.length, 1);
});

test("local mutation queue prevents same-process update and increment loss", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-mutation-queue-"));
  const storage = new LocalGameStorage({ file: join(root, "storage.json") });
  const space = storage.getDataStorage("atomic");
  await space.set("count", 0);
  const results = await Promise.all(Array.from({ length: 12 }, () => space.increment("count")));
  assert.deepEqual(results, Array.from({ length: 12 }, (_, index) => index + 1));
  await space.set("update", 0);
  await Promise.all([
    space.update("update", async previous => { await new Promise(resolve => setTimeout(resolve, 5)); return previous.value + 1; }),
    space.update("update", previous => previous.value + 1),
  ]);
  assert.equal((await space.get("update")).value, 2);
  assert.equal(dataStorageContract.localMutationAtomicity, "single-process-serialized");
});

test("local storage rejects values outside the declared JSONValue union", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-json-conformance-"));
  const storage = new LocalGameStorage({ file: join(root, "storage.json") });
  const space = storage.getDataStorage("json");
  await space.set("valid", ["text", 1, true, { nested: [false] }]);
  const cyclic = {}; cyclic.self = cyclic;
  for (const value of [null, NaN, Infinity, 1n, Symbol("value"), () => {}, new Date(), { value: undefined }, cyclic]) {
    await assert.rejects(() => space.set("invalid", value), /Invalid data value/);
  }
  assert.deepEqual(dataStorageContract.jsonValueTypes, ["string", "finite-number", "boolean", "dense-array", "plain-string-keyed-object"]);
});
