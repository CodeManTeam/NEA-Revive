import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { playerDisconnectDestroyOrderConformance } from "../conformance/player-disconnect-destroy-order.mjs";

const runtimeSource = await readFile(new URL("../../../Frontend/demo-map/src/runtime/script-runtime.mjs", import.meta.url), "utf8");

test("disconnect destruction preserves the recovered player lifecycle order", () => {
  const start = runtimeSource.indexOf("removePlayer(id) {");
  const leave = runtimeSource.indexOf("this.#signals.playerLeave.emit", start);
  const destroy = runtimeSource.indexOf("player._signals.destroy.emit", start);
  const worldDestroy = runtimeSource.indexOf("this.#signals.entityDestroy.emit", start);
  assert.ok(start >= 0 && leave > start && destroy > leave && worldDestroy > destroy);
  assert.deepEqual(playerDisconnectDestroyOrderConformance.order, ["world.onPlayerLeave", "player.onDestroy", "world.onEntityDestroy"]);
  assert.deepEqual(playerDisconnectDestroyOrderConformance.payload, ["tick", "entity"]);
  assert.match(playerDisconnectDestroyOrderConformance.remainingGap, /remain unverified/);
});
