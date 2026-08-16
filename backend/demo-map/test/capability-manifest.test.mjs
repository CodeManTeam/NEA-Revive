import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildProjectCapabilityManifest } from "../src/capability-manifest.mjs";

const currentRuntime = JSON.parse(await readFile(new URL("../../../Middleware/runtime-compat/abi/current-runtime.json", import.meta.url), "utf8"));
const compatibilityMatrix = JSON.parse(await readFile(new URL("../../../Middleware/runtime-compat/abi/compatibility-matrix.json", import.meta.url), "utf8"));
const runtimeContracts = JSON.parse(await readFile(new URL("../../../Middleware/runtime-compat/abi/runtime-contracts.json", import.meta.url), "utf8"));

function manifest(overrides = {}) {
  return buildProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Capability Test" },
    worldConfig: { entityLimit: 3400 },
    serverSource: "world.say('ready');",
    clientSource: "UiText.create();",
    serverCapabilities: ["server.world.chat"],
    clientCapabilities: ["client.ui"],
    currentRuntime,
    compatibilityMatrix,
    runtimeContracts,
    ...overrides,
  });
}

test("capability manifest resolves canonical server and client ABI requirements", () => {
  const result = manifest();
  assert.equal(result.format, "nea-project-capability-manifest");
  assert.equal(result.version, 14);
  assert.deepEqual(result.requirements.map(item => item.usage), ["UiText.create", "world.say"]);
  assert.ok(result.requirements.every(item => item.canonicalId));
  assert.equal(result.summary.blocked, 0);
});

test("capability manifest accepts directly evidenced recovered canonical surfaces", () => {
  const result = manifest({
    serverSource: "",
    clientSource: `remoteChannel.events.on("client", () => {});`,
    serverCapabilities: [],
    clientCapabilities: ["client.remote-channel"],
  });
  const requirement = result.requirements.find(item => item.usage === "remoteChannel.events");
  assert.equal(requirement.canonicalId, "client.remoteChannel.events");
  assert.equal(requirement.compatibility, "native");
  assert.equal(requirement.state, "ready");
  assert.ok(requirement.reasons.some(reason => reason.includes("direct runtime evidence")));
});

test("capability manifest keeps weakly evidenced recovered canonical surfaces partial", () => {
  const recoveredId = "client.remoteChannel.events";
  const weakRuntime = {
    ...currentRuntime,
    entries: currentRuntime.entries.map(entry => entry.id === recoveredId ? {
      ...entry,
      evidence: [{ type: "script-corpus", path: "runtime-compat/evidence/script-corpus-usage.json", symbol: recoveredId, confidence: "direct" }],
    } : entry),
  };
  const result = manifest({
    serverSource: "",
    clientSource: `remoteChannel.events.on("client", () => {});`,
    serverCapabilities: [],
    clientCapabilities: ["client.remote-channel"],
    currentRuntime: weakRuntime,
  });
  assert.equal(result.requirements.find(item => item.usage === "remoteChannel.events").state, "partial");
});

test("capability manifest records confirmed cross-runtime transport and authoritative flows", () => {
  const result = manifest({
    serverSource: `world.onPlayerJoin(({ player }) => { player.position = [1, 2, 3]; remoteChannel.sendClientEvent(player, { ready: true }); });`,
    clientSource: `remoteChannel.sendServerEvent({ ready: true });`,
    serverCapabilities: ["server.world.events", "server.player.write", "server.remote-channel"],
    clientCapabilities: ["client.remote-channel"],
  });
  assert.deepEqual(result.dependencies.map(item => item.id), [
    "authoritative:state-write",
    "transport:client-event",
    "transport:client-module-delivery",
    "transport:player-session-lifecycle",
    "transport:server-event",
  ]);
  assert.ok(result.dependencies.every(item => item.state === "ready"));
  assert.equal(result.summary.blockedDependencies, 0);
  const position = result.requirements.find(item => item.usage === "player.position");
  assert.equal(position.owner, "GamePlayerEntity");
  assert.equal(position.operation, "write");
  assert.equal(position.capability, "server.player.write");
  assert.equal(position.state, "partial");
});

test("capability manifest distinguishes no client script from an explicit empty module", () => {
  const absent = manifest({ clientSource: "", clientCapabilities: [] });
  assert.ok(!absent.dependencies.some(item => item.id === "transport:client-module-delivery"));
  const explicit = manifest({
    clientModules: [{ name: "clientIndex.js", source: "" }],
    clientCapabilities: [],
  });
  const delivery = explicit.dependencies.find(item => item.id === "transport:client-module-delivery");
  assert.equal(delivery.state, "ready");
  assert.deepEqual(delivery.requiredBy, ["module:clientIndex.js"]);
});

test("capability manifest resolves RuntimeEntity physical writes and projection dependency", () => {
  const result = manifest({
    serverSource: `const body = world.createEntity({ id: "body", mesh: "body.mesh" }); body.collides = false; body.fixed = true; body.gravity = false; body.mass = 2; body.friction = 0.25; body.restitution = 0.5;`,
    clientSource: "",
    serverCapabilities: ["server.world.entities"],
    clientCapabilities: [],
    assets: [{ name: "body.mesh", runtimeBinding: "validated-mesh" }],
  });
  for (const member of ["collides", "fixed", "gravity", "mass", "friction", "restitution"]) {
    const requirement = result.requirements.find(item => item.usage === `body.${member}`);
    assert.equal(requirement.owner, "GameEntity");
    assert.equal(requirement.operation, "write");
    assert.equal(requirement.canonicalId, `server.GameEntity.${member}`);
    assert.equal(requirement.state, "partial");
  }
  const projection = result.dependencies.find(item => item.id === "authoritative:runtime-entity-projection");
  assert.equal(projection.state, "ready");
  assert.deepEqual(projection.requiredBy, ["server.js:world.createEntity#1"]);
  assert.equal(result.status, "partial");
});

test("capability manifest does not require authoritative state flow for player reads", () => {
  const result = manifest({
    serverSource: `world.onPlayerJoin(({ player }) => { const position = player.position; world.say(String(position)); });`,
    clientSource: "",
    serverCapabilities: ["server.world.events", "server.player.write", "server.world.chat"],
    clientCapabilities: [],
  });
  const position = result.requirements.find(item => item.usage === "player.position");
  assert.equal(position.operation, "read");
  assert.ok(!result.dependencies.some(item => item.id === "authoritative:state-write"));
});

test("capability manifest blocks a required transport flow when contract evidence is absent", () => {
  const result = manifest({
    clientSource: `remoteChannel.sendServerEvent({ ready: true });`,
    clientCapabilities: ["client.remote-channel"],
    runtimeContracts: { ...runtimeContracts, flows: runtimeContracts.flows.filter(flow => flow.id !== "client-event") },
  });
  assert.equal(result.dependencies.find(item => item.id === "transport:client-event").state, "blocked");
  assert.equal(result.status, "blocked");
});

test("capability manifest uses the effective current-runtime binding status", () => {
  const result = manifest({
    serverSource: `world.onChat(() => {}); world.raycast({ origin: [0, 0, 0], direction: [1, 0, 0] }); storage.getDataStorage("scores");`,
    serverCapabilities: ["server.world.chat", "server.world.entities", "server.storage"],
  });
  for (const usage of ["world.onChat", "world.raycast", "storage.getDataStorage"]) {
    const requirement = result.requirements.find(item => item.usage === usage);
    assert.equal(requirement.compatibility, "partial", `${usage} must retain its effective binding gap`);
    assert.equal(requirement.state, "partial", `${usage} must not be overstated as ready`);
  }
});

test("capability manifest blocks missing grants and unavailable declarations", () => {
  const result = manifest({
    serverSource: "world.say('missing grant'); world.searchBox({});",
    serverCapabilities: [],
  });
  assert.equal(result.status, "blocked");
  assert.ok(result.requirements.find(item => item.usage === "world.say").reasons.some(reason => reason.includes("server.world.chat")));
  assert.equal(result.requirements.find(item => item.usage === "world.searchBox").state, "blocked");
});

test("capability manifest gates voxel access separately from entity access", () => {
  const blocked = manifest({
    serverSource: `voxels.getVoxelId(1, 2, 3); const size = world.size;`,
    serverCapabilities: ["server.world.entities"],
  });
  for (const usage of ["voxels.getVoxelId", "world.size"]) {
    const requirement = blocked.requirements.find(item => item.usage === usage);
    assert.equal(requirement.capability, "server.world.voxels");
    assert.equal(requirement.state, "blocked");
    assert.ok(requirement.reasons.some(reason => reason.includes("server.world.voxels")));
  }
  const granted = manifest({
    serverSource: `voxels.getVoxelId(1, 2, 3); const size = world.size;`,
    serverCapabilities: ["server.world.voxels"],
  });
  assert.ok(granted.requirements.every(item => item.state !== "blocked"));
});

test("capability manifest preserves project-owned global state across modules", () => {
  const result = manifest({
    serverModules: [
      { name: "state.js", source: `world.gameStarting = false; gui.YELLOW = "#ffff00"; gui.message = () => "ready";` },
      { name: "main.js", source: `if (world.gameStarting) gui.message(gui.YELLOW);` },
    ],
    clientSource: "",
    serverCapabilities: [],
    clientCapabilities: [],
  });
  for (const usage of ["world.gameStarting", "gui.YELLOW", "gui.message"]) {
    const requirements = result.requirements.filter(item => item.usage === usage);
    assert.ok(requirements.length >= 1);
    assert.ok(requirements.every(item => item.state === "script-owned"));
    assert.ok(requirements.every(item => item.canonicalId === null));
  }
  assert.equal(result.summary.scriptOwned, result.requirements.filter(item => item.state === "script-owned").length);
  assert.equal(result.summary.blocked, 0);
});

test("capability manifest preserves owner-qualified project fields across variable names", () => {
  const result = manifest({
    serverModules: [
      { name: "write.js", source: `const source = world.querySelector("entity"); source.projectState = 1;` },
      { name: "read.js", source: `const target = world.querySelector("entity"); if (target.projectState) world.say("ready");` },
    ],
    serverCapabilities: ["server.world.entities", "server.world.chat"],
  });
  const custom = result.requirements.filter(item => item.usage.endsWith(".projectState"));
  assert.equal(custom.length, 2);
  assert.ok(custom.every(item => item.owner === "GameEntity"));
  assert.ok(custom.every(item => item.state === "script-owned"));
});

test("capability manifest preserves GameEntity project fields on Player event values", () => {
  const result = manifest({
    serverModules: [
      { name: "write.js", source: `const source = world.querySelector("entity"); source.sharedState = 1;` },
      { name: "read.js", source: `world.onPress(event => { const player = event.entity; if (player.sharedState) world.say("ready"); });` },
    ],
    serverCapabilities: ["server.world.entities", "server.world.events", "server.world.chat"],
  });
  const playerRead = result.requirements.find(item => item.usage === "player.sharedState" && item.owner === "GamePlayerEntity");
  assert.equal(playerRead.state, "script-owned");
});

test("capability manifest defers unresolved Runtime object reads without admitting unknown calls", () => {
  const result = manifest({
    serverSource: `const entity = world.querySelector("entity"); if (entity.projectState) entity.projectAction();`,
    serverCapabilities: ["server.world.entities"],
  });
  const read = result.requirements.find(item => item.usage === "entity.projectState");
  const call = result.requirements.find(item => item.usage === "entity.projectAction");

  assert.equal(read.owner, "GameEntity");
  assert.equal(read.compatibility, "evidence-deferred");
  assert.equal(read.state, "partial");
  assert.match(read.reasons.join(" "), /extensible Runtime object/);
  assert.equal(call.owner, "GameEntity");
  assert.equal(call.state, "blocked");
});

test("capability manifest gates declared GUI members without claiming script-owned fields", () => {
  const blocked = manifest({ serverSource: `gui.remove(player, "#panel");`, serverCapabilities: [] });
  const requirement = blocked.requirements.find(item => item.usage === "gui.remove");
  assert.equal(requirement.capability, "server.gui");
  assert.equal(requirement.state, "blocked");
  const granted = manifest({ serverSource: `gui.remove(player, "#panel");`, serverCapabilities: ["server.gui"] });
  assert.notEqual(granted.requirements.find(item => item.usage === "gui.remove").state, "blocked");
  const dependency = granted.dependencies.find(item => item.id === "transport:gui");
  assert.equal(dependency.state, "ready");
  assert.equal(dependency.protocol, "player.gui");
  assert.deepEqual(dependency.requiredBy, ["server.js:gui.remove"]);
});

test("capability manifest blocks GUI use when the transport flow evidence is absent", () => {
  const result = manifest({
    serverSource: `gui.show(player, "menu");`,
    serverCapabilities: ["server.gui"],
    runtimeContracts: { ...runtimeContracts, flows: runtimeContracts.flows.filter(flow => flow.id !== "gui-command") },
  });
  assert.equal(result.dependencies.find(item => item.id === "transport:gui").state, "blocked");
  assert.equal(result.status, "blocked");
});

test("capability manifest requires outbound chat delivery without claiming chat ingress", () => {
  const result = manifest({
    serverSource: `
      world.say("ready");
      world.onChat(event => event.player.sendMessage(event.message));
    `,
    serverCapabilities: ["server.world.chat"],
  });
  const dependency = result.dependencies.find(item => item.id === "transport:chat-delivery");
  assert.equal(dependency.state, "ready");
  assert.equal(dependency.protocol, "player.game-chat.log");
  assert.deepEqual(dependency.requiredBy, ["server.js:player.sendMessage", "server.js:world.say"]);

  const ingressOnly = manifest({
    serverSource: `world.onChat(event => console.log(event.message));`,
    serverCapabilities: ["server.world.chat", "server.core"],
  });
  assert.equal(ingressOnly.dependencies.some(item => item.id === "transport:chat-delivery"), false);
});

test("capability manifest blocks outbound chat when delivery flow evidence is absent", () => {
  const result = manifest({
    serverSource: `world.say("ready");`,
    serverCapabilities: ["server.world.chat"],
    runtimeContracts: { ...runtimeContracts, flows: runtimeContracts.flows.filter(flow => flow.id !== "chat-delivery") },
  });
  assert.equal(result.dependencies.find(item => item.id === "transport:chat-delivery").state, "blocked");
  assert.equal(result.status, "blocked");
});

test("capability manifest gates server sound samples, Sound controls, and playback transport", () => {
  const source = `
    const target = world.querySelector(".speaker");
    const worldSound = world.sound("audio/world.mp3");
    const entitySound = target.sound({ sample: "audio/entity.mp3", radius: 48 });
    worldSound.pause();
    entitySound.resume(1.5);
  `;
  const blocked = manifest({
    serverSource: source,
    clientSource: "",
    serverCapabilities: ["server.world.entities"],
    clientCapabilities: [],
  });
  assert.deepEqual(blocked.resources.map(item => item.reference), ["audio/entity.mp3", "audio/world.mp3"]);
  assert.ok(blocked.resources.every(item => item.state === "blocked"));
  assert.equal(blocked.requirements.find(item => item.usage === "worldSound.pause").canonicalId, "shared.Sound.pause");
  assert.equal(blocked.requirements.find(item => item.usage === "entitySound.resume").canonicalId, "shared.Sound.resume");
  const dependency = blocked.dependencies.find(item => item.id === "transport:sound-playback");
  assert.equal(dependency.state, "ready");
  assert.equal(dependency.protocol, "player.sound");
  assert.equal(blocked.status, "blocked");

  const packaged = manifest({
    serverSource: source,
    clientSource: "",
    serverCapabilities: ["server.world.entities"],
    clientCapabilities: [],
    assets: [
      { name: "audio/world.mp3", kind: "audio", runtimeBinding: "player-block-audio" },
      { name: "audio/entity.mp3", kind: "audio", runtimeBinding: "player-block-audio" },
    ],
  });
  assert.ok(packaged.resources.every(item => item.state === "ready"));
  assert.equal(packaged.dependencies.find(item => item.id === "transport:sound-playback").state, "ready");
  assert.equal(packaged.status, "partial");
});

test("capability manifest blocks sound calls when player.sound flow evidence is absent", () => {
  const result = manifest({
    serverSource: `world.sound("audio/world.mp3");`,
    clientSource: "",
    serverCapabilities: ["server.world.entities"],
    clientCapabilities: [],
    assets: [{ name: "audio/world.mp3", kind: "audio", runtimeBinding: "player-block-audio" }],
    runtimeContracts: { ...runtimeContracts, flows: runtimeContracts.flows.filter(flow => flow.id !== "sound-playback") },
  });
  assert.equal(result.dependencies.find(item => item.id === "transport:sound-playback").state, "blocked");
  assert.equal(result.status, "blocked");
});

test("capability manifest resolves GameBounds3 constructor, static factory, and instance members", () => {
  const result = manifest({
    serverSource: `
      const first = new GameBounds3([0, 0, 0], [4, 4, 4]);
      const second = GameBounds3.fromPoints([2, 2, 2], [6, 6, 6]);
      first.intersects(second);
      first.containsBounds(second);
      first.lo.x = -1;
    `,
    clientSource: "",
    serverCapabilities: [],
    clientCapabilities: [],
  });
  for (const usage of ["GameBounds3.GameBounds3", "GameBounds3.fromPoints", "first.intersects", "first.containsBounds", "first.lo"]) {
    const requirement = result.requirements.find(item => item.usage === usage);
    assert.ok(requirement, usage);
    assert.equal(requirement.canonicalId, `shared.GameBounds3.${usage.split(".")[1]}`, usage);
    assert.equal(requirement.capability, "shared.math", usage);
    assert.equal(requirement.state, "ready", usage);
  }
  assert.equal(result.status, "ready");
});

test("capability manifest resolves intrinsic GameQuaternion surfaces without a project grant", () => {
  const result = manifest({
    serverSource: `
      const first = new GameQuaternion(1, 0, 0, 0);
      const second = GameQuaternion.fromEuler(0, 90, 0);
      first.mul(second);
      first.getAxisAngle(second);
    `,
    clientSource: "",
    serverCapabilities: [],
    clientCapabilities: [],
  });
  for (const usage of ["GameQuaternion.GameQuaternion", "GameQuaternion.fromEuler", "first.mul"]) {
    const requirement = result.requirements.find(item => item.usage === usage);
    assert.equal(requirement?.canonicalId, `shared.GameQuaternion.${usage.split(".")[1]}`, usage);
    assert.equal(requirement?.state, "ready", usage);
  }
  const partial = result.requirements.find(item => item.usage === "first.getAxisAngle");
  assert.equal(partial?.canonicalId, "shared.GameQuaternion.getAxisAngle");
  assert.equal(partial?.state, "partial");
  assert.equal(result.status, "partial");
});

test("capability manifest resolves shared color values on both script sides", () => {
  const result = manifest({
    serverSource: `const fog = new GameRGBColor(1, 0, 0); fog.toRGBA(); fog.equals(fog);`,
    clientSource: `const tint = new GameRGBAColor(1, 1, 1, 0.5); tint.blendEq(new GameRGBColor(0, 0, 0));`,
    serverCapabilities: [],
    clientCapabilities: [],
  });
  for (const usage of ["GameRGBColor.GameRGBColor", "fog.toRGBA", "GameRGBAColor.GameRGBAColor", "tint.blendEq"]) {
    const requirement = result.requirements.find(item => item.usage === usage);
    assert.ok(requirement?.canonicalId.startsWith("shared.Game"), usage);
    assert.equal(requirement?.state, "ready", usage);
  }
  const equality = result.requirements.find(item => item.usage === "fog.equals");
  assert.equal(equality?.canonicalId, "shared.GameRGBColor.equals");
  assert.equal(equality?.state, "partial");
  assert.equal(result.status, "partial");
});

test("capability manifest propagates event subscription tokens", () => {
  const result = manifest({
    serverSource: `const token = world.onTick(() => {}); token.cancel(); token.resume(); token.active();`,
    clientSource: "",
    serverCapabilities: ["server.world.events"],
    clientCapabilities: [],
  });
  for (const member of ["cancel", "resume", "active"]) {
    const requirement = result.requirements.find(item => item.usage === `token.${member}`);
    assert.equal(requirement?.canonicalId, `shared.GameEventHandlerToken.${member}`, member);
    assert.equal(requirement?.state, "ready", member);
  }
});

test("capability manifest propagates GameEntity.player chains without claiming identity parity", () => {
  const result = manifest({
    serverSource: `const entity = world.querySelector("player"); entity.player.directMessage("ready");`,
    clientSource: "",
    serverCapabilities: ["server.world.entities", "server.world.chat"],
    clientCapabilities: [],
  });
  const player = result.requirements.find(item => item.usage === "entity.player");
  assert.equal(player?.canonicalId, "server.GameEntity.player");
  assert.equal(player?.state, "partial");
  const message = result.requirements.find(item => item.usage === "player.directMessage");
  assert.equal(message?.canonicalId, "server.GamePlayerEntity.directMessage");
});

test("capability manifest requires Player input ingress for click press and release subscriptions", () => {
  const result = manifest({
    serverSource: `
      world.onClick(event => event.clicker.directMessage(event.button));
      world.onPress(event => event.entity.lastPressed = event.button);
      world.onRelease(event => event.entity.lastReleased = event.button);
    `,
    serverCapabilities: ["server.world.events", "server.world.chat"],
  });
  const dependency = result.dependencies.find(item => item.id === "transport:input-event-ingress");
  assert.equal(dependency.state, "ready");
  assert.equal(dependency.protocol, "player.game-net.input");
  assert.deepEqual(dependency.requiredBy, ["server.js:world.onClick", "server.js:world.onPress", "server.js:world.onRelease"]);
});

test("capability manifest requires entity-interact ingress for world and entity subscriptions", () => {
  const result = manifest({
    serverSource: `
      world.onInteract(event => event.targetEntity.lastPlayer = event.entity.id);
      world.querySelector(".merchant").onInteract(event => event.entity.directMessage("ready"));
    `,
    serverCapabilities: ["server.world.events", "server.world.entities"],
  });
  const dependency = result.dependencies.find(item => item.id === "transport:entity-interact-ingress");
  assert.equal(dependency.state, "ready");
  assert.equal(dependency.protocol, "player.entity-interact");
  assert.deepEqual(dependency.requiredBy, ["server.js:entity.onInteract", "server.js:world.onInteract"]);
});

test("capability manifest blocks interact subscriptions when ingress evidence is absent", () => {
  const result = manifest({
    serverSource: `world.onInteract(() => {});`,
    serverCapabilities: ["server.world.events"],
    runtimeContracts: { ...runtimeContracts, flows: runtimeContracts.flows.filter(flow => flow.id !== "entity-interact-ingress") },
  });
  assert.equal(result.dependencies.find(item => item.id === "transport:entity-interact-ingress").state, "blocked");
  assert.equal(result.status, "blocked");
});

test("capability manifest blocks input event subscriptions when ingress flow evidence is absent", () => {
  const result = manifest({
    serverSource: `world.onClick(() => {});`,
    serverCapabilities: ["server.world.events"],
    runtimeContracts: { ...runtimeContracts, flows: runtimeContracts.flows.filter(flow => flow.id !== "input-event-ingress") },
  });
  assert.equal(result.dependencies.find(item => item.id === "transport:input-event-ingress").state, "blocked");
  assert.equal(result.status, "blocked");
});

test("capability manifest does not confuse chat or unrelated world events with Player input ingress", () => {
  const result = manifest({
    serverSource: `world.onChat(() => {}); world.onVoxelContact(() => {});`,
    serverCapabilities: ["server.world.chat", "server.world.events"],
  });
  assert.equal(result.dependencies.some(item => item.id === "transport:input-event-ingress"), false);
});

test("capability manifest requires authoritative damage projection for mutations and lifecycle calls", () => {
  const result = manifest({
    serverSource: `
      const target = world.querySelector(".target");
      target.hp = 20;
      target.maxHp = 40;
      target.showHealthBar = false;
      target.hurt(5, { damageType: "melee" });
      target.player.forceRespawn();
    `,
    serverCapabilities: ["server.world.query", "server.world.entities", "server.world.events", "server.player.write"],
  });
  const dependency = result.dependencies.find(item => item.id === "transport:damage-state-projection");
  assert.equal(dependency.state, "ready");
  assert.equal(dependency.protocol, "player.game-net.PUBLIC.damage");
  assert.deepEqual(dependency.requiredBy, [
    "server.js:player.forceRespawn",
    "server.js:target.hp",
    "server.js:target.hurt",
    "server.js:target.maxHp",
    "server.js:target.showHealthBar",
  ]);
});

test("capability manifest blocks damage mutations when projection evidence is absent", () => {
  const result = manifest({
    serverSource: `const target = world.querySelector(".target"); target.hurt(1);`,
    serverCapabilities: ["server.world.query", "server.world.events"],
    runtimeContracts: { ...runtimeContracts, flows: runtimeContracts.flows.filter(flow => flow.id !== "damage-state-projection") },
  });
  assert.equal(result.dependencies.find(item => item.id === "transport:damage-state-projection").state, "blocked");
  assert.equal(result.status, "blocked");
});

test("capability manifest does not require damage projection for reads or lifecycle subscriptions", () => {
  const result = manifest({
    serverSource: `
      const target = world.querySelector(".target");
      console.log(target.hp, target.maxHp, target.showHealthBar);
      world.onTakeDamage(() => {});
      world.onDie(() => {});
      world.onRespawn(() => {});
    `,
    serverCapabilities: ["server.core", "server.world.query", "server.world.entities", "server.world.events"],
  });
  assert.equal(result.dependencies.some(item => item.id === "transport:damage-state-projection"), false);
});

test("capability manifest requires authoritative projection only for validated script mesh entities", () => {
  const result = manifest({
    serverSource: `
      world.createEntity({ id: "projected", mesh: "captured-mesh" });
      world.createEntity({ id: "local", mesh: "unknown-mesh" });
    `,
    serverCapabilities: ["server.world.entities"],
    assets: [{ name: "captured-mesh", kind: "mesh", runtimeBinding: "validated-mesh" }],
  });
  const dependency = result.dependencies.find(item => item.id === "authoritative:runtime-entity-projection");
  assert.equal(dependency.state, "ready");
  assert.equal(dependency.protocol, "nea-control.runtime-entity");
  assert.deepEqual(dependency.requiredBy, ["server.js:world.createEntity#1"]);
  assert.equal(result.entities.find(entity => entity.id === "local").state, "partial");
});

test("capability manifest blocks validated mesh projection when authoritative flow is absent", () => {
  const result = manifest({
    serverSource: `world.createEntity({ mesh: "captured-mesh" });`,
    serverCapabilities: ["server.world.entities"],
    assets: [{ name: "captured-mesh", kind: "mesh", runtimeBinding: "validated-mesh" }],
    runtimeContracts: { ...runtimeContracts, flows: runtimeContracts.flows.filter(flow => flow.id !== "runtime-entity-projection") },
  });
  assert.equal(result.dependencies.find(item => item.id === "authoritative:runtime-entity-projection").state, "blocked");
  assert.equal(result.status, "blocked");
});

test("capability manifest keeps unknown mesh creation script-local without projection dependency", () => {
  const result = manifest({
    serverSource: `world.createEntity({ mesh: "unknown-mesh" });`,
    serverCapabilities: ["server.world.entities"],
    assets: [],
  });
  assert.equal(result.dependencies.some(item => item.id === "authoritative:runtime-entity-projection"), false);
  assert.equal(result.entities[0].state, "partial");
  assert.match(result.entities[0].reason, /remains script-local/);
});

test("capability manifest requires recovered Player dialog RPC for open and cancel calls", () => {
  const result = manifest({
    serverSource: `world.onPlayerJoin(({ player }) => { player.dialog({ type: "text", content: "Ready" }); player.cancelDialogs(); });`,
    serverCapabilities: ["server.world.events", "server.player"],
  });
  const dependency = result.dependencies.find(item => item.id === "transport:dialog-rpc");
  assert.equal(dependency.state, "ready");
  assert.equal(dependency.protocol, "player.dialog");
  assert.deepEqual(dependency.requiredBy, ["server.js:player.cancelDialogs", "server.js:player.dialog"]);
});

test("capability manifest blocks dialog calls when RPC flow evidence is absent", () => {
  const result = manifest({
    serverSource: `world.onPlayerJoin(({ player }) => player.dialog({ type: "text", content: "Ready" }));`,
    serverCapabilities: ["server.world.events", "server.player"],
    runtimeContracts: { ...runtimeContracts, flows: runtimeContracts.flows.filter(flow => flow.id !== "dialog-rpc") },
  });
  assert.equal(result.dependencies.find(item => item.id === "transport:dialog-rpc").state, "blocked");
  assert.equal(result.status, "blocked");
});

test("capability manifest requires stable Player session lifecycle ingress for join and leave handlers", () => {
  const result = manifest({
    serverSource: `world.onPlayerJoin(({ player }) => player.name); world.onPlayerLeave(({ player }) => player.name);`,
    serverCapabilities: ["server.world.events", "server.player"],
  });
  const dependency = result.dependencies.find(item => item.id === "transport:player-session-lifecycle");
  assert.equal(dependency.state, "ready");
  assert.equal(dependency.protocol, "player.game-net.session");
  assert.deepEqual(dependency.requiredBy, ["server.js:world.onPlayerJoin", "server.js:world.onPlayerLeave"]);
});

test("capability manifest blocks Player lifecycle handlers when session flow evidence is absent", () => {
  const result = manifest({
    serverSource: `world.onPlayerJoin(() => {});`,
    serverCapabilities: ["server.world.events"],
    runtimeContracts: { ...runtimeContracts, flows: runtimeContracts.flows.filter(flow => flow.id !== "player-session-lifecycle") },
  });
  assert.equal(result.dependencies.find(item => item.id === "transport:player-session-lifecycle").state, "blocked");
  assert.equal(result.status, "blocked");
});

test("capability manifest does not confuse entity destroy handlers with Player session lifecycle", () => {
  const result = manifest({
    serverSource: `world.onEntityDestroy(() => {});`,
    serverCapabilities: ["server.world.events"],
  });
  assert.equal(result.dependencies.some(item => item.id === "transport:player-session-lifecycle"), false);
});

test("capability manifest gates persistent storage independently", () => {
  const blocked = manifest({
    serverSource: `const scores = storage.getDataStorage("scores"); const shared = storage.getGroupStorage("shared");`,
    serverCapabilities: [],
  });
  for (const usage of ["storage.getDataStorage", "storage.getGroupStorage"]) {
    const requirement = blocked.requirements.find(item => item.usage === usage);
    assert.equal(requirement.capability, "server.storage");
    assert.equal(requirement.state, "blocked");
  }
  const granted = manifest({
    serverSource: `const scores = storage.getDataStorage("scores"); const shared = storage.getGroupStorage("shared");`,
    serverCapabilities: ["server.storage"],
  });
  for (const usage of ["storage.getDataStorage", "storage.getGroupStorage"]) {
    const requirement = granted.requirements.find(item => item.usage === usage);
    assert.equal(requirement.state, "partial");
  }
});

test("capability manifest gates recovered world configuration properties", () => {
  const source = `world.gravity = -0.2; world.airFriction = 0.01; world.fogColor = new GameRGBColor(1, 0, 0);`;
  const blocked = manifest({ serverSource: source, serverCapabilities: [] });
  for (const usage of ["world.gravity", "world.airFriction", "world.fogColor"]) {
    const requirement = blocked.requirements.find(item => item.usage === usage);
    assert.equal(requirement.operation, "write");
    assert.equal(requirement.capability, "server.world.config");
    assert.equal(requirement.state, "blocked");
  }
  const granted = manifest({ serverSource: source, serverCapabilities: ["server.world.config"] });
  for (const usage of ["world.gravity", "world.airFriction", "world.fogColor"]) {
    const requirement = granted.requirements.find(item => item.usage === usage);
    assert.equal(requirement.state, "partial");
  }
});

test("capability manifest refines supported literal selectors without changing the global partial ABI", () => {
  const result = manifest({
    serverSource: `
      world.querySelectorAll("player");
      world.querySelectorAll(".team,#spawn,*");
      world.querySelector("entity");
      world.testSelector("#target", world.querySelector("player"));
    `,
    serverCapabilities: ["server.world.entities"],
  });
  for (const usage of ["world.querySelector", "world.querySelectorAll", "world.testSelector"]) {
    const requirement = result.requirements.find(item => item.usage === usage);
    assert.equal(requirement.compatibility, "partial");
    assert.equal(requirement.state, "ready");
    assert.ok(requirement.reasons.some(reason => reason.includes("statically proven recovered selector tokens")));
    assert.equal(requirement.reasons.some(reason => reason.includes("testComponent implementation")), false);
  }
});

test("capability manifest keeps dynamic and unknown component selectors partial", () => {
  const dynamic = manifest({
    serverSource: `const selector = getSelector(); world.querySelectorAll(selector);`,
    serverCapabilities: ["server.world.entities"],
  });
  assert.equal(dynamic.requirements.find(item => item.usage === "world.querySelectorAll").state, "partial");
  const component = manifest({
    serverSource: `world.querySelectorAll("rigidbody");`,
    serverCapabilities: ["server.world.entities"],
  });
  assert.equal(component.requirements.find(item => item.usage === "world.querySelectorAll").state, "partial");
  assert.ok(component.diagnostics.some(item => item.code === "selector-component-unverified"));
});

test("capability manifest reports unknown API surfaces without inventing bindings", () => {
  const result = manifest({ serverSource: "world.notRecovered();" });
  const requirement = result.requirements.find(item => item.usage === "world.notRecovered");
  assert.equal(requirement.canonicalId, null);
  assert.equal(requirement.state, "blocked");
});

test("capability manifest reports evidence-backed unavailable client wrappers", () => {
  const result = manifest({
    clientSource: `const input = UiInput.create(); const opacity = input.placeholderOpacity;`,
    clientCapabilities: ["client.ui"],
  });
  const requirement = result.requirements.find(item => item.usage === "input.placeholderOpacity");
  assert.equal(result.requirements.filter(item => item.usage === "input.placeholderOpacity").length, 1);
  assert.equal(requirement.owner, "UiInput");
  assert.equal(requirement.canonicalId, "client.UiInput.placeholderOpacity");
  assert.equal(requirement.compatibility, "unavailable");
  assert.equal(requirement.state, "blocked");
  assert.ok(requirement.reasons.some(reason => reason.includes("module 21031")));
});

test("capability manifest propagates entity, player, and client UI variable owners", () => {
  const result = manifest({
    serverSource: `
      const beacon = world.querySelector(".beacon");
      beacon.say("ready", { hideFloat: true });
      world.onPlayerJoin(({ player }) => {
        player.directMessage("joined");
        player.snapshot();
      });
    `,
    clientSource: `
      const label = UiText.create();
      label.textContent = "ready";
      label.anchor.copy(Vec2.create({ x: 0, y: 0 }));
      label.position.offset.copy(Vec2.create({ x: 20, y: 20 }));
      label.size.offset.copy(Vec2.create({ x: 560, y: 150 }));
    `,
    serverCapabilities: ["server.world.entities", "server.world.events", "server.world.chat", "server.player"],
  });
  assert.ok(result.requirements.some(item => item.owner === "GameEntity" && item.canonicalId === "server.GameEntity.say"));
  assert.ok(result.requirements.some(item => item.owner === "GamePlayerEntity" && item.canonicalId === "server.GamePlayerEntity.directMessage"));
  const snapshot = result.requirements.find(item => item.usage === "player.snapshot");
  assert.equal(snapshot.compatibility, "extension");
  assert.equal(snapshot.state, "partial");
  const playerJoin = result.requirements.find(item => item.usage === "world.onPlayerJoin");
  assert.equal(playerJoin.state, "ready");
  assert.ok(playerJoin.reasons.some(reason => reason.includes("gates every accessed GamePlayerEntity member separately")));
  assert.ok(result.requirements.some(item => item.owner === "UiText" && item.canonicalId === "client.UiText.textContent"));
  for (const member of ["anchor", "position", "size"]) {
    const requirement = result.requirements.find(item => item.usage === `label.${member}`);
    assert.equal(requirement.owner, "UiText");
    assert.equal(requirement.canonicalId, `client.UiRenderable.${member}`);
    assert.equal(requirement.state, "ready");
  }
  assert.deepEqual(result.ui, [{ side: "client", module: "client.js", variable: "label", type: "UiText", source: "create", lookupName: null, receiver: "UiText", matchIds: [], state: "ready", reason: null, properties: ["anchor", "position", "size", "textContent"] }]);
});

test("capability manifest verifies static UI lookups against the packaged tree", () => {
  const uiState = {
    defaultScreenId: "SCREEN",
    uiTree: {
      ROOT_ID: { id: "ROOT_ID", type: 0, name: "root", parentId: "", childrenIds: ["SCREEN"] },
      SCREEN: { id: "SCREEN", type: 1, name: "main", parentId: "ROOT_ID", childrenIds: ["STATUS"], value: { type: "screen" } },
      STATUS: { id: "STATUS", type: 2, name: "status", parentId: "SCREEN", childrenIds: [], value: { type: "text" } },
    },
  };
  const ready = manifest({ clientSource: `const status = ui.findChildByName("status"); ui.findChildByName("status");`, uiState, clientCapabilities: ["client.ui"] });
  const lookup = ready.ui.find(item => item.source === "lookup");
  assert.equal(lookup.state, "ready");
  assert.deepEqual(lookup.matchIds, ["STATUS"]);
  assert.ok(ready.ui.some(item => item.source === "lookup-call" && item.state === "ready"));
  assert.equal(ready.summary.blockedUi, 0);

  const blocked = manifest({ clientSource: `const missing = ui.findChildByName("missing"); missing.visible = true; const dynamic = ui.findChildByName(nodeName); dynamic.visible = true;`, uiState, clientCapabilities: ["client.ui"] });
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.summary.blockedUi, 2);
  assert.ok(blocked.ui.some(item => item.variable === "missing" && /missing/.test(item.reason)));
  assert.ok(blocked.ui.some(item => item.variable === "dynamic" && /Dynamic/.test(item.reason)));
});

test("capability manifest admits an unused missing static UI lookup without fabricating a node", () => {
  const uiState = { defaultScreenId: "ROOT", uiTree: { ROOT: { id: "ROOT", parentId: null, name: "root", value: { type: "screen" } } } };
  const unused = manifest({ clientSource: `const optionalPanel = ui.findChildByName("not-packaged");`, uiState, clientCapabilities: ["client.ui"] });
  const lookup = unused.ui.find(item => item.variable === "optionalPanel");
  assert.equal(lookup.state, "ready");
  assert.deepEqual(lookup.matchIds, []);
  assert.match(lookup.reason, /never referenced/);
  assert.equal(unused.summary.blockedUi, 0);

  const passedElsewhere = manifest({ clientSource: `const optionalPanel = ui.findChildByName("not-packaged"); consume(optionalPanel);`, uiState, clientCapabilities: ["client.ui"] });
  assert.equal(passedElsewhere.ui.find(item => item.variable === "optionalPanel").state, "blocked");
});

test("capability manifest keeps cross-module script-created UI lookups partial", () => {
  const result = manifest({
    clientModules: [
      { name: "create.js", source: `const panel = UiBox.create(); panel.name = "runtime-panel";` },
      { name: "read.js", source: `const panel = ui.findChildByName("runtime-panel");` },
    ],
    uiState: { defaultScreenId: "ROOT", pictureAssets: {}, uiTree: { ROOT: { id: "ROOT", parentId: null, name: "root", value: { type: "screen" } } } },
    clientCapabilities: ["client.ui"],
  });
  const lookup = result.ui.find(item => item.module === "read.js" && item.source === "lookup");
  assert.equal(lookup.state, "partial");
  assert.match(lookup.reason, /execution order and receiver subtree placement remain unverified/);
  assert.equal(result.summary.blockedUi, 0);
});

test("capability manifest blocks missing local modules", () => {
  const result = manifest({
    serverModules: [
      { name: "scripts/server.js", source: `import "./rules.js"; world.say("ready");` },
    ],
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.modules[0].state, "blocked");
  assert.match(result.modules[0].reason, /scripts\/rules\.js/);
});

test("capability manifest ignores module-like text outside JavaScript code", () => {
  const result = manifest({
    serverModules: [{
      name: "scripts/server.js",
      source: `// require("./comment.js")\nconst example = 'require("./string.js")';\n/* import "./block.js"; */`,
    }],
  });
  assert.deepEqual(result.modules, []);
});

test("capability manifest ignores UI and resource-like text outside JavaScript code", () => {
  const result = manifest({
    clientModules: [{
      name: "client.js",
      source: `// const ghost = ui.findChildByName("missing");\nconst example = 'Audio("missing.mp3")';\n/* image = "missing.png"; */`,
    }],
  });
  assert.deepEqual(result.resources, []);
  assert.deepEqual(result.ui, []);
});

test("capability manifest ignores uncertainty-like text outside JavaScript code", () => {
  const result = manifest({
    serverModules: [{
      name: "scripts/server.js",
      source: `// eval("ignored")\nconst example = "world.onChat(() => {})";\n/* export default ignored; */`,
    }],
  });
  assert.deepEqual(result.diagnostics, []);
});

test("capability manifest inventories client and entity resources without guessing missing project assets", () => {
  const result = manifest({
    clientModules: [{ name: "client.js", source: `Audio("asset:theme.mp3"); const icon = UiImage.create(); icon.image = "https://cdn.example/icon.png";` }],
    assets: [{ name: "theme.mp3" }],
    entities: [{ id: "npc", mesh: "asset:npc.mesh" }],
  });
  assert.equal(result.resources.find(item => item.reference === "asset:theme.mp3").state, "partial");
  assert.equal(result.resources.find(item => item.reference === "asset:theme.mp3").availability, "packaged");
  assert.equal(result.resources.find(item => item.reference === "https://cdn.example/icon.png").state, "partial");
  assert.equal(result.resources.find(item => item.reference === "https://cdn.example/icon.png").availability, "external");
  assert.equal(result.resources.find(item => item.reference === "asset:npc.mesh").state, "blocked");
  assert.equal(result.status, "blocked");
});

test("capability manifest inventories project and script-created entity projection requirements", () => {
  const result = manifest({
    serverModules: [{ name: "scripts/server.js", source: `world.createEntity({ id: "npc", mesh: "asset:npc.mesh" }); world.createEntity({ id: "logic" });` }],
    serverCapabilities: ["server.world.entities"],
    assets: [{ name: "npc.mesh", runtimeBinding: "validated-mesh" }],
    entities: [{ id: "spawn", kind: "marker" }],
  });
  assert.ok(result.entities.some(item => item.source === "project" && item.id === "spawn" && item.projection === "package-entity"));
  assert.ok(result.entities.some(item => item.source === "script" && item.id === "npc" && item.projection === "validated-mesh-binding" && item.state === "ready"));
  assert.ok(result.entities.some(item => item.source === "script" && item.id === "logic" && item.projection === "script-local-unless-bound" && item.state === "partial"));
  assert.equal(result.resources.find(item => item.reference === "asset:npc.mesh").state, "ready");
  assert.equal(result.summary.partialEntities, 1);
  assert.equal(result.summary.blockedEntities, 0);
});

test("capability manifest inventories every dynamic createEntity call without fabricating projection", () => {
  const result = manifest({
    serverSource: `
      const spec = makeEntitySpec();
      world.createEntity(spec);
      world.createEntity({ id: "dynamic-mesh", mesh: selectedMesh, nested: { value: true } });
      world.createEntity({ id: "known", mesh: "captured.mesh", nested: { value: true } });
    `,
    serverCapabilities: ["server.world.entities"],
    assets: [{ name: "captured.mesh", runtimeBinding: "validated-mesh" }],
  });
  const scriptEntities = result.entities.filter(item => item.source === "script");
  assert.equal(scriptEntities.length, 3);
  assert.deepEqual(scriptEntities.map(item => item.occurrence).sort((left, right) => left - right), [1, 2, 3]);
  assert.ok(scriptEntities.some(item => item.callShape === "dynamic-expression" && item.projection === "dynamic-spec-script-local-unless-validated-at-runtime" && item.state === "partial"));
  assert.ok(scriptEntities.some(item => item.id === "dynamic-mesh" && item.mesh === null && item.projection === "dynamic-mesh-script-local-unless-validated-at-runtime" && item.state === "partial"));
  assert.ok(scriptEntities.some(item => item.id === "known" && item.mesh === "captured.mesh" && item.projection === "validated-mesh-binding" && item.state === "ready"));
  assert.equal(result.dependencies.filter(item => item.id === "authoritative:runtime-entity-projection").length, 1);
});

test("capability manifest blocks project mesh projection but keeps unknown script meshes local", () => {
  const result = manifest({
    serverSource: `world.createEntity({ id: "temporary", mesh: "unknown.mesh" });`,
    serverCapabilities: ["server.world.entities"],
    entities: [{ id: "required", mesh: "asset:required.mesh" }],
    assets: [{ name: "required.mesh", kind: "mesh" }],
  });
  const projectEntity = result.entities.find(item => item.source === "project");
  const scriptEntity = result.entities.find(item => item.source === "script");
  assert.equal(projectEntity.state, "blocked");
  assert.equal(projectEntity.projection, "requires-validated-mesh-binding");
  assert.equal(scriptEntity.state, "partial");
  assert.equal(scriptEntity.projection, "script-local-unless-bound");
  assert.equal(result.resources.find(item => item.reference === "unknown.mesh").state, "partial");
  assert.equal(result.summary.blockedEntities, 1);
  assert.equal(result.status, "blocked");
});

test("capability manifest keeps packaged assets partial without a generic runtime resolver", () => {
  const result = manifest({
    clientSource: `const icon = UiImage.create(); icon.image = "asset:icon.png";`,
    assets: [{ name: "icon.png", kind: "image", sha256: "0".repeat(64) }],
    clientCapabilities: ["client.ui"],
  });
  const resource = result.resources.find(item => item.reference === "asset:icon.png");
  assert.equal(resource.availability, "packaged");
  assert.equal(resource.runtimeSupport, "unavailable");
  assert.equal(resource.state, "partial");
  assert.equal(result.summary.partialResources, 1);
  assert.equal(result.status, "partial");
});

test("capability manifest blocks missing project UI images and keeps metadata-only pictures partial", () => {
  const uiTree = {
    ROOT_ID: { id: "ROOT_ID", type: 0, name: "Root", parentId: "", childrenIds: ["screen"] },
    screen: { id: "screen", type: 2, name: "screen", parentId: "ROOT_ID", childrenIds: ["missing", "known"], value: { type: "screen", data: {} } },
    missing: { id: "missing", type: 1, name: "missing", parentId: "screen", childrenIds: [], value: { type: "element", data: { image: "missing-picture" } } },
    known: { id: "known", type: 1, name: "known", parentId: "screen", childrenIds: [], value: { type: "element", data: { image: "known-picture" } } },
  };
  const result = manifest({ uiState: { defaultScreenId: "screen", uiTree, pictureAssets: { "known-picture": { metadataHash: "m", hash: "h", width: 1, height: 1 } } } });
  assert.equal(result.ui.find(item => item.id === "missing").state, "blocked");
  assert.equal(result.ui.find(item => item.id === "known").state, "partial");
  assert.equal(result.ui.find(item => item.id === "known").imageAvailability, "metadata-only");
  assert.equal(result.summary.blockedUi, 1);
  assert.equal(result.summary.partialUi, 1);
  assert.equal(result.status, "blocked");
});

test("capability manifest marks UI pictures ready only with verified Player bindings", () => {
  const uiTree = {
    ROOT_ID: { id: "ROOT_ID", type: 0, name: "Root", parentId: "", childrenIds: ["screen"] },
    screen: { id: "screen", type: 2, name: "screen", parentId: "ROOT_ID", childrenIds: ["image"], value: { type: "screen", data: {} } },
    image: { id: "image", type: 1, name: "image", parentId: "screen", childrenIds: [], value: { type: "element", data: { image: "verified-picture" } } },
  };
  const result = manifest({
    uiState: { defaultScreenId: "screen", uiTree, pictureAssets: { "verified-picture": { metadataHash: "m", hash: "h", width: 1, height: 1 } } },
    assets: [{ name: "verified-picture", kind: "image", runtimeBinding: "player-picture-image" }],
  });
  const image = result.ui.find(item => item.id === "image");
  assert.equal(image.state, "ready");
  assert.equal(image.imageAvailability, "verified-local-picture");
});

test("capability manifest resolves captured DAO3 block audio by content address", () => {
  const hash = "QmSkEpcxqFYvZNwZg2EwzTz7y9XNxQnChZ18CDCM8Q8uvE";
  const result = manifest({
    clientSource: `const sound = new Audio("https://static.dao3.fun/block/${hash}"); sound.play();`,
    clientCapabilities: ["client.media"],
    assets: [{ name: "project-audio", kind: "audio", contentAddress: hash, runtimeBinding: "player-block-audio" }],
  });
  const resource = result.resources.find(item => item.kind === "audio");
  assert.equal(resource.availability, "packaged");
  assert.equal(resource.runtimeSupport, "player-block-audio");
  assert.equal(resource.state, "ready");
});

test("capability manifest propagates exported entity owners through local named imports", () => {
  const result = manifest({
    serverModules: [
      { name: "scripts/entities.js", source: `export const speaker = world.querySelector(".speaker");` },
      { name: "scripts/server.js", source: `import { speaker as npc } from "./entities.js"; npc.say("hello");` },
    ],
    serverCapabilities: ["server.world.entities", "server.world.chat"],
  });
  const usage = result.requirements.find(item => item.module === "scripts/server.js" && item.usage === "npc.say");
  assert.equal(usage.owner, "GameEntity");
  assert.equal(usage.canonicalId, "server.GameEntity.say");
  assert.equal(result.summary.blockedModules, 0);
});

test("capability manifest propagates CommonJS exports and requires", () => {
  const result = manifest({
    serverModules: [
      { name: "scripts/entities.js", source: `const speaker = world.querySelector(".speaker"); const target = world.querySelector(".target"); module.exports = { speaker, target };` },
      { name: "scripts/server.js", source: `const { speaker: npc, target } = require("./entities.js"); npc.say("hello"); target.destroy();` },
    ],
    serverCapabilities: ["server.world.entities", "server.world.chat"],
  });
  assert.ok(result.requirements.some(item => item.usage === "npc.say" && item.owner === "GameEntity"));
  assert.ok(result.requirements.some(item => item.usage === "target.destroy" && item.owner === "GameEntity"));
  assert.equal(result.modules.find(item => item.specifier === "./entities.js").resolved, "scripts/entities.js");
  assert.equal(result.summary.blockedModules, 0);
});

test("capability manifest resolves packaged CommonJS directories and blocks absent bare modules", () => {
  const result = manifest({
    serverModules: [
      { name: "scripts/server.js", source: `require("./feature"); require("missing-package");` },
      { name: "scripts/feature/index.js", source: `world.say("feature");` },
    ],
    serverCapabilities: ["server.world.chat"],
  });
  assert.equal(result.modules.find(item => item.specifier === "./feature").resolved, "scripts/feature/index.js");
  assert.equal(result.modules.find(item => item.specifier === "missing-package").state, "blocked");
  assert.match(result.modules.find(item => item.specifier === "missing-package").reason, /node_modules\/missing-package/);
});

test("capability manifest blocks server ESM syntax until an executable loader exists", () => {
  const result = manifest({
    serverModules: [
      { name: "scripts/server.js", source: `import { speaker } from "./entities.js"; speaker.say("hello");` },
      { name: "scripts/entities.js", source: `export const speaker = world.querySelector(".speaker");` },
    ],
    serverCapabilities: ["server.world.entities", "server.world.chat"],
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.filter(item => item.code === "unsupported-server-module-syntax").length, 2);
});

test("capability manifest propagates default imports and querySelectorAll iteration entities", () => {
  const result = manifest({
    serverModules: [
      { name: "scripts/entities.js", source: `const entities = world.querySelectorAll(".npc"); let first; for (const entity of entities) { first = entity; entity.say("listed"); } export default first;` },
      { name: "scripts/server.js", source: `import npc from "./entities.js"; npc.say("imported");` },
    ],
    serverCapabilities: ["server.world.entities", "server.world.chat"],
  });
  assert.ok(result.requirements.some(item => item.module === "scripts/entities.js" && item.usage === "entity.say" && item.owner === "GameEntity"));
  assert.ok(result.requirements.some(item => item.module === "scripts/server.js" && item.usage === "npc.say" && item.owner === "GameEntity"));
});

test("capability manifest propagates DAO3 collection callback and find result owners", () => {
  const result = manifest({
    serverSource: `world.querySelectorAll(".npc").forEach(entity => entity.say("direct")); const entities = world.querySelectorAll(".npc"); entities.filter(entity => entity.position.y > 0).forEach(entity => entity.destroy());`,
    clientSource: `const screens = UiScreen.getAllScreen(); const active = screens.find(screen => screen.visible); active.visible = true; UiScreen.getAllScreen().find(screen => screen.visible);`,
    serverCapabilities: ["server.world.entities", "server.world.chat"],
    clientCapabilities: ["client.ui"],
  });
  assert.ok(result.requirements.some(item => item.usage === "entity.say" && item.owner === "GameEntity"));
  assert.ok(result.requirements.some(item => item.usage === "entity.destroy" && item.owner === "GameEntity"));
  assert.ok(result.requirements.some(item => item.usage === "screen.visible" && item.owner === "UiScreen"));
  assert.ok(result.requirements.some(item => item.usage === "active.visible" && item.owner === "UiScreen"));
  assert.equal(result.summary.blocked, 0);
});

test("capability manifest limits event payload inference to DAO3 event registrations", () => {
  const result = manifest({
    serverSource: `
      const target = world.querySelector(".target");
      function handleClick({ clicker, entity: clicked, other }) {
        clicker.directMessage("clicked");
        clicked.say("hit");
        other.destroy();
      }
      world.onClick(handleClick);
      target.onClick(({ clicker: localClicker }) => localClicker.directMessage("target"));
      const business = ({ entity }) => entity.say("not a runtime event");
    `,
    serverCapabilities: ["server.world.entities", "server.world.events", "server.world.chat", "server.player"],
  });
  assert.ok(result.requirements.some(item => item.usage === "clicker.directMessage" && item.owner === "GamePlayerEntity"));
  assert.ok(result.requirements.some(item => item.usage === "clicked.say" && item.owner === "GameEntity"));
  assert.ok(result.requirements.some(item => item.usage === "other.destroy" && item.owner === "GameEntity"));
  assert.ok(result.requirements.some(item => item.usage === "localClicker.directMessage" && item.owner === "GamePlayerEntity"));
  assert.equal(result.requirements.some(item => item.usage === "entity.say"), false);
});

test("capability manifest accepts literal computed members and blocks dynamic members", () => {
  const literal = manifest({ serverSource: `world["say"]("ready");`, serverCapabilities: ["server.world.chat"] });
  assert.ok(literal.requirements.some(item => item.usage === "world.say"));
  assert.equal(literal.summary.blockingDiagnostics, 0);

  const dynamic = manifest({ serverSource: `const member = "say"; world[member]("unknown");` });
  assert.equal(dynamic.status, "blocked");
  assert.ok(dynamic.diagnostics.some(item => item.code === "dynamic-member"));
});

test("capability manifest defers dynamic Runtime object reads and writes while blocking calls", () => {
  const result = manifest({
    serverSource: `const entity = world.querySelector("entity"); const key = "projectState"; entity[key] = 1; if (entity[key]) world[key]();`,
    serverCapabilities: ["server.world.entities"],
  });
  const dynamicMembers = result.diagnostics.filter(item => item.code === "dynamic-member");

  assert.equal(dynamicMembers.filter(item => item.state === "partial").length, 2);
  assert.equal(dynamicMembers.filter(item => item.state === "blocked").length, 1);
  assert.ok(dynamicMembers.some(item => /member call/.test(item.message)));
});

test("capability manifest blocks eval, Function construction, and dynamic import specifiers", () => {
  const result = manifest({
    clientSource: `eval("UiText.create()"); new Function("return 1"); import(moduleName);`,
  });
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.diagnostics.map(item => item.code).sort(), ["dynamic-eval", "dynamic-function", "dynamic-import"]);
});

test("capability manifest reports recovered selector grammar risks as partial", () => {
  const result = manifest({
    serverSource: `
      world.querySelectorAll(".box .red");
      world.querySelector("custom-component");
      world.testSelector(".safe,#known,player", world.querySelector("#known"));
    `,
    serverCapabilities: ["server.world.entities"],
  });
  assert.equal(result.status, "partial");
  assert.equal(result.summary.partialDiagnostics, 2);
  assert.deepEqual(result.diagnostics.map(item => item.code).sort(), ["selector-component-unverified", "selector-whitespace-not-intersection"]);
  assert.equal(result.summary.blockingDiagnostics, 0);
});

test("capability manifest propagates GameDataStorage and QueryList owners", () => {
  const result = manifest({
    serverSource: `
      const players = storage.getDataStorage("players");
      players.set("guest", { score: 1 });
      players.get("guest");
      const pages = players.list({ cursor: 0 });
      pages.getCurrentPage();
      pages.nextPage();
      pages.isLastPage;
    `,
    serverCapabilities: ["server.storage"],
  });
  for (const usage of ["players.set", "players.get", "players.list"]) assert.deepEqual(result.requirements.filter(item => item.usage === usage).map(item => item.owner), ["GameDataStorage"]);
  for (const usage of ["pages.getCurrentPage", "pages.nextPage", "pages.isLastPage"]) {
    const requirements = result.requirements.filter(item => item.usage === usage);
    assert.deepEqual(requirements.map(item => item.owner), ["QueryList"]);
    assert.equal(requirements[0].localExtensionId, `server.RuntimeQueryList.${usage.split(".")[1]}`);
    assert.equal(requirements[0].state, "partial");
  }
  assert.equal(result.status, "partial");
  assert.equal(result.summary.blocked, 0);
});

test("capability manifest blocks group storage without authoritative group scope", () => {
  const blocked = manifest({ serverSource: `storage.getGroupStorage("shared");`, serverCapabilities: ["server.storage"] });
  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.diagnostics.some(item => item.code === "group-storage-scope-unavailable"));

  const configured = manifest({ serverSource: `storage.getGroupStorage("shared");`, serverCapabilities: ["server.storage"], storageScope: { groupId: "group-7" } });
  assert.equal(configured.summary.blockingDiagnostics, 0);
});

test("capability manifest propagates GameZone return owners", () => {
  const result = manifest({
    serverSource: `
      const area = world.addZone({ selector: "player" });
      area.onEnter(({ entity }) => entity.say("entered"));
      area.onLeave(() => {});
      area.entities();
      area.remove();
      world.zones();
    `,
    serverCapabilities: ["server.world.events", "server.world.chat"],
  });
  for (const usage of ["area.onEnter", "area.onLeave", "area.entities", "area.remove"]) {
    const requirements = result.requirements.filter(item => item.usage === usage);
    assert.deepEqual(requirements.map(item => item.owner), ["GameZone"]);
    assert.equal(requirements[0].localExtensionId, `server.RuntimeGameZone.${usage.split(".")[1]}`);
    assert.equal(requirements[0].state, "partial");
  }
  assert.equal(result.summary.blocked, 0);
});

test("capability manifest blocks purchase success subscriptions without an ingress producer", () => {
  const result = manifest({
    serverSource: `world.onPlayerPurchaseSuccess(({ userId, productId, orderId }) => { world.say(userId + productId + orderId); });`,
    serverCapabilities: ["server.world.events", "server.world.chat"],
  });
  assert.equal(result.status, "blocked");
  assert.ok(result.requirements.some(item => item.canonicalId === "server.GameWorld.onPlayerPurchaseSuccess" && item.state === "partial"));
  assert.ok(result.diagnostics.some(item => item.code === "purchase-success-ingress-unavailable" && item.state === "blocked"));
});

test("capability manifest blocks chat subscriptions without browser ingress", () => {
  const result = manifest({ serverSource: `world.onChat(({ message }) => world.say(message));`, serverCapabilities: ["server.world.chat"] });
  assert.equal(result.status, "blocked");
  assert.ok(result.diagnostics.some(item => item.code === "chat-ingress-unavailable" && item.state === "blocked"));
});
