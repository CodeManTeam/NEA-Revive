import assert from "node:assert/strict";
import test from "node:test";
import { GameVector3, Vector3 } from "../src/runtime/vector3.mjs";

test("GameVector3 immutable arithmetic follows the recovered origin formulas", () => {
  const left = new GameVector3(2, 4, 6);
  const right = new GameVector3(1, 2, 0);
  assert.deepEqual(left.add(right).toArray(), [3, 6, 6]);
  assert.deepEqual(left.sub(right).toArray(), [1, 2, 6]);
  assert.deepEqual(left.mul(right).toArray(), [2, 8, 0]);
  assert.deepEqual(left.div(right).toArray(), [2, 2, 0]);
  assert.deepEqual(left.cross(right).toArray(), [-12, 6, 0]);
  assert.equal(left.dot(right), 10);
  assert.deepEqual(left.toArray(), [2, 4, 6]);
});

test("GameVector3 mutating arithmetic returns the current vector", () => {
  const value = new Vector3(8, 12, 16);
  assert.equal(value.addEq(new Vector3(1, 2, 3)), value);
  assert.equal(value.subEq(new Vector3(1, 1, 1)), value);
  assert.equal(value.mulEq(new Vector3(2, 2, 2)), value);
  assert.equal(value.divEq(new Vector3(4, 0, 2)), value);
  assert.deepEqual(value.toArray(), [4, 0, 18]);
});

test("GameVector3 magnitude interpolation and comparisons match origin behavior", () => {
  const x = new Vector3(1, 0, 0);
  const y = new Vector3(0, 1, 0);
  assert.equal(x.mag(), 1);
  assert.equal(x.sqrMag(), 1);
  assert.equal(x.angle(y), Math.PI / 2);
  assert.deepEqual(x.towards(y).toArray(), [-1, 1, 0]);
  assert.equal(x.distance(y), Math.sqrt(2));
  assert.deepEqual(new Vector3(3, 0, 4).normalize().toArray(), [0.6000000000000001, 0, 0.8]);
  assert.deepEqual(x.lerp(y, 0.25).toArray(), [0.75, 0.25, 0]);
  assert.equal(x.exactEquals(new Vector3(1, 0, 0)), true);
  assert.equal(x.equals(new Vector3(1 + 5e-7, 0, 0)), true);
});

test("GameVector3 polar construction and string form remain stable", () => {
  const value = GameVector3.fromPolar(2, Math.PI / 2, Math.PI / 2);
  assert.ok(Math.abs(value.x - 2) < 1e-12);
  assert.ok(Math.abs(value.y) < 1e-12);
  assert.ok(Math.abs(value.z) < 1e-12);
  assert.equal(new Vector3(1, 2, 3).toString(), "{ x:1, y:2, z:3 }");
});
