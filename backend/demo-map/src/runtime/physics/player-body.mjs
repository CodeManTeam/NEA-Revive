import { Vector3 } from "../vector3.mjs";
import { playerAabb } from "./aabb.mjs";

export class PlayerPhysicsBody {
  constructor(options = {}) {
    const profile = requirePlayerBodyProfile(options.profile);
    this.position = Vector3.from(options.position ?? [0, 0, 0]);
    this.velocity = Vector3.from(options.velocity ?? [0, 0, 0]);
    this.mass = Number.isFinite(options.mass) ? options.mass : 1;
    this.profile = profile;
    this.boundsHalfExtents = profile.boundsHalfExtents;
    this.shapeHalfExtents = profile.shapeHalfExtents;
    this.halfExtents = this.shapeHalfExtents;
    this.dimensions = profile.shapeDimensions;
    this.shapeSource = "player-body-profile";
    this.grounded = false;
    this.contacts = new Map();
    this.fluids = new Map();
    this.triggers = new Map();
  }

  applyAuthoritativePostureShape(shape) {
    if (shape === null) return false;
    if (!shape || typeof shape !== "object" || Array.isArray(shape)) {
      throw new Error("Authoritative posture shape must be null or a complete shape record");
    }
    if (!Object.hasOwn(shape, "boundsHalfExtents") || !Object.hasOwn(shape, "shapeHalfExtents")) {
      throw new Error("Authoritative posture shape requires complete boundsHalfExtents and shapeHalfExtents");
    }
    const boundsHalfExtents = requireHalfExtents(shape.boundsHalfExtents, "authoritative boundsHalfExtents");
    const shapeHalfExtents = requireHalfExtents(shape.shapeHalfExtents, "authoritative shapeHalfExtents");
    if (["x", "y", "z"].some(axis => shapeHalfExtents[axis] > boundsHalfExtents[axis])) {
      throw new Error("Authoritative posture shapeHalfExtents must fit inside boundsHalfExtents");
    }
    this.boundsHalfExtents = boundsHalfExtents;
    this.shapeHalfExtents = shapeHalfExtents;
    this.halfExtents = shapeHalfExtents;
    this.dimensions = dimensions(shapeHalfExtents);
    this.shapeSource = "authoritative-state";
    return true;
  }

  collisionSnapshot() {
    const bounds = playerAabb(this.position, this.boundsHalfExtents);
    const shape = playerAabb(this.position, this.shapeHalfExtents);
    return Object.freeze({
      profileId: this.profile.profileId,
      origin: this.profile.origin,
      originStatus: this.profile.originStatus,
      sizeStatus: this.profile.sizeStatus,
      shapeSource: this.shapeSource,
      boundsHalfExtents: Object.freeze({ ...this.boundsHalfExtents }),
      shapeHalfExtents: Object.freeze({ ...this.shapeHalfExtents }),
      halfExtents: Object.freeze({ ...this.shapeHalfExtents }),
      dimensions: Object.freeze({ ...this.dimensions }),
      aabb: bounds,
      shapeAabb: shape,
    });
  }
}

function requirePlayerBodyProfile(value) {
  if (!value || typeof value !== "object") throw new Error("PlayerPhysicsBody requires an explicit player body profile");
  if (value.origin !== "body-center") throw new Error(`Unsupported player body origin: ${value.origin}`);
  const boundsHalfExtents = requireHalfExtents(value.boundsHalfExtents ?? value.halfExtents, "boundsHalfExtents");
  const shapeHalfExtents = requireHalfExtents(value.shapeHalfExtents ?? value.halfExtents, "shapeHalfExtents");
  if (["x", "y", "z"].some(axis => shapeHalfExtents[axis] > boundsHalfExtents[axis])) throw new Error("Player body shapeHalfExtents must fit inside boundsHalfExtents");
  return Object.freeze({
    profileId: String(value.profileId),
    origin: value.origin,
    originStatus: String(value.originStatus),
    sizeStatus: String(value.sizeStatus),
    boundsHalfExtents,
    shapeHalfExtents,
    boundsDimensions: dimensions(boundsHalfExtents),
    shapeDimensions: dimensions(shapeHalfExtents),
    evidence: String(value.evidence ?? ""),
  });
}

function requireHalfExtents(value, name) {
  const components = Array.isArray(value) ? value : [value?.x, value?.y, value?.z];
  if (components.length !== 3 || !components.every(component => Number.isFinite(component) && component > 0)) {
    throw new Error(`Player body profile ${name} must be positive finite numbers`);
  }
  return Object.freeze({ x: components[0], y: components[1], z: components[2] });
}

function dimensions(halfExtents) {
  return Object.freeze({ width: halfExtents.x * 2, height: halfExtents.y * 2, depth: halfExtents.z * 2 });
}
