import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const backendUrl = new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url);
const backend = await readFile(backendUrl, "utf8");

function loadGameNetPublicSessions() {
  const start = backend.indexOf("var GameNetPublicSessions = class {");
  const end = backend.indexOf("var defaultDamageState =", start);
  assert.notEqual(start, -1, "game-net PUBLIC session registry is missing");
  assert.notEqual(end, -1, "damage helper boundary is missing");
  const classSource = backend.slice(start, end).replace(
    "var GameNetPublicSessions = class {",
    "GameNetPublicSessions = class {",
  );
  const defaultDamageState = Object.freeze({ showHealthBar: true, hp: 100, maxHp: 100 });
  const context = {
    GameNetPublicSessions: undefined,
    AuthoritativeGameRuntime: class {},
    NetPublicSchema: { free() {}, identity: {} },
    compareNumber: (left, right) => left - right,
    createPublicState: () => ({}),
    decodeTemporaryLegacyPositionTransformCommand: () => undefined,
    defaultDamageState,
    gameTickMilliseconds: 64,
    normalizeRuntimeDamageState(state, previous = defaultDamageState) {
      return Object.freeze({
        showHealthBar: state.showHealthBar ?? previous.showHealthBar,
        hp: state.hp ?? previous.hp,
        maxHp: state.maxHp ?? previous.maxHp,
      });
    },
    requireEntityId2(value) {
      if (!Number.isSafeInteger(value) || value < 1) throw new RangeError("invalid entity id");
    },
    requireSessionId6() {},
    requireTick4() {},
    setInterval,
    clearInterval,
  };
  vm.runInNewContext(classSource, context);
  return context.GameNetPublicSessions;
}

test("backend publishes recovered damage state and aggregates native script events", () => {
  const GameNetPublicSessions = loadGameNetPublicSessions();
  const runtime = {
    despawned: [],
    despawnEntity(entityId) { this.despawned.push(entityId); return entityId === 42; },
    snapshot: () => ({
      players: [{ playerId: 7 }],
      entities: [{ entityId: 42 }],
    }),
  };
  const sessions = new GameNetPublicSessions({ gameClock: {}, runtime, schedule: () => 0, cancel() {} });
  const packets = [];
  sessions.sessions.set("session", {
    client: { message: { scriptEvents: packet => packets.push(structuredClone(packet)) } },
  });

  assert.equal(sessions.updateDamage(7, { showHealthBar: true, hp: 75, maxHp: 100 }, { hurt: 20 }), true);
  assert.equal(sessions.updateDamage(7, { hp: 70 }, { hurt: 5, die: true }), true);
  assert.equal(sessions.updateDamage(42, { showHealthBar: false, hp: 12, maxHp: 20 }, { respawn: true }), true);
  assert.equal(sessions.updateDamage(999, { hp: 1 }, { hurt: 1 }), false);

  assert.deepEqual({ ...sessions.damageStates.get(7) }, { showHealthBar: true, hp: 70, maxHp: 100 });
  assert.deepEqual({ ...sessions.damageStates.get(42) }, { showHealthBar: false, hp: 12, maxHp: 20 });
  assert.equal(sessions.flushDamageEvents(), true);
  assert.deepEqual(packets, [{
    damage: {
      die: [7],
      hurt: [{ id: 7, damage: 25 }],
      respawn: [42],
    },
  }]);
  assert.equal(sessions.flushDamageEvents(), false);
  assert.equal(sessions.destroyEntity(42), true);
  assert.deepEqual(runtime.despawned, [42]);
  assert.equal(sessions.damageStates.has(42), false);
  assert.equal(sessions.destroyEntity(999), false);
});

test("backend uses the recovered Player damage schema instead of an unused placeholder", () => {
  assert.match(backend, /var DamageSchema = new .*MuStruct\(\{[\s\S]*?showHealthBar:[\s\S]*?hp:[\s\S]*?maxHp:/);
  assert.match(backend, /damage: DamageSetSchema/);
  assert.doesNotMatch(backend.match(/var GameReplicaSchema = new .*?\n\}\);/s)?.[0] ?? "", /damage: unused/);
  assert.match(backend, /client\?\.message\.scriptEvents|session\.client\?\.message\.scriptEvents/);
  assert.match(backend, /\/__nea\/control\/damage-state/);
  assert.match(backend, /\/__nea\/control\/entity-destroy/);
  assert.match(backend, /destroyRuntimeEntity\(entityId\)/);
});
