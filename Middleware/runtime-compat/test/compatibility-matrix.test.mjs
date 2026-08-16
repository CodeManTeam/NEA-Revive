import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const matrix = JSON.parse(await readFile(new URL("../abi/compatibility-matrix.json", import.meta.url), "utf8"));

test("compatibility matrix covers every canonical documentation declaration", () => {
  assert.equal(matrix.entries.length, 599);
  assert.equal(new Set(matrix.entries.map(entry => entry.id)).size, 599);
  assert.equal(Object.values(matrix.summary.byStatus).reduce((sum, value) => sum + value, 0), 599);
  assert.equal(matrix.summary.bySide.client.total, 126);
  assert.equal(matrix.summary.bySide.server.total, 346);
  assert.equal(matrix.summary.bySide.shared.total, 127);
});

test("matrix separates native partial recovered and declared-only states", () => {
  assert.equal(entry("client.global.remoteChannel").status, "native");
  assert.equal(entry("shared.GameVector3.equals").status, "partial");
  assert.equal(entry("server.GameWorld.currentTick").status, "compatible");
  assert.equal(entry("server.GameWorld.onVoxelContact").status, "partial");
  assert.equal(entry("client.UiInput.placeholderOpacity").status, "unavailable");
  assert.ok(entry("client.UiInput.placeholderOpacity").unavailableReason.includes("module 21031"));
  assert.equal(entry("server.GameEntity.contactForce").status, "recovered-only");
});

test("partial canonical entries retain local binding gaps and capabilities", () => {
  const voxelContact = entry("server.GameWorld.onVoxelContact");
  assert.equal(voxelContact.executable, true);
  assert.equal(voxelContact.capability, "server.world.events");
  assert.ok(voxelContact.localBindings.some(binding => binding.localId === "server.world.onVoxelContact"));
  assert.ok(voxelContact.localBindings.flatMap(binding => binding.gaps).some(gap => gap.includes("impulse-derived")));
});

test("implements bindings cannot overstate a partial runtime entry", () => {
  for (const id of ["server.GameWorld.gravity", "server.GameWorld.airFriction", "server.GameWorld.fogColor"]) {
    const worldConfig = entry(id);
    assert.equal(worldConfig.status, "partial");
    assert.equal(worldConfig.capability, "server.world.config");
    assert.ok(worldConfig.localBindings.some(binding => binding.relation === "adapter" && binding.status === "partial"));
    assert.ok(worldConfig.localBindings.flatMap(binding => binding.gaps).length > 0);
  }
});

test("protocol matrix preserves message directions", () => {
  const remote = matrix.protocols.find(protocol => protocol.id === "player.remote-channel");
  assert.deepEqual(remote.clientReceives, ["sendClientEvent"]);
  assert.deepEqual(remote.serverReceives, ["sendServerEvent"]);
});

function entry(id) {
  const value = matrix.entries.find(item => item.id === id);
  assert.ok(value, `${id} missing from compatibility matrix`);
  return value;
}
