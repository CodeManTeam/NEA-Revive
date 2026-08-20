export class EntityBackendBridge {
  #validatedMeshNames;
  #createEntity;
  #writeEntityState;
  #destroyEntity;
  #reportError;

  constructor({ validatedMeshNames = [], createEntity, writeEntityState, destroyEntity, reportError }) {
    this.#validatedMeshNames = new Set(validatedMeshNames);
    this.#createEntity = createEntity;
    this.#writeEntityState = writeEntityState;
    this.#destroyEntity = destroyEntity;
    this.#reportError = reportError;
  }

  project(entity, onProjected = () => {}) {
    if (!this.#hasValidatedMesh(entity)) return;
    Promise.resolve(this.#createEntity(runtimeEntityProjectionPayload(entity))).then(result => {
      const entityId = result?.entityId;
      if (!Number.isSafeInteger(entityId) || entityId < 1) {
        throw new Error("Backend entity projection returned an invalid entity id");
      }
      entity._backendEntityId = entityId;
      entity._backendEntityBound = true;
      if (entity.destroyed) return this.#destroyEntity(entityId);
      this.queueStateWrite(entity);
      onProjected(entity);
      return undefined;
    }).catch(error => this.#reportError("entity-create", error));
  }

  destroy(entity) {
    if (!hasBackendEntityId(entity)) return;
    Promise.resolve(this.#destroyEntity(entity._backendEntityId)).catch(error => this.#reportError("entity-destroy", error));
  }

  queueStateWrite(entity) {
    if (!hasBackendEntityId(entity)) return;
    Promise.resolve(this.#writeEntityState(entity._backendEntityId, runtimeEntityStatePayload(entity)))
      .catch(error => this.#reportError("entity-state-write", error));
  }

  #hasValidatedMesh(entity) {
    return typeof entity.mesh === "string" && entity.mesh.length > 0 && this.#validatedMeshNames.has(entity.mesh);
  }
}

function hasBackendEntityId(entity) {
  return Number.isSafeInteger(entity._backendEntityId) && entity._backendEntityId > 0;
}

export function runtimeEntityProjectionPayload(entity) {
  return {
    position: entity.position.toArray(),
    velocity: entity.velocity.toArray(),
    name: entity.name,
    tags: entity.tags(),
    mesh: entity.mesh,
    bounds: entity.bounds.toArray(),
    nameplate: runtimeEntityNameplatePayload(entity),
    collides: entity.collides,
    fixed: entity.fixed,
    gravity: entity.gravity,
    mass: entity.mass,
    friction: entity.friction,
    restitution: entity.restitution,
    meshScale: entity.meshScale.toArray(),
    meshOrientation: quaternionArray(entity.meshOrientation),
    meshInvisible: entity.meshInvisible,
    meshMetalness: entity.meshMetalness,
    meshEmissive: entity.meshEmissive,
    meshShininess: entity.meshShininess,
    ...runtimeEntityInteractionPayload(entity),
  };
}

export function runtimeEntityStatePayload(entity) {
  return {
    position: entity.position.toArray(),
    velocity: entity.velocity.toArray(),
    orientation: quaternionArray(entity.meshOrientation),
    collides: Boolean(entity.collides),
    fixed: Boolean(entity.fixed),
    gravity: Boolean(entity.gravity),
    mass: Number(entity.mass),
    friction: Number(entity.friction),
    restitution: Number(entity.restitution),
    nameplate: runtimeEntityNameplatePayload(entity),
    model: runtimeEntityModelPayload(entity),
    ...runtimeEntityInteractionPayload(entity),
    ...(hasParticleState(entity) ? { particles: runtimeEntityParticlePayload(entity) } : {}),
  };
}

function runtimeEntityInteractionPayload(entity) {
  return {
    enableInteract: Boolean(entity.enableInteract),
    interactHint: String(entity.interactHint ?? ""),
    interactRadius: Number(entity.interactRadius ?? 3),
  };
}

function quaternionArray(value) {
  return [value.w, value.x, value.y, value.z];
}

function runtimeEntityNameplatePayload(entity) {
  if (!entity.showEntityName) return null;
  return { text: entity.customName, radius: entity.nameRadius, color: [entity.nameColor.r, entity.nameColor.g, entity.nameColor.b] };
}

function runtimeEntityModelPayload(entity) {
  return {
    invisible: entity.meshInvisible,
    color: [entity.meshColor.r, entity.meshColor.g, entity.meshColor.b, entity.meshColor.a].map(component => Math.round(component * 255)),
    scale: entity.meshScale.toArray(),
    offset: entity.meshOffset.toArray(),
    emissive: entity.meshEmissive,
    shininess: entity.meshShininess,
    metalness: entity.meshMetalness,
  };
}

function runtimeEntityParticlePayload(entity) {
  return {
    rate: Number(entity.particleRate ?? 0),
    rateSpread: Number(entity.particleRateSpread ?? 0),
    limit: Number(entity.particleLimit ?? 100),
    lifetime: Number(entity.particleLifetime ?? 10),
    lifetimeSpread: Number(entity.particleLifetimeSpread ?? 0),
    size: Array.isArray(entity.particleSize) ? [...entity.particleSize] : [],
    sizeSpread: Number(entity.particleSizeSpread ?? 0),
    color: structuredClone(entity.particleColor ?? []),
    velocity: vectorArray(entity.particleVelocity),
    velocitySpread: vectorArray(entity.particleVelocitySpread),
    damping: Number(entity.particleDamping ?? 0),
  };
}

function hasParticleState(entity) {
  return Number(entity.particleRate ?? 0) !== 0
    || Number(entity.particleRateSpread ?? 0) !== 0
    || Number(entity.particleLimit ?? 100) !== 100
    || Number(entity.particleLifetime ?? 10) !== 10
    || Number(entity.particleLifetimeSpread ?? 0) !== 0
    || (Array.isArray(entity.particleSize) && entity.particleSize.some(value => Number(value) !== 1))
    || Number(entity.particleSizeSpread ?? 0) !== 0
    || (Array.isArray(entity.particleColor) && entity.particleColor.length > 0)
    || vectorArray(entity.particleVelocity).some(value => value !== 0)
    || vectorArray(entity.particleVelocitySpread).some(value => value !== 0)
    || Number(entity.particleDamping ?? 0) !== 0;
}

function vectorArray(value) {
  if (value && typeof value.toArray === "function") return value.toArray();
  if (Array.isArray(value)) return value.slice(0, 3).map(Number);
  return [Number(value?.x ?? 0), Number(value?.y ?? 0), Number(value?.z ?? 0)];
}
