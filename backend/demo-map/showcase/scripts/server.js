console.log("[NEA Showcase] server script loaded");

const DEFAULT_PHYSICS = Object.freeze({ gravity: -20, airFriction: 0.001 });
const PHYSICS_LIMITS = Object.freeze({ gravity: [-40, -1], airFriction: [0, 0.25] });
const MOVEMENT_PROFILE = Object.freeze({ walkSpeed: 0.7, runSpeed: 5, jumpPower: 0.98, stepHeight: 1.25 });

const capabilityMatrix = Object.freeze([
  { id: "server.world.events", status: "verified", note: "tick, join, leave, voxel contact, and trigger events" },
  { id: "server.world.onTick", status: "partial", note: "tick, prevTick, elapsedTimeMS, and skip are delivered; delayed catch-up remains partial" },
  { id: "server.world.onPlayerLeave", status: "verified", note: "backend disconnect ingress dispatches before player cleanup" },
  { id: "server.world.onChat", status: "evidence-deferred", note: "historical chat event shape is known; no recovered Player/browser chat producer reaches the Server Script Runtime" },
  { id: "server.world.onEntityContact", status: "evidence-deferred", note: "contact schema is recovered, but ContactBinding and active entity-contact aggregation are unavailable" },
  { id: "server.world.onPlayerPurchaseSuccess", status: "evidence-deferred", note: "event fields are known, but market open/acknowledgement evidence has no recovered purchase-result producer" },
  { id: "server.world.raycast", status: "verified", note: "result entity, voxel, position, normal, and distance" },
  { id: "server.storage", status: "partial", note: "data storage is local and persistent; group storage uses the launch-verified scope, while cloud/distributed semantics remain evidence-deferred" },
  { id: "server.world.config", status: "verified", note: "gravity and airFriction are mutable at runtime" },
  { id: "server.player.write", status: "partial", note: "movement fields are synchronized; full historical surface is not claimed" },
  { id: "server.remote-channel", status: "verified", note: "directed server-to-client and client-to-server events" },
  { id: "server.http", status: "partial", note: "allowlisted fetch path is runtime-gated; external service behavior is not required" },
  { id: "server.chat-ingress", status: "evidence-deferred", note: "historical inbound chat contract is not established" },
  { id: "server.full-physics", status: "evidence-deferred", note: "contact force and posture semantics remain unresolved" },
]);

function finiteInRange(value, [minimum, maximum]) {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function send(player, event) {
  remoteChannel.sendClientEvent(player, { ...event, tick: world.currentTick });
}

function sendPhysics(player) {
  send(player, {
    type: "showcase:physics",
    gravity: world.gravity,
    airFriction: world.airFriction,
    movement: MOVEMENT_PROFILE,
    stepHeight: MOVEMENT_PROFILE.stepHeight,
  });
}

function applyMovement(player, patch = {}) {
  if (Number.isFinite(patch.walkSpeed) && patch.walkSpeed >= 0 && patch.walkSpeed <= 20) player.walkSpeed = patch.walkSpeed;
  if (Number.isFinite(patch.runSpeed) && patch.runSpeed >= 0 && patch.runSpeed <= 20) player.runSpeed = patch.runSpeed;
  if (Number.isFinite(patch.jumpPower) && patch.jumpPower >= 0 && patch.jumpPower <= 20) player.jumpPower = patch.jumpPower;
}

async function probeHttp(player) {
  try {
    const response = await http.fetch("https://example.invalid/nea-showcase-probe");
    send(player, { type: "showcase:http", status: "partial", ok: response.ok, statusCode: response.status });
  } catch (error) {
    send(player, { type: "showcase:http", status: "partial", ok: false, message: String(error?.message ?? error) });
  }
}

world.onPlayerJoin(({ player }) => {
  player.name = `Showcase-${player.id.split("-").at(-1)}`;
  applyMovement(player, MOVEMENT_PROFILE);
  world.say(`${player.name} joined NEA Capability Showcase`);
  player.sendMessage("Showcase runtime active: use the dashboard to probe verified and partial surfaces.");
  send(player, {
    type: "showcase:welcome",
    clientContract: "dao3-client-runtime/v1",
    serverContract: "nea-server-runtime/v1",
    map: { shape: [256, 64, 256], spawn: [128, 9, 128] },
    physics: DEFAULT_PHYSICS,
    capabilities: capabilityMatrix,
  });
  const labEntities = world.searchBox({ lo: [20, 2, 20], hi: [236, 10, 236] });
  send(player, { type: "showcase:search-box", entityCount: labEntities.length, entityIds: labEntities.map(entity => entity.id), status: "partial", obb: "evidence-deferred" });
  world.addCollisionFilter("player", ".api-lab");
  send(player, { type: "showcase:collision-filter", filters: world.collisionFilters(), status: "partial", solver: "evidence-deferred" });
  sendPhysics(player);
});

world.onPlayerLeave(({ player }) => {
  console.log(`[NEA Showcase] player lifecycle leave entity=${player.id}`);
});

world.onVoxelContact(({ player, voxel, axis }) => {
  if (voxel !== 631 || axis.y !== 1) return;
  player.velocity = { x: player.velocity.x, y: 10, z: player.velocity.z };
  send(player, { type: "showcase:contact", kind: "bounce-pad", voxel, force: null, forceStatus: "evidence-deferred" });
});

world.onTriggerEnter(({ player, trigger }) => {
  const status = trigger.tags.includes("checkpoint") ? "verified" : "partial";
  send(player, { type: "showcase:trigger", phase: "enter", triggerId: trigger.id, status });
  if (trigger.tags.includes("hazard")) player.damage(10);
});

world.onTriggerLeave(({ player, trigger }) => {
  send(player, { type: "showcase:trigger", phase: "leave", triggerId: trigger.id, status: "verified" });
});

world.onClick(({ clicker, entity, button, distance, raycast }) => {
  send(clicker, {
    type: "showcase:click",
    scope: "world",
    targetId: entity.id,
    button,
    distance,
    hitVoxel: raycast.hitVoxel,
    status: "verified",
  });
});

for (const lab of world.querySelectorAll(".api-lab")) {
  lab.onClick(({ clicker, entity, button }) => {
    send(clicker, { type: "showcase:click", scope: "entity", targetId: entity.id, button, status: "verified" });
  });
  lab.onInteract(({ entity, targetEntity }) => {
    send(entity, { type: "showcase:interact", scope: "entity", targetId: targetEntity.id, status: "partial", targetBinding: "authoritative-mapped" });
  });
}

world.onInteract(({ entity, targetEntity }) => {
  send(entity, { type: "showcase:interact", scope: "world", targetId: targetEntity.id, status: "partial", targetBinding: "authoritative-mapped" });
});

world.onEntityCreate(({ entity }) => {
  if (!entity.isPlayer) return;
  send(entity, { type: "showcase:lifecycle", phase: "create", entityId: entity.id, status: "verified" });
});

world.onEntityDestroy(({ entity }) => {
  if (!entity.isPlayer) return;
  console.log(`[NEA Showcase] player lifecycle destroy entity=${entity.id}`);
});

world.onTakeDamage(({ entity, attacker, damage, damageType }) => {
  if (!entity.isPlayer) return;
  send(entity, { type: "showcase:damage", damage, damageType, attackerId: attacker?.id ?? null, status: "partial" });
});

world.onDie(({ entity, attacker, damageType }) => {
  if (!entity.isPlayer) return;
  send(entity, { type: "showcase:death", damageType, attackerId: attacker?.id ?? null, status: "partial" });
});

const coreZone = world.addZone({
  selector: "player",
  bounds: { lo: [116, 7, 116], hi: [140, 15, 140] },
});
coreZone.onEnter(({ entity }) => send(entity, { type: "showcase:zone", phase: "enter", zone: "showcase-core", status: "verified" }));
coreZone.onLeave(({ entity }) => send(entity, { type: "showcase:zone", phase: "leave", zone: "showcase-core", status: "verified" }));

world.onPress(({ entity, button, pressed }) => send(entity, { type: "showcase:input", phase: "press", button, pressed, status: "verified" }));
world.onRelease(({ entity, button, pressed }) => send(entity, { type: "showcase:input", phase: "release", button, pressed, status: "verified" }));
world.onFluidEnter(({ entity, voxel }) => send(entity, { type: "showcase:fluid", phase: "enter", voxel, status: "partial", buoyancy: "evidence-deferred" }));
world.onFluidLeave(({ entity, voxel }) => send(entity, { type: "showcase:fluid", phase: "leave", voxel, status: "partial", buoyancy: "evidence-deferred" }));

world.onTick(({ tick, prevTick, elapsedTimeMS, skip }) => {
  if (tick % 100 === 0) {
    for (const player of world.querySelectorAll("player")) {
      send(player, {
        type: "showcase:tick",
        tick,
        prevTick,
        elapsedTimeMS,
        skip,
        physics: { gravity: world.gravity, airFriction: world.airFriction },
      });
    }
  }
});

remoteChannel.onServerEvent(async ({ entity: player, args: event }) => {
  if (!event?.type) return;
  if (event.type === "showcase:ready") send(player, { type: "showcase:ack", message: "client handshake acknowledged" });
  if (event.type === "showcase:set-physics") {
    if (finiteInRange(event.gravity, PHYSICS_LIMITS.gravity)) world.gravity = event.gravity;
    if (finiteInRange(event.airFriction, PHYSICS_LIMITS.airFriction)) world.airFriction = event.airFriction;
    sendPhysics(player);
  }
  if (event.type === "showcase:set-movement") {
    applyMovement(player, event);
    send(player, { type: "showcase:movement", status: "partial", movement: MOVEMENT_PROFILE });
  }
  if (event.type === "showcase:raycast") {
    const result = world.raycast(player.position, { x: 0, y: -1, z: 0 }, { maxDistance: 24 });
    send(player, { type: "showcase:raycast", status: "verified", result: result ? { hitVoxel: result.hitVoxel, hitEntity: result.hitEntity?.id ?? null, distance: result.distance, position: result.hitPosition?.toArray?.() ?? null, normal: result.normal?.toArray?.() ?? null } : null });
  }
  if (event.type === "showcase:storage") {
    const data = storage.getDataStorage("showcase");
    const group = storage.getGroupStorage("showcase");
    const visits = Number(await data.get("visits") ?? 0) + 1;
    await data.set("visits", visits);
    send(player, { type: "showcase:storage", status: "verified", dataVisits: visits, groupScope: group ? "packaged-group" : "evidence-deferred" });
  }
  if (event.type === "showcase:http-check") await probeHttp(player);
  if (event.type === "showcase:broadcast") remoteChannel.broadcastClientEvent({ type: "showcase:broadcast", message: "broadcast path exercised", tick: world.currentTick });
  if (event.type === "showcase:deferred") send(player, { type: "showcase:deferred", items: capabilityMatrix.filter(item => item.status === "evidence-deferred") });
});
