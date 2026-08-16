import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("script corpus evidence is anonymous and excludes private identities", async () => {
  const text = await readFile(resolve(root, "evidence", "script-corpus-usage.json"), "utf8");
  const evidence = JSON.parse(text);
  assert.equal(evidence.version, 2);
  assert.deepEqual(evidence.samples.map(sample => sample.sample), ["sample-001", "sample-002"]);
  assert.equal(evidence.privacy.sourceCodeIncluded, false);
  assert.equal(evidence.privacy.sourcePathsIncluded, false);
  assert.equal(evidence.privacy.memberAssignmentPathsIncluded, false);
  assert.equal(evidence.provenance.sourceClass, "approved-local-private-inspection");
  assert.equal(evidence.provenance.redactionStatus, "anonymous-aggregate");
  assert.equal(evidence.provenance.publicStatus, "public-sanitized");
  assert.match(evidence.provenance.reproducibilityLimit, /cannot recreate source code/i);
  assert.ok(evidence.samples.some(sample => sample.sides.server.memberAssignments.length > 0));
  assert.doesNotMatch(text, /dump\/private|works\/private|manual-cdp|evidencePath/);
  assert.doesNotMatch(text, /bedwars|parkour|\u8d77\u5e8a\u6218\u4e89|\u8dd1\u9177/i);
});

test("script corpus report separates native ABI gaps from assignment-proven extensions", async () => {
  const report = JSON.parse(await readFile(resolve(root, "generated", "script-corpus-gap-report.json"), "utf8"));
  const byName = new Map(report.requirements.map(item => [`${item.side}:${item.name}`, item]));
  assert.equal(report.version, 2);
  assert.equal(Object.hasOwn(report, "generatedAt"), false);
  assert.equal(report.evidence.input, "Middleware/runtime-compat/evidence/script-corpus-usage.json");
  assert.equal(report.evidence.sourceClass, "approved-local-private-inspection");
  assert.equal(report.evidence.redactionStatus, "anonymous-aggregate");
  assert.equal(report.evidence.publicStatus, "public-sanitized");
  assert.match(report.evidence.reproducibilityLimit, /cannot recreate source code/i);
  assert.equal(byName.get("client:remoteChannel.events")?.state, "executable");
  assert.equal(byName.get("client:ui.findChildByName")?.canonicalId, "client.UiNode.findChildByName");
  assert.equal(byName.get("server:remoteChannel.broadcastClientEvent")?.state, "executable");
  for (const name of ["getVoxelId", "setVoxelId", "id", "setVoxel", "getVoxel", "name", "getVoxelRotation"]) {
    assert.equal(byName.get(`server:voxels.${name}`)?.canonicalId, `server.GameVoxels.${name}`);
    assert.equal(byName.get(`server:voxels.${name}`)?.state, "executable");
  }
  assert.equal(byName.get("server:world.gameStarting")?.state, "custom-extension");
  assert.ok(byName.get("server:world.gameStarting")?.assignmentCount > 0);
  assert.equal(byName.get("server:world.size")?.state, "executable");
  assert.equal(byName.get("server:world.size")?.compatibility, "emulated");
  assert.equal(byName.get("server:world.size")?.assignmentCount, 0);
  assert.equal(report.summary.unclassified, 0);
  assert.equal(byName.get("server:world.onChat")?.canonicalId, "server.world.onChat");
  assert.equal(byName.get("server:world.onChat")?.resolution, "exact");
  assert.equal(byName.get("server:world.onChat")?.state, "partial");
  assert.equal(byName.get("server:world.onChat")?.assignmentCount, 0);
  assert.equal(report.summary.customExtensions, 15);
});
