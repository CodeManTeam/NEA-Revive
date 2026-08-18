console.log("[NEA Showcase] client script loaded");

const lines = [];
let lastPhysics = { gravity: -20, airFriction: 0.001 };
let lastStatus = "connecting";

const dashboard = UiText.create();
dashboard.name = "showcase-dashboard";
dashboard.textFontSize = 18;
dashboard.textColor = { r: 0.93, g: 0.96, b: 1, a: 1 };
dashboard.strokeColor = { r: 0.03, g: 0.05, b: 0.09, a: 1 };
dashboard.strokeWidth = 4;
dashboard.horizontalAlignment = "left";
dashboard.verticalAlignment = "top";
dashboard.anchor = { x: 0, y: 0 };
dashboard.position = { x: 24, y: 24 };
dashboard.size = { x: 760, y: 720 };
dashboard.parent = ui;

function render() {
  dashboard.textContent = [
    "NEA CAPABILITY SHOWCASE",
    "256 x 64 x 256  |  preserved Player integration path",
    "",
    `STATUS  ${lastStatus}`,
    `PHYSICS gravity=${lastPhysics.gravity} airFriction=${lastPhysics.airFriction}`,
    "",
    "VERIFIED",
    "  events  |  player lifecycle  |  raycast  |  storage  |  world config",
    "  directed/broadcast RemoteChannel  |  client UI",
    "PARTIAL",
    "  player movement writes  |  allowlisted HTTP probe",
    "EVIDENCE-DEFERRED",
    "  inbound chat  |  posture variants  |  full contact force",
    "",
    "CONTROLS",
    "  pointer lock: send input handshake",
    "  server probes: physics, raycast, storage, HTTP, broadcast",
    "",
    ...lines.slice(-8),
  ].join("\n");
}

function send(type, payload = {}) {
  remoteChannel.sendServerEvent({ type, ...payload });
}

remoteChannel.events.on("client", event => {
  if (event?.type === "showcase:welcome") {
    lastStatus = `${event.serverContract} / ${event.map.shape.join("x")}`;
    lines.push(`welcome: ${event.capabilities.length} capability records`);
  }
  if (event?.type === "showcase:search-box") lines.push(`searchBox: ${event.entityCount} entities (${event.obb})`);
  if (event?.type === "showcase:collision-filter") lines.push(`collisionFilter: ${event.filters.length} registered (${event.solver})`);
  if (event?.type === "showcase:physics") {
    lastPhysics = { gravity: event.gravity, airFriction: event.airFriction };
    lines.push(`physics applied: gravity=${event.gravity}, airFriction=${event.airFriction}`);
  }
  if (event?.type === "showcase:raycast") lines.push(`raycast: ${event.result ? `voxel=${event.result.hitVoxel} distance=${event.result.distance}` : "no hit"}`);
  if (event?.type === "showcase:storage") lines.push(`storage: visit=${event.dataVisits}, scope=${event.groupScope}`);
  if (event?.type === "showcase:http") lines.push(`http: ${event.ok ? "allowlisted response" : "guarded failure"}`);
  if (event?.type === "showcase:broadcast") lines.push("broadcast: received");
  if (event?.type === "showcase:deferred") lines.push(`deferred: ${event.items.map(item => item.id).join(", ")}`);
  if (event?.type === "showcase:tick") lines.push(`tick: ${event.tick} prev=${event.prevTick} elapsed=${event.elapsedTimeMS}ms skip=${event.skip}`);
  if (event?.type === "showcase:contact") lines.push(`contact: ${event.kind} (${event.forceStatus})`);
  if (event?.type === "showcase:click") lines.push(`click: ${event.scope} target=${event.targetId} button=${event.button}`);
  if (event?.type === "showcase:zone") lines.push(`zone: ${event.phase} ${event.zone}`);
  if (event?.type === "showcase:input") lines.push(`input: ${event.phase} ${event.button} pressed=${event.pressed}`);
  if (event?.type === "showcase:fluid") lines.push(`fluid: ${event.phase} voxel=${event.voxel} (${event.buoyancy})`);
  if (event?.type === "showcase:interact") lines.push(`interact: ${event.scope} target=${event.targetId} (${event.targetBinding})`);
  if (event?.type === "showcase:lifecycle") lines.push(`lifecycle: ${event.phase} entity=${event.entityId}`);
  if (event?.type === "showcase:damage") lines.push(`damage: ${event.damage} type=${event.damageType} (${event.status})`);
  if (event?.type === "showcase:death") lines.push(`death: type=${event.damageType} (${event.status})`);
  render();
});

input.pointerLockEvents.add("pointerlockchange", ({ isLocked }) => {
  lastStatus = isLocked ? "pointer locked / input connected" : "pointer unlocked / input connected";
  send("showcase:ready", { pointerLocked: Boolean(isLocked) });
  render();
});

send("showcase:ready", { runtimeApiVersion: "0.1.0" });
send("showcase:set-physics", { gravity: -20, airFriction: 0.001 });
send("showcase:set-movement", { walkSpeed: 0.8, runSpeed: 5.5, jumpPower: 1.05 });
send("showcase:raycast");
send("showcase:storage");
send("showcase:http-check");
send("showcase:broadcast");
send("showcase:deferred");
render();
