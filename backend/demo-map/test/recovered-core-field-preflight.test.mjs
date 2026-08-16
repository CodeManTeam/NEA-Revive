import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { preflightRecoveredCoreField } from "../src/recovered-core-field-preflight.mjs";

test("recognizes observed physics, environment, and feature schemas as partial", () => {
  const physics = preflightRecoveredCoreField("physics", { gravity: -0.1, useOBB: false, velocityDamping: 0.01 });
  const environment = preflightRecoveredCoreField("environment", { bakedShadow: {}, drawDistance: 512, fog: {}, rain: {}, sky: {}, snow: {} });
  const features = preflightRecoveredCoreField("features", { enableTriggerAPI: false });
  const player = preflightRecoveredCoreField("player", validPlayer());

  assert.equal(physics.status, "partial");
  assert.equal(environment.status, "partial");
  assert.equal(features.status, "partial");
  assert.equal(player.status, "partial");
  assert.ok(physics.diagnostics[0].code === "value-semantics-unverified");
});

test("blocks schema drift and unsupported types", () => {
  assert.equal(preflightRecoveredCoreField("physics", { gravity: "unknown", useOBB: false, velocityDamping: 0.01 }).status, "evidence-blocked");
  assert.equal(preflightRecoveredCoreField("features", {}).status, "evidence-blocked");
  assert.equal(preflightRecoveredCoreField("player", {}).status, "evidence-blocked");
  assert.throws(() => preflightRecoveredCoreField("unknown", {}), /Unsupported recovered core field/);
});

test("public Player bundle confirms the observed top-level schemas", async () => {
  const bundle = await readFile(new URL("../../../Backend/local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js", import.meta.url), "utf8");

  assert.match(bundle, /EnvironmentRDA=new .*drawDistance/);
  assert.match(bundle, /PhysicsRDA=new .*velocityDamping/);
  assert.match(bundle, /ProjectFeatureRDA=new .*enableTriggerAPI/);
  assert.match(bundle, /PlayerRDA=new .*allowFlight/);
  assert.match(bundle, /PlayerRDA=new .*playerSounds/);
});

function validPlayer() {
  return {
    cameraType: "follow", scale: 1, colorLUT: "", initialPosition: {}, initialYaw: 0, movementBounds: {},
    allowFlight: false, allowMove: true, allowAction0: true, allowAction1: true, allowJump: true, allowDoubleJump: true, allowCrouch: true, noClip: false,
    walkSpeed: 0, walkAcceleration: 0, runSpeed: 0, runAcceleration: 0, crouchSpeed: 0, crouchAcceleration: 0, swimSpeed: 0, swimAcceleration: 0, flySpeed: 0, flyAcceleration: 0, jumpSpeedFactor: 0, jumpAccelerationFactor: 0, jumpPower: 0, doubleJumpPower: 0, mass: 0, friction: 0, restitution: 0, color: {}, emissive: 0, shininess: 0, metalness: 0, invisible: false, showName: true, showIndicator: false, damage: {}, sounds: {}, playerSounds: {},
  };
}
