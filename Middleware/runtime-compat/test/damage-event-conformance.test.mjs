import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeDamageEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { createDamageEventFixture } from "../conformance/damage-event.mjs";

test("RuntimeDamageEvent preserves the recovered five-field event shape", () => {
  const event = createDamageEventFixture();
  assert.ok(event instanceof RuntimeDamageEvent);
  assert.deepEqual(
    { tick: event.tick, entity: event.entity.id, damage: event.damage, attacker: event.attacker.id, damageType: event.damageType },
    { tick: 19, entity: "victim", damage: 12, attacker: "attacker", damageType: "melee" },
  );
});

test("Capability Manifest propagates damage event entity owners", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onTakeDamage(event => {
        event.tick; event.damage; event.damageType;
        const victim = event.entity;
        const attacker = event.attacker;
        victim.destroyed; if (attacker) attacker.destroyed;
      });
      const damaged = event => event.damage;
      world.nextTakeDamage(damaged);
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events", "server.world.entities"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  for (const usage of ["event.tick", "event.damage", "event.damageType"]) {
    assert.ok(manifest.requirements.some(item => item.usage === usage && item.owner === "GameDamageEvent" && item.state === "partial"), usage);
  }
  assert.ok(manifest.requirements.some(item => item.usage === "victim.destroyed" && item.owner === "GameEntity"));
  assert.ok(manifest.requirements.some(item => item.usage === "attacker.destroyed" && item.owner === "GameEntity"));
});
