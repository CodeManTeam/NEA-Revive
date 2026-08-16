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
    tags: [...entity.tags],
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
    enableInteract: entity.enableInteract,
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
