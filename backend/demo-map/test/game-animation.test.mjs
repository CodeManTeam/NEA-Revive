import assert from "node:assert/strict";
import test from "node:test";
import { GameAnimation } from "../src/runtime/game-animation.mjs";
import { Vector3 } from "../src/runtime/vector3.mjs";

test("GameAnimation interpolates keyframes and exposes lifecycle controls", () => {
  const target = { position: new Vector3(0, 0, 0), opacity: 0 };
  const animation = new GameAnimation(target, [
    { position: [0, 0, 0], opacity: 0 },
    { position: [10, 4, 2], opacity: 1 },
  ], { duration: 10 }, 0);
  let ready = 0;
  let finished = 0;
  animation.onReady(() => { ready += 1; });
  animation.onFinish(event => { if (!event.cancelled) finished += 1; });

  for (let tick = 1; tick <= 5; tick += 1) animation.advance(tick);
  assert.deepEqual(animation.target.position.toArray(), [5, 2, 1]);
  assert.equal(animation.target.opacity, 0.5);
  assert.equal(animation.playState, "running");
  assert.equal(ready, 1);

  for (let tick = 6; tick <= 10; tick += 1) animation.advance(tick);
  assert.deepEqual(animation.target.position.toArray(), [10, 4, 2]);
  assert.equal(animation.playState, "finished");
  assert.equal(finished, 1);
  assert.deepEqual(animation.keyframes()[1].position, [10, 4, 2]);
});

test("GameAnimation cancel emits a cancelled finish event", () => {
  const animation = new GameAnimation({ value: 0 }, [{ value: 0 }, { value: 1 }], { duration: 4 });
  let cancelled = false;
  animation.onFinish(event => { cancelled = event.cancelled; });
  animation.cancel();
  assert.equal(animation.playState, "cancelled");
  assert.equal(cancelled, true);
});
