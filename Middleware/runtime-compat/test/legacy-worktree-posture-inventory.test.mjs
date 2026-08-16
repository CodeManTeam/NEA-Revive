import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const inventory = JSON.parse(await readFile(new URL("../generated/legacy-worktree-posture-inventory.json", import.meta.url), "utf8"));

test("legacy archived Player posture code is a consumer, not a shape producer", () => {
  assert.deepEqual(inventory.archivedPlayerMotor.standingConstants, { width: 0.45, height: 1.1 });
  assert.deepEqual(inventory.archivedPlayerMotor.bodyShapeWrites, []);
  assert.deepEqual(inventory.archivedPlayerMotor.crouchGroundedBranch.boundsFieldsRead, ["rx", "ry", "rz"]);
  assert.equal(inventory.archivedPlayerMotor.crouchGroundedBranch.shapeMutation, "absent");
  assert.equal(inventory.historicalPhysicsPreparation.classification, "consumer-only");
});

test("legacy worktree does not promote its synthetic producer to historical evidence", () => {
  assert.deepEqual(inventory.legacyPublicProducer.playerBodyWrites, []);
  assert.equal(inventory.legacyPublicProducer.playerUsesRigidBodyIdentity, true);
  assert.equal(inventory.legacyPublicProducer.classification, "local-reproduction-not-historical-evidence");
  assert.equal(inventory.replayData.hasGameNetRawFrame, false);
  assert.equal(inventory.replayData.hasPublicBodyDelta, false);
  assert.equal(inventory.localArtifacts.serverToClientPublicFrameCount, 0);
  assert.equal(inventory.authoritativePostureDelta.status, "unresolved");
});

test("legacy inventory excludes sensitive storage", () => {
  assert.ok(inventory.safety.excludedPaths.includes("dump/private"));
  assert.ok(inventory.localArtifacts.binaryCandidates.every(candidate => !candidate.file.startsWith("dump/private/")));
});
