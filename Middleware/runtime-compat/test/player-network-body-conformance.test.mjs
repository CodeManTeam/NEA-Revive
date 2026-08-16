import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("project Player network Body overrides generic schema identity", async () => {
  const analysis = JSON.parse(await readFile(resolve(root, "generated", "player-network-body-analysis.json"), "utf8"));
  assert.deepEqual(analysis.schema.genericRigidBodyIdentityHalfExtents, [1, 1, 1]);
  assert.equal(analysis.schema.historicalPlayerSizeEvidence, false);
  assert.equal(analysis.playerProducer.overridesGenericIdentity, true);
  assert.deepEqual(analysis.playerProducer.shapeAssignments, ["body.hsx = hsx", "body.hsy = hsy", "body.hsz = hsz"]);
  assert.equal(analysis.playerProducer.boundsAndShapeAreIndependent, true);
  assert.equal(analysis.playerProducer.projectPackageRequiresExplicitProfile, true);
  assert.equal(analysis.propagation.initialHandshakeCarriesBounds, true);
  assert.equal(analysis.propagation.initialHandshakeCarriesShape, true);
  assert.equal(analysis.propagation.initialPublicStateCarriesBounds, true);
  assert.equal(analysis.propagation.authoritativeFrameCarriesBounds, true);
  assert.equal(analysis.propagation.laterPublicStateCarriesBounds, true);
  assert.equal(analysis.propagation.initialAndLaterUseSameProfile, true);
});

test("Demo Body uses the confirmed historical upright default ABI", async () => {
  const analysis = JSON.parse(await readFile(resolve(root, "generated", "player-network-body-analysis.json"), "utf8"));
  const abi = JSON.parse(await readFile(resolve(root, "abi", "physics-player-body.json"), "utf8"));
  assert.equal(analysis.activeProfile.origin, "body-center");
  assert.equal(analysis.activeProfile.originStatus, "confirmed");
  assert.equal(analysis.activeProfile.sizeStatus, "confirmed");
  assert.equal(analysis.activeProfile.historicalSizeConfirmed, true);
  assert.deepEqual(analysis.activeProfile.boundsHalfExtents, [0.45, 1.1, 0.45]);
  assert.deepEqual(analysis.activeProfile.shapeHalfExtents, [0.45, 1.1, 0.45]);
  assert.deepEqual(abi.halfExtents, [0.45, 1.1, 0.45]);
  assert.deepEqual(abi.dimensions, [0.9, 2.2, 0.9]);
});
