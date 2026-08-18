console.log("NEA Script Lab server script loaded");

const beacon = world.querySelector(".demo-beacon");

const playerMovementApiExample = Object.freeze({
  walkSpeed: 0.7,
  runSpeed: 5,
  runAcceleration: 0.36,
  jumpPower: 0.98,
  jumpSpeedFactor: 0.86,
  jumpAccelerationFactor: 0.56,
  doubleJumpPower: 0.92,
  crouchSpeed: 0.105,
  crouchAcceleration: 0.095,
  flySpeed: 2.05,
  flyAcceleration: 2.05,
  swimAcceleration: 0.105,
  swimSpeed: 0.41,
  walkAcceleration: 0.195,
});

function applyPlayerMovementApiExample(player) {
  // 新增的 Player API 示例：这些字段会通过 player-state 写入后端，并同步到前端 PUBLIC PlayerSchema。
  player.walkSpeed = playerMovementApiExample.walkSpeed;
  player.runSpeed = playerMovementApiExample.runSpeed;
  player.runAcceleration = playerMovementApiExample.runAcceleration;
  player.jumpPower = playerMovementApiExample.jumpPower;
  player.jumpSpeedFactor = playerMovementApiExample.jumpSpeedFactor;
  player.jumpAccelerationFactor = playerMovementApiExample.jumpAccelerationFactor;
  player.doubleJumpPower = playerMovementApiExample.doubleJumpPower;
  player.crouchSpeed = playerMovementApiExample.crouchSpeed;
  player.crouchAcceleration = playerMovementApiExample.crouchAcceleration;
  player.flySpeed = playerMovementApiExample.flySpeed;
  player.flyAcceleration = playerMovementApiExample.flyAcceleration;
  player.swimAcceleration = playerMovementApiExample.swimAcceleration;
  player.swimSpeed = playerMovementApiExample.swimSpeed;
  player.walkAcceleration = playerMovementApiExample.walkAcceleration;
}

world.onPlayerJoin(({ player }) => {
  player.name = `Explorer-${player.id.split("-").at(-1)}`;
  const syncPlayerMovementApiExample = () => {
    applyPlayerMovementApiExample(player);
    remoteChannel.sendClientEvent(player, {
      type: "nea-demo:player-movement-api-applied",
      playerMovementApiExample,
    });
  };
  // 前端 PUBLIC 物理会话可能晚于脚本 onPlayerJoin 完成握手；短暂重复写入同一 player-state 桥，避免首帧竞态。
  for (const delay of [0, 100, 300, 700, 1200]) setTimeout(syncPlayerMovementApiExample, delay);
  world.say(`${player.name} joined NEA Script Lab`);
  player.sendMessage("Server Script Runtime is active.");
  if (beacon) beacon.addTag("active");
  remoteChannel.sendClientEvent(player, {
    type: "nea-demo:welcome",
    tick: world.currentTick,
    clientContract: "dao3-client-runtime/v1",
    serverContract: "nea-server-runtime/v1",
    collision: {
      boundsHalfExtents: Object.values(player.snapshot().collision.boundsHalfExtents),
      shapeHalfExtents: Object.values(player.snapshot().collision.shapeHalfExtents),
    },
    postureStatus: "standing confirmed; crouch/fly unresolved",
    playerMovementApiExample,
  });
});

world.onVoxelContact(({ player, voxel, axis, force }) => {
  if (voxel !== 631 || axis.y !== 1) return;
  if (force === null) console.warn("Historical contact force remains unresolved in the compatibility runtime.");
  player.velocity = { x: player.velocity.x, y: 10, z: player.velocity.z };
  remoteChannel.sendClientEvent(player, {
    type: "nea-demo:bounce",
    position: player.position.toArray(),
  });
});

world.onTriggerEnter(({ player, trigger }) => {
  if (trigger.tags.includes("checkpoint")) {
    remoteChannel.sendClientEvent(player, {
      type: "nea-demo:checkpoint",
      checkpointId: trigger.id,
    });
  }
  if (trigger.tags.includes("hazard")) {
    const health = player.damage(25);
    player.applyImpulse({ x: -4, y: 6, z: 0 });
    remoteChannel.sendClientEvent(player, {
      type: "nea-demo:hazard",
      hazardId: trigger.id,
      health,
    });
  }
});

world.onTriggerLeave(({ player, trigger }) => {
  if (!trigger.tags.includes("hazard")) return;
  remoteChannel.sendClientEvent(player, {
    type: "nea-demo:hazard-clear",
    hazardId: trigger.id,
  });
});

remoteChannel.onServerEvent(({ entity: player, args: event }) => {
  if (event?.type === "nea-demo:ready") {
    world.say(`${player.name} completed the Player handshake`);
    remoteChannel.sendClientEvent(player, {
      type: "nea-demo:ack",
      message: "server runtime received client ready",
    });
  }
  if (event?.type === "nea-demo:pointer-lock") {
    remoteChannel.sendClientEvent(player, {
      type: "nea-demo:pointer-lock-ack",
      isLocked: Boolean(event.isLocked),
    });
  }
  if (event?.type === "nea-demo:probe-interactions") {
    player.position = [25, 5, 38];
    player.velocity = [0, 0, 0];
    setTimeout(() => {
      player.position = [41, 5, 38];
      player.velocity = [0, 0, 0];
    }, 100);
  }
});

world.onTick(({ tick }) => {
  if (tick % 200 === 0) console.log(`runtime heartbeat tick=${tick}`);
});
