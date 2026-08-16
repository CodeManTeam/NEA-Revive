import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeDieEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { createDieEventFixture } from "../conformance/die-event.mjs";

test("RuntimeDieEvent preserves the recovered four-field event shape", () => {
  const event = createDieEventFixture();
  assert.ok(event instanceof RuntimeDieEvent);
  assert.deepEqual(
    { tick: event.tick, entity: event.entity.id, attacker: event.attacker.id, damageType: event.damageType },
    { tick: 23, entity: "victim", attacker: "attacker", damageType: "melee" },
  );
});

test("Capability Manifest propagates die event entity owners", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onDie(event => {
        event.tick; event.damageType;
        const victim = event.entity;
        const attacker = event.attacker;
        victim.destroyed; if (attacker) attacker.destroyed;
      });
      const meleeDeath = event => event.damageType === "melee";
      world.nextDie(meleeDeath);
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events", "server.world.entities"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  for (const usage of ["event.tick", "event.damageType"]) {
    assert.ok(manifest.requirements.some(item => item.usage === usage && item.owner === "GameDieEvent" && item.state === "partial"), usage);
  }
  assert.ok(manifest.requirements.some(item => item.usage === "victim.destroyed" && item.owner === "GameEntity"));
  assert.ok(manifest.requirements.some(item => item.usage === "attacker.destroyed" && item.owner === "GameEntity"));
});
