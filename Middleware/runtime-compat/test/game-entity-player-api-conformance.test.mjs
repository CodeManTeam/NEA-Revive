import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadPreservedBlockCatalog } from "../../../Backend/local-player/src/block-info.mjs";
import { ScriptRuntime, createRuntimeEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { gameEntityPlayerApiConformance } from "../conformance/game-entity-player-api.mjs";

test("GameEntity.player distinguishes ordinary entities from RuntimePlayer", async () => {
  const entity = createRuntimeEntity({ id: "crate", position: [0, 0, 0] });
  assert.equal(entity.isPlayer, false);
  assert.equal(entity.player, undefined);

  const physics = JSON.parse(await readFile(new URL("../../../Frontend/demo-map/project/world/physics.json", import.meta.url), "utf8"));
  const archiveRoot = resolve(fileURLToPath(new URL("../../../Backend/local-player/archive", import.meta.url)));
  const blockCatalog = await loadPreservedBlockCatalog(archiveRoot, "world-bedwars.json");
  const runtime = new ScriptRuntime({
    projectRoot: process.cwd(),
    tickRate: 20,
    capabilities: ["server.world.events"],
    modules: {},
    projectName: "GameEntity.player conformance",
    entityLimit: 3400,
    physics,
    shape: [1, 1, 1],
    blockCatalog,
  });
  const player = runtime.addPlayer({ id: "player-1", name: "Player" });
  assert.equal(player.isPlayer, true);
  assert.equal(player.player, player);
  assert.equal(gameEntityPlayerApiConformance.state, "partial");
});
