console.log("[NEA Demo] historical Player client script loaded");

const playerMovementApiFields = Object.freeze([
  "walkSpeed",
  "runSpeed",
  "runAcceleration",
  "jumpPower",
  "jumpSpeedFactor",
  "jumpAccelerationFactor",
  "doubleJumpPower",
  "crouchSpeed",
  "crouchAcceleration",
  "flySpeed",
  "flyAcceleration",
  "swimAcceleration",
  "swimSpeed",
  "walkAcceleration",
]);

const verifiedCapabilities = Object.freeze([
  "P0: Native Player project-package admission",
  "P0: client/server Script Runtimes",
  "P0: RemoteChannel directed + broadcast delivery",
  "P0: client-owned UI + pointer-lock ingress",
  "P1: persistent local GameStorage",
  "P1: guarded server GameHttpAPI.fetch",
]);

const evidenceBoundary = "deferred: historical physics, chat ingress, group storage";

const runtimeStatus = UiText.create();
runtimeStatus.name = "NeaRuntimeStatus";
runtimeStatus.textContent = [
  "NEA Client Runtime: active",
  "contract: dao3-client-runtime/v1",
  "server: connecting",
  ...verifiedCapabilities,
  evidenceBoundary,
].join("\n");
runtimeStatus.textFontSize = 16;
runtimeStatus.textColor.copy(Vec3.create({ r: 255, g: 255, b: 255 }));
runtimeStatus.textStrokeColor.copy(Vec3.create({ r: 0, g: 0, b: 0 }));
runtimeStatus.textStrokeThickness = 2;
runtimeStatus.textXAlignment = "Left";
runtimeStatus.textYAlignment = "Top";
runtimeStatus.autoWordWrap = false;
runtimeStatus.anchor.copy(Vec2.create({ x: 0, y: 0 }));
runtimeStatus.position.offset.copy(Vec2.create({ x: 20, y: 20 }));
runtimeStatus.size.offset.copy(Vec2.create({ x: 760, y: 310 }));
runtimeStatus.parent = ui;

let lastServerStatus = "server: connecting";
let lastMovementStatus = "movement: waiting for server values";
let lastHttpStatus = "http: idle";

function updateRuntimeStatus(lines) {
  runtimeStatus.textContent = [
    "NEA Client Runtime: active",
    ...lines,
    ...verifiedCapabilities,
    evidenceBoundary,
    lastMovementStatus,
    lastHttpStatus,
  ].join("\n");
}

function finiteMovementPatch(input) {
  const patch = {};
  for (const field of playerMovementApiFields) {
    const value = input?.[field];
    if (typeof value === "number" && Number.isFinite(value)) patch[field] = value;
  }
  return patch;
}

function applyMovementPatch(target, patch) {
  if (!target || typeof target !== "object") return 0;
  let applied = 0;
  for (const [field, value] of Object.entries(patch)) {
    try {
      if (field in target || Object.isExtensible(target)) {
        target[field] = value;
        applied += 1;
      }
    } catch {
      // Some recovered runtime objects are read-only proxies; try the next candidate.
    }
  }
  return applied;
}

function applyPlayerMovementSync(event) {
  const patch = finiteMovementPatch(event?.playerMovementApiExample ?? event?.movement ?? event);
  const fields = Object.keys(patch);
  if (fields.length === 0) return;

  let applied = 0;
  const candidates = [
    globalThis.player,
    globalThis.localPlayer,
    globalThis.me,
    globalThis.world?.player,
    globalThis.world?.localPlayer,
    globalThis.game?.player,
    globalThis.game?.localPlayer,
    globalThis.app?.game?.player,
    globalThis.app?.game?.localPlayer,
  ];
  for (const candidate of candidates) applied += applyMovementPatch(candidate, patch);

  const statePlayers = globalThis.state?.players
    ?? globalThis.game?.state?.players
    ?? globalThis.app?.game?.state?.players
    ?? globalThis.app?.game?.state?.replica?.players;
  if (Array.isArray(statePlayers)) {
    for (const statePlayer of statePlayers) applied += applyMovementPatch(statePlayer, patch);
  }

  globalThis.__neaPlayerMovementApi = Object.freeze({ ...patch });
  lastMovementStatus = `movement: ${fields.map(field => `${field}=${patch[field]}`).join(", ")}; local candidates updated=${applied}`;
  console.log(`[NEA Demo] Player movement API synchronized: ${JSON.stringify(patch)}; local candidates updated=${applied}`);
}

input.pointerLockEvents.add("pointerlockchange", ({ isLocked }) => {
  const pointerStatus = isLocked ? "pointer: locked" : "pointer: unlocked";
  updateRuntimeStatus([
    "client: dao3-client-runtime/v1",
    lastServerStatus,
    pointerStatus,
  ]);
  remoteChannel.sendServerEvent({
    type: "nea-demo:pointer-lock",
    isLocked: Boolean(isLocked),
  });
});

remoteChannel.events.on("client", event => {
  if (event?.type === "nea-demo:welcome") {
    console.log(`[NEA Demo] welcome received at server tick ${event.tick}`);
    const collision = event.collision;
    lastServerStatus = `server: ${event.serverContract} @ tick ${event.tick}`;
    applyPlayerMovementSync(event);
    updateRuntimeStatus([
      `client: ${event.clientContract}`,
      lastServerStatus,
      `bounds: ${collision.boundsHalfExtents.join(" / ")}`,
      `shape: ${collision.shapeHalfExtents.join(" / ")}`,
      `posture shapes: ${event.postureStatus}`,
    ]);
  }
  if (event?.type === "nea-demo:player-movement-api-applied") {
    applyPlayerMovementSync(event);
    updateRuntimeStatus([
      "client: dao3-client-runtime/v1",
      lastServerStatus,
      "movement event: applied",
    ]);
  }
  if (event?.type === "nea-demo:ack") {
    console.log(`[NEA Demo] ${event.message}`);
    lastServerStatus = "server: client ready acknowledged";
    updateRuntimeStatus([
      "client: dao3-client-runtime/v1",
      lastServerStatus,
      "input: waiting",
    ]);
  }
  if (event?.type === "nea-demo:pointer-lock-ack") {
    const pointerStatus = event.isLocked ? "input: pointer locked" : "input: pointer unlocked";
    updateRuntimeStatus([
      "client: dao3-client-runtime/v1",
      lastServerStatus,
      pointerStatus,
    ]);
  }
  if (event?.type === "nea-demo:bounce") {
    console.log(`[NEA Demo] server physics bounce at ${event.position.join(",")}`);
  }
  if (event?.type === "nea-demo:checkpoint") {
    console.log(`[NEA Demo] checkpoint reached: ${event.checkpointId}`);
  }
  if (event?.type === "nea-demo:hazard") {
    console.log(`[NEA Demo] hazard ${event.hazardId}, health=${event.health}`);
  }
  if (event?.type === "nea-demo:hazard-clear") {
    console.log(`[NEA Demo] left hazard ${event.hazardId}`);
  }
  if (event?.type === "nea-demo:http-result") {
    lastHttpStatus = `http: ${event.status} ${event.statusText} (${event.bodyLength} bytes)`;
    console.log(`[NEA Demo] server HTTP fetch: ${lastHttpStatus} content-type=${event.contentType}`);
    updateRuntimeStatus([
      "client: dao3-client-runtime/v1",
      lastServerStatus,
      lastHttpStatus,
    ]);
  }
  if (event?.type === "nea-demo:http-error") {
    lastHttpStatus = `http: failed - ${event.message}`;
    console.log(`[NEA Demo] server HTTP fetch failed: ${event.message}`);
    updateRuntimeStatus([
      "client: dao3-client-runtime/v1",
      lastServerStatus,
      lastHttpStatus,
    ]);
  }
});

remoteChannel.sendServerEvent({
  type: "nea-demo:ready",
  runtimeApiVersion: "0.1.0"
});
