import assert from "node:assert/strict";
import test from "node:test";
import { GameRGBColor, GameRGBAColor } from "../src/runtime/colors.mjs";

test("implements recovered RGB and RGBA color classes", () => {
  const rgb = new GameRGBColor(0.2, 0.4, 0.6);
  assert.ok(rgb.clone().equals(rgb));
  assert.deepEqual(rgb.toRGBA(), new GameRGBAColor(0.2, 0.4, 0.6, 1));
  assert.ok(rgb.add(new GameRGBColor(0.1, 0.1, 0.1)).equals(new GameRGBColor(0.3, 0.5, 0.7)));
  assert.deepEqual(new GameRGBAColor(1, 0, 0, 0.5).blendEq(new GameRGBColor(0, 0, 1)), new GameRGBColor(0.5, 0, 0.5));
});