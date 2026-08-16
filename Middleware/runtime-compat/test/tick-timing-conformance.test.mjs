import assert from "node:assert/strict";
import test from "node:test";
import { createTickTiming } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { tickTimingContract } from "../conformance/tick-timing.mjs";

test("GameTickEvent timing follows recovered wall-clock and tick-delta formulas", () => {
  assert.deepEqual(createTickTiming(22, 21, 4_200, 4_136), { elapsedTimeMS: 64, skip: false });
  assert.deepEqual(createTickTiming(25, 22, 4_392, 4_200), { elapsedTimeMS: 192, skip: true });
  assert.equal(tickTimingContract.elapsedTimeMS, "Date.now() - previousDispatchMS");
  assert.equal(tickTimingContract.skip, "tick - prevTick > 1");
});
