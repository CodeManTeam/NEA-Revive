import assert from "node:assert/strict";
import test from "node:test";
import { GameQuaternion } from "../src/runtime/quaternion.mjs";

test("implements recovered GameQuaternion construction and operations", () => {
  const identity = new GameQuaternion(1, 0, 0, 0);
  assert.equal(identity.mag(), 1);
  assert.ok(identity.equals(identity.clone()));
  assert.ok(GameQuaternion.fromEuler(0, 0, 0).equals(identity));
  assert.ok(GameQuaternion.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI).normalize().equals(new GameQuaternion(0, 0, 1, 0)));
  assert.equal(identity.mul(identity).toString(), "{ w:1, x:0, y:0, z:0 }");
});