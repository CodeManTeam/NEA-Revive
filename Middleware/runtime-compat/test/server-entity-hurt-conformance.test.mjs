import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applyRecoveredEntityHurt, serverEntityHurtEvidence } from "../conformance/server-entity-hurt.mjs";

const matrix = JSON.parse(await readFile(new URL("../abi/compatibility-matrix.json", import.meta.url), "utf8"));
const runtimeSource = await readFile(new URL("../../../Frontend/demo-map/src/runtime/script-runtime.mjs", import.meta.url), "utf8");

test("GameEntity hurt preserves recovered damage, healing, and death transitions", () => {
  const disabled = applyRecoveredEntityHurt({ id: "target", hp: 20, maxHp: 20, enableDamage: false }, 5);
  assert.equal(disabled.state.hp, 20);
  assert.equal(disabled.damageEvent, null);

  const damaged = applyRecoveredEntityHurt({ id: "target", hp: 20, maxHp: 20, enableDamage: true }, 5, { attacker: "attacker", damageType: "melee" });
  assert.equal(damaged.state.hp, 15);
  assert.deepEqual(damaged.damageEvent, { entity: "target", damage: 5, attacker: "attacker", damageType: "melee" });
  assert.equal(damaged.dieEvent, null);

  const healed = applyRecoveredEntityHurt({ id: "target", hp: 15, maxHp: 20, enableDamage: true }, -10, { attacker: "ignored", damageType: "ignored" });
  assert.equal(healed.state.hp, 20);
  assert.deepEqual(healed.damageEvent, { entity: "target", damage: -10, attacker: null, damageType: "" });

  const fatal = applyRecoveredEntityHurt({ id: "target", hp: 5, maxHp: 20, enableDamage: true }, 25, "void");
  assert.equal(fatal.state.hp, 0);
  assert.deepEqual(fatal.damageEvent, { entity: "target", damage: 25, attacker: null, damageType: "void" });
  assert.deepEqual(fatal.dieEvent, { entity: "target", attacker: null, damageType: "void" });
});

test("current Runtime binds both entities and players to canonical GameEntity.hurt", () => {
  const entry = matrix.entries.find(candidate => candidate.id === "server.GameEntity.hurt");
  assert.equal(entry?.status, "partial");
  assert.equal(entry?.executable, true);
  assert.deepEqual(entry?.localBindings.map(binding => binding.localId).sort(), ["server.RuntimeEntity.hurt", "server.RuntimePlayer.hurt"]);
  assert.match(runtimeSource, /_hurtEntity\(entity, amount, options\)/);
  assert.match(runtimeSource, /createGameDieEvent\(this\.currentTick, entity, attacker, damageType\)/);
  assert.equal(serverEntityHurtEvidence.length, 5);
});
