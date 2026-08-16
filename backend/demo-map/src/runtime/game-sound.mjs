import { Vector3 } from "./vector3.mjs";

export class Sound {
  constructor(resume, setCurrentTime, pause, stop) {
    this.resume = resume;
    this.setCurrentTime = setCurrentTime;
    this.pause = pause;
    this.stop = stop;
  }
}

export function normalizeWorldSound(spec) {
  if (typeof spec === "string") return soundSpec(spec, { type: "global" }, 1, 1, 0);
  if (!spec || typeof spec !== "object") throw new Error("invalid arguments world.sound()");
  const radius = Number(spec.radius || 0);
  return soundSpec(
    String(spec.sample),
    Object.hasOwn(spec, "position") && radius ? { type: "position", data: Vector3.from(spec.position).toArray() } : { type: "global" },
    Object.hasOwn(spec, "gain") ? Number(spec.gain || 0) : 1,
    Object.hasOwn(spec, "pitch") ? Number(spec.pitch || 0) : 1,
    radius,
  );
}

export function normalizeEntitySound(spec, entityId) {
  if (!Number.isSafeInteger(entityId) || entityId < 1) throw new Error("Entity sound requires a projected backend entity");
  if (typeof spec === "string") return soundSpec(spec, { type: "entity", data: entityId }, 1, 1, 32);
  if (!spec || typeof spec !== "object") throw new Error("invalid arguments entity.sound()");
  return soundSpec(
    String(spec.sample),
    { type: "entity", data: entityId },
    Object.hasOwn(spec, "gain") ? Number(spec.gain || 0) : 1,
    Object.hasOwn(spec, "pitch") ? Number(spec.pitch || 0) : 1,
    Object.hasOwn(spec, "radius") ? Number(spec.radius || 0) : 32,
  );
}

export function normalizePlayerSound(spec, playerId) {
  if (!Number.isSafeInteger(playerId) || playerId < 1) throw new Error("Player sound requires an authoritative backend player");
  if (typeof spec === "string") return soundSpec(spec, { type: "player", data: playerId }, 1, 1, 0);
  if (!spec || typeof spec !== "object") throw new Error("invalid arguments player.sound()");
  return soundSpec(
    String(spec.sample),
    { type: "player", data: playerId },
    Object.hasOwn(spec, "gain") ? Number(spec.gain || 0) : 1,
    Object.hasOwn(spec, "pitch") ? Number(spec.pitch || 0) : 1,
    0,
  );
}

function soundSpec(sample, position, gain, pitch, radius) {
  if (!(gain >= 0)) throw new Error("gain, must be >= 0");
  if (!(pitch >= 0.1)) throw new Error("min pitch scaling is 0.1");
  return Object.freeze({ sample, position: Object.freeze(position), gain, pitch, radius });
}
