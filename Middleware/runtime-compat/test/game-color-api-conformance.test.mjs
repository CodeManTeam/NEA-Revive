import assert from "node:assert/strict";
import test from "node:test";
import { GameRGBColor, GameRGBAColor } from "../../../Frontend/demo-map/src/runtime/colors.mjs";
import { gameColorApiConformance } from "../conformance/game-color-api.mjs";

test("GameRGBColor and GameRGBAColor preserve recovered component semantics", () => {
  const rgb = new GameRGBColor(0.2, 0.4, 0.6);
  assert.deepEqual(rgb.div(new GameRGBColor(0, 0.2, 0)), new GameRGBColor(0, 2, 0));
  const lerped = rgb.lerp(new GameRGBColor(1, 0, 0), 0.5);
  assert.ok(Math.abs(lerped.r - 0.6) <= Number.EPSILON);
  assert.ok(Math.abs(lerped.g - 0.2) <= Number.EPSILON);
  assert.ok(Math.abs(lerped.b - 0.3) <= Number.EPSILON);
  assert.deepEqual(rgb.toRGBA(), new GameRGBAColor(0.2, 0.4, 0.6, 1));
  const foreground = new GameRGBAColor(1, 0, 0, 0.5);
  assert.deepEqual(foreground.blendEq(new GameRGBColor(0, 0, 1)), new GameRGBColor(0.5, 0, 0.5));
  assert.deepEqual(foreground, new GameRGBAColor(1, 0, 0, 0.5));
});

test("color conformance does not promote epsilon-dependent equality", () => {
  assert.equal(gameColorApiConformance.types.GameRGBColor.compatible.length, 19);
  assert.deepEqual(gameColorApiConformance.types.GameRGBColor.partial, ["equals"]);
  assert.equal(gameColorApiConformance.types.GameRGBAColor.compatible.length, 19);
  assert.deepEqual(gameColorApiConformance.types.GameRGBAColor.partial, ["equals"]);
});
