import assert from "node:assert/strict";
import test from "node:test";
import { GameQuaternion } from "../../../Frontend/demo-map/src/runtime/quaternion.mjs";
import { Vector3 } from "../../../Frontend/demo-map/src/runtime/vector3.mjs";
import { gameQuaternionApiConformance } from "../conformance/game-quaternion-api.mjs";

test("GameQuaternion preserves recovered formulas and getAxisAngle argument semantics", () => {
  const receiver = new GameQuaternion(1, 0, 0, 0);
  const argument = GameQuaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
  const result = receiver.getAxisAngle(argument);
  assert.ok(result.axis instanceof Vector3);
  assert.ok(result.axis.equals(new Vector3(0, 1, 0)));
  assert.ok(Math.abs(result.angle - Math.PI / 2) < 1e-6);
  assert.ok(GameQuaternion.fromEuler(0, 0, 0).equals(receiver));
  assert.equal(receiver.mul(receiver).toString(), "{ w:1, x:0, y:0, z:0 }");
});

test("GameQuaternion conformance does not promote epsilon-dependent formulas", () => {
  assert.equal(gameQuaternionApiConformance.compatible.length, 23);
  assert.deepEqual(gameQuaternionApiConformance.partial, ["rotationBetween", "getAxisAngle", "inv", "slerp", "equals"]);
});
