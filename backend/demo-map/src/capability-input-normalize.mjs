export function normalizeCapabilityAssets(assets) {
  if (!Array.isArray(assets)) throw new Error("Capability asset input must be an array");
  return assets.map((asset, index) => {
    if (typeof asset === "string") return { reference: asset, source: null, bytes: null, sha256: null };
    if (!asset || typeof asset !== "object" || Array.isArray(asset)) throw new Error(`Capability asset input is invalid at ${index}`);
    const reference = asset.name ?? asset.logicalPath ?? asset.id ?? asset.path;
    const source = asset.packagePath ?? asset.source ?? asset.path ?? null;
    const byteLength = asset.bytes instanceof Uint8Array ? asset.bytes.byteLength : asset.bytes;
    const bytes = Number.isInteger(byteLength) && byteLength >= 0 ? byteLength : null;
    if (typeof reference !== "string" || reference.length === 0) throw new Error(`Capability asset input is incomplete at ${index}`);
    return {
      reference,
      source: typeof source === "string" && source.length > 0 ? source : null,
      bytes,
      sha256: typeof asset.sha256 === "string" && asset.sha256.length > 0 ? asset.sha256 : null,
    };
  }).sort((left, right) => left.reference.localeCompare(right.reference) || String(left.source ?? "").localeCompare(String(right.source ?? "")));
}

export function normalizeCapabilityEntities(entities) {
  if (!Array.isArray(entities)) throw new Error("Capability entity input must be an array");
  return entities.map((entity, index) => {
    if (!entity || typeof entity !== "object" || Array.isArray(entity)) throw new Error(`Capability entity input is invalid at ${index}`);
    const taggedId = Array.isArray(entity.tags) ? entity.tags.find(tag => typeof tag === "string" && tag.startsWith("id-"))?.slice(3) : null;
    const id = String(entity.id ?? entity.sourceId ?? taggedId ?? `entity-${index + 1}`);
    const kind = String(entity.kind ?? entity.source?.kind ?? "entity");
    const mesh = entity.mesh ?? entity.source?.mesh ?? entity.visual?.assetPath ?? null;
    return { id, kind, mesh: typeof mesh === "string" && mesh.length > 0 ? mesh : null };
  }).sort((left, right) => left.id.localeCompare(right.id) || left.kind.localeCompare(right.kind));
}

export function normalizeCapabilityStorageScope(storageScope) {
  if (storageScope === undefined || storageScope === null) return { groupId: null };
  if (!storageScope || typeof storageScope !== "object" || Array.isArray(storageScope)) throw new Error("Capability storage scope input is invalid");
  const groupId = storageScope.groupId;
  if (groupId === undefined || groupId === null || groupId === "") return { groupId: null };
  if (typeof groupId !== "string" || groupId.trim() !== groupId || groupId.length > 256 || /[\u0000-\u001f\u007f]/.test(groupId)) throw new Error("Capability storage groupId is invalid");
  return { groupId };
}

export function normalizeCapabilityProjectIdentity(projectIdentity) {
  if (!projectIdentity || typeof projectIdentity !== "object" || Array.isArray(projectIdentity)) throw new Error("Capability project identity input is invalid");
  const projectName = projectIdentity.projectName;
  if (typeof projectName !== "string" || projectName.length === 0 || projectName.trim() !== projectName || projectName.length > 256 || /[\u0000-\u001f\u007f]/.test(projectName)) throw new Error("Capability projectName is invalid");
  return { projectName };
}

export function normalizeCapabilityWorldConfig(worldConfig) {
  if (worldConfig === undefined || worldConfig === null) return { entityLimit: 3400 };
  if (!worldConfig || typeof worldConfig !== "object" || Array.isArray(worldConfig)) throw new Error("Capability world config input is invalid");
  const entityLimit = worldConfig.entityLimit ?? 3400;
  if (!Number.isSafeInteger(entityLimit) || entityLimit < 0 || entityLimit > 1000000) throw new Error("Capability world entityLimit is invalid");
  const hasGravity = worldConfig.gravity !== undefined;
  const hasAirFriction = worldConfig.airFriction !== undefined;
  if (hasGravity !== hasAirFriction) throw new Error("Capability world physics inputs must include gravity and airFriction together");
  if (!hasGravity) return { entityLimit };
  if (!Number.isFinite(worldConfig.gravity)) throw new Error("Capability world gravity is invalid");
  if (!Number.isFinite(worldConfig.airFriction)) throw new Error("Capability world airFriction is invalid");
  return { entityLimit, gravity: worldConfig.gravity, airFriction: worldConfig.airFriction };
}

export function normalizeCapabilityPlayerBody(playerBody) {
  if (!playerBody || typeof playerBody !== "object" || Array.isArray(playerBody)) throw new Error("Capability player body input is missing or invalid");
  const legacyHalfExtents = playerBody.halfExtents;
  const boundsHalfExtents = normalizePositiveBodyVector(playerBody.boundsHalfExtents ?? legacyHalfExtents, "boundsHalfExtents");
  const shapeHalfExtents = normalizePositiveBodyVector(playerBody.shapeHalfExtents ?? legacyHalfExtents, "shapeHalfExtents");
  if (shapeHalfExtents.some((component, index) => component > boundsHalfExtents[index])) throw new Error("Capability player body shapeHalfExtents must fit inside boundsHalfExtents");
  if (playerBody.origin !== "body-center") throw new Error("Capability player body origin must be body-center");
  return {
    profileId: requireNonEmptyText(playerBody.profileId, "profileId"),
    origin: playerBody.origin,
    originStatus: requireNonEmptyText(playerBody.originStatus, "originStatus"),
    sizeStatus: requireNonEmptyText(playerBody.sizeStatus, "sizeStatus"),
    boundsHalfExtents,
    shapeHalfExtents,
    evidence: typeof playerBody.evidence === "string" ? playerBody.evidence : null,
  };
}

export function normalizeCapabilityRuntimeAbi(runtimeCompatibility) {
  if (!runtimeCompatibility || typeof runtimeCompatibility !== "object" || Array.isArray(runtimeCompatibility)) throw new Error("Capability Runtime ABI input is missing or invalid");
  return {
    currentRuntime: withoutGeneratedAt(runtimeCompatibility.currentRuntime),
    compatibilityMatrix: withoutGeneratedAt(runtimeCompatibility.compatibilityMatrix),
    runtimeContracts: withoutGeneratedAt(runtimeCompatibility.runtimeContracts),
  };
}

function withoutGeneratedAt(value) {
  if (Array.isArray(value)) return value.map(withoutGeneratedAt);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).filter(key => key !== "generatedAt").sort().map(key => [key, withoutGeneratedAt(value[key])]));
}

function normalizePositiveBodyVector(value, name) {
  const components = Array.isArray(value) ? value : [value?.x, value?.y, value?.z];
  if (components.length !== 3 || components.some(component => !Number.isFinite(component) || component <= 0 || component > 4)) throw new Error(`Capability player body ${name} is invalid`);
  return [components[0], components[1], components[2]];
}

function requireNonEmptyText(value, name) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Capability player body ${name} is invalid`);
  return value;
}
