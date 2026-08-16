import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { LocalGameStorage, RuntimeDataStorage, RuntimeQueryList } from "../src/runtime/game-storage.mjs";

test("implements and persists the recovered GameDataStorage surface", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-"));
  const file = join(root, "storage.json");
  const storage = new LocalGameStorage({ file });
  const space = storage.getDataStorage("players");
  assert.ok(space instanceof RuntimeDataStorage);
  assert.equal(space.key, "players");
  assert.equal(await space.get("guest"), undefined);
  await space.set("guest", { score: 1 });
  const first = await space.get("guest");
  assert.deepEqual(first.value, { score: 1 });
  await space.update("guest", previous => ({ score: previous.value.score + 1 }));
  assert.deepEqual((await space.get("guest")).value, { score: 2 });
  assert.equal(await space.increment("wins", 2), 2);
  assert.equal(await space.increment("wins"), 3);
  const list = await space.list({ cursor: 0, pageSize: 1 });
  assert.ok(list instanceof RuntimeQueryList);
  assert.equal(list.getCurrentPage().length, 1);
  assert.equal(list.isLastPage, false);
  await list.nextPage();
  assert.equal(list.getCurrentPage().length, 1);
  const lastPage = list.getCurrentPage();
  await list.nextPage();
  assert.equal(list.isLastPage, true);
  assert.deepEqual(list.getCurrentPage(), lastPage);
  assert.ok(JSON.parse(await readFile(file, "utf8")).spaces.players);
  assert.equal((await space.remove("wins")).value, 3);
  await space.destroy();
  assert.deepEqual((await storage.getDataStorage("players").list()).getCurrentPage(), []);
  assert.equal(storage.getGroupStorage("shared"), undefined);
});

test("treats list cursor as a page index and only sorts when requested", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-pages-"));
  const storage = new LocalGameStorage({ file: join(root, "storage.json") });
  const space = storage.getDataStorage("pages");
  await space.set("b", 2);
  await space.set("a", 1);
  await space.set("c", 3);
  const second = await space.list({ cursor: 1, pageSize: 1, ascending: true });
  assert.equal(second.getCurrentPage()[0].key, "b");
  const natural = await space.list({ cursor: 0, pageSize: 3 });
  assert.deepEqual(natural.getCurrentPage().map(item => item.key), ["b", "a", "c"]);
});

test("group storage requires and isolates an explicit group identity", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-groups-"));
  const file = join(root, "storage.json");
  const first = new LocalGameStorage({ file, groupId: "group-a" }).getGroupStorage("shared");
  const second = new LocalGameStorage({ file, groupId: "group-b" }).getGroupStorage("shared");
  await first.set("score", 7);
  assert.equal(await second.get("score"), undefined);
  await second.set("score", 9);
  assert.equal((await first.get("score")).value, 7);
  assert.equal((await second.get("score")).value, 9);
  assert.throws(() => new LocalGameStorage({ file, groupId: " group-a" }), /Invalid storage groupId/);
});

test("applies nested list constraints, fallback warnings, numeric filters, and page-size cap", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-constraints-"));
  const warnings = [];
  const storage = new LocalGameStorage({ file: join(root, "storage.json"), logger: { warn(message) { warnings.push(message); } } });
  const space = storage.getDataStorage("ranked");
  await space.set("low", { profile: { score: 2 } });
  await space.set("high", { profile: { score: 9 } });
  await space.set("missing", 5);
  const constrained = await space.list({ cursor: 0, pageSize: 200, constraintTarget: "profile.score", min: 3, max: 10, ascending: false });
  assert.deepEqual(constrained.getCurrentPage().map(item => item.key), ["high", "missing"]);
  assert.equal(warnings.length, 1);
  const invalid = await space.list({ cursor: 0, constraintTarget: "a.b.c.d.e.f", ascending: true });
  assert.deepEqual(invalid.getCurrentPage().map(item => item.key), ["low", "high", "missing"]);
  assert.equal(warnings.length, 2);
});

test("serializes same-process update and increment mutations", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-atomic-"));
  const storage = new LocalGameStorage({ file: join(root, "storage.json") });
  const space = storage.getDataStorage("atomic");
  await space.set("counter", 0);
  await Promise.all(Array.from({ length: 20 }, () => space.increment("counter")));
  assert.equal((await space.get("counter")).value, 20);
  await space.set("updated", 0);
  await Promise.all([
    space.update("updated", async previous => { await new Promise(resolve => setTimeout(resolve, 10)); return previous.value + 1; }),
    space.update("updated", previous => previous.value + 1),
  ]);
  assert.equal((await space.get("updated")).value, 2);
});

test("enforces the declared JSONValue union without silent JSON rewriting", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-json-values-"));
  const storage = new LocalGameStorage({ file: join(root, "storage.json") });
  const space = storage.getDataStorage("json-values");
  await space.set("valid", { text: "ok", count: 2, enabled: true, nested: [1, { value: false }] });
  assert.deepEqual((await space.get("valid")).value, { text: "ok", count: 2, enabled: true, nested: [1, { value: false }] });
  const cyclic = {}; cyclic.self = cyclic;
  const sparse = []; sparse[1] = 1;
  for (const value of [null, undefined, NaN, Infinity, 1n, () => {}, new Date(), { missing: undefined }, [undefined], sparse, cyclic]) {
    await assert.rejects(() => space.set("invalid", value), /Invalid data value/);
  }
  await assert.rejects(() => space.update("valid", () => ({ value: NaN })), /Invalid data value/);
  assert.equal(await space.get("invalid"), undefined);
});

test("coalesces same-tick mutations into fewer disk writes than calls", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-storage-batch-"));
  const file = join(root, "storage.json");
  const storage = new LocalGameStorage({ file });
  const space = storage.getDataStorage("batch");
  await space.set("counter", 0);
  const writesBefore = storage.diagnostics().writes;
  await Promise.all(Array.from({ length: 25 }, () => space.increment("counter")));
  assert.equal((await space.get("counter")).value, 25);
  const writesForBurst = storage.diagnostics().writes - writesBefore;
  assert.ok(writesForBurst >= 1, "the burst must still reach disk");
  assert.ok(writesForBurst < 25, `expected fewer than 25 writes for 25 concurrent increments, got ${writesForBurst}`);
  assert.equal(JSON.parse(await readFile(file, "utf8")).spaces.batch.counter.value, 25);
});
