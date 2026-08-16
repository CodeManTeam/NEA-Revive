import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

export const MAP_FORMAT = "nea-map/v1";
export const TERRAIN_FORMAT = "nea-terrain/v1";
export const PHYSICS_FORMAT = "nea-physics/v1";
export const ENVIRONMENT_FORMAT = "nea-recovered-environment/v1";
export const RUNTIME_API_VERSION = "0.1.0";
export const MAX_EXPANDED_VOXELS = 1_000_000;

export async function loadMapSource(rootDirectory) {
  const root = resolve(rootDirectory);
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
    throw new Error("Map source root must be a real directory");
  }

  const manifest = validateMapManifest(await readJson(root, "nea.map.json"));
  const terrain = validateTerrainSource(await readJson(root, manifest.world.terrain), manifest.world.shape);
  const entities = validateEntitySource(await readJson(root, manifest.world.entities), manifest.world.shape);
  const environment = manifest.world.environment === null
    ? null
    : validateEnvironmentSource(await readJson(root, manifest.world.environment));
  const assets = manifest.assets;
  const ui = manifest.ui === null ? null : validateUiSource(await readJson(root, manifest.ui));
  const physics = manifest.world.physics === null
    ? defaultPhysicsSource()
    : validatePhysicsSource(await readJson(root, manifest.world.physics), manifest.world.shape);
  await Promise.all(manifest.scripts.serverModules.map(modulePath => assertRegularFile(root, modulePath)));
  await Promise.all(manifest.scripts.clientModules.map(modulePath => assertRegularFile(root, modulePath)));
  await Promise.all(assets.map(asset => assertRegularFile(root, asset.path)));

  return Object.freeze({ root, manifest, terrain, entities, environment, physics, assets, ui });
}

export function validateMapManifest(value) {
  const record = requireRecord(value, "/");
  if (record.formatVersion !== MAP_FORMAT) throw new Error(`Unsupported map format: ${record.formatVersion}`);
  const display = requireRecord(record.display, "/display");
  const runtime = requireRecord(record.runtime, "/runtime");
  const world = requireRecord(record.world, "/world");
  const scripts = requireRecord(record.scripts, "/scripts");
  const shape = requireIntegerVector(world.shape, "/world/shape", 1, 1024);
  if (shape.some(component => component % 32 !== 0)) {
    throw new Error("Recovered Player requires every world dimension to be divisible by 32");
  }
  const spawn = requireFiniteVector(world.spawn, "/world/spawn");
  if (spawn.some((component, index) => component < 0 || component >= shape[index])) {
    throw new Error("World spawn is outside world shape");
  }
  const serverCapabilities = validateCapabilities(
    scripts.serverCapabilities ?? scripts.capabilities ?? [],
    scripts.serverCapabilities === undefined ? "/scripts/capabilities" : "/scripts/serverCapabilities",
  );
  const clientCapabilities = validateCapabilities(scripts.clientCapabilities ?? [], "/scripts/clientCapabilities");
  const server = requirePackagePath(scripts.server, "/scripts/server");
  const client = scripts.client === null || scripts.client === undefined
    ? null
    : requirePackagePath(scripts.client, "/scripts/client");
  const serverModules = validateModulePaths(scripts.serverModules ?? [server], "/scripts/serverModules", server);
  const clientModules = client === null
    ? validateModulePaths(scripts.clientModules ?? [], "/scripts/clientModules", null)
    : validateModulePaths(scripts.clientModules ?? [client], "/scripts/clientModules", client);

  return Object.freeze({
    formatVersion: MAP_FORMAT,
    id: requireIdentifier(record.id, "/id"),
    display: Object.freeze({
      name: requireText(display.name, "/display/name", 120),
      description: display.description === undefined ? "" : requireText(display.description, "/display/description", 4096),
    }),
    runtime: Object.freeze({
      apiVersion: requireVersion(runtime.apiVersion, "/runtime/apiVersion"),
      tickRate: requireInteger(runtime.tickRate, "/runtime/tickRate", 1, 120),
      clientContract: requireContract(runtime.clientContract, "/runtime/clientContract", "dao3-client-runtime/"),
      serverContract: requireContract(runtime.serverContract, "/runtime/serverContract", "nea-server-runtime/"),
      compatibilityLevel: requireCompatibilityLevel(runtime.compatibilityLevel, "/runtime/compatibilityLevel"),
      groupId: runtime.groupId === undefined || runtime.groupId === null || runtime.groupId === "" ? null : requireGroupId(runtime.groupId, "/runtime/groupId"),
    }),
    world: Object.freeze({
      shape,
      spawn,
      entityLimit: world.entityLimit === undefined ? 3400 : requireInteger(world.entityLimit, "/world/entityLimit", 0, 1000000),
      terrain: requirePackagePath(world.terrain, "/world/terrain"),
      entities: requirePackagePath(world.entities, "/world/entities"),
      environment: world.environment === undefined || world.environment === null
        ? null
        : requirePackagePath(world.environment, "/world/environment"),
      physics: world.physics === undefined || world.physics === null
        ? null
        : requirePackagePath(world.physics, "/world/physics"),
    }),
    assets: Object.freeze(validateAssetSource(record.assets ?? [], "/assets")),
    ui: record.ui === undefined || record.ui === null ? null : requirePackagePath(record.ui, "/ui"),
    scripts: Object.freeze({
      server,
      client,
      serverModules: Object.freeze(serverModules),
      clientModules: Object.freeze(clientModules),
      serverCapabilities: Object.freeze(serverCapabilities),
      clientCapabilities: Object.freeze(clientCapabilities),
    }),
  });
}

function requireGroupId(value, path) {
  const groupId = requireText(value, path, 256);
  if (groupId.trim() !== groupId || /[\u0000-\u001f\u007f]/.test(groupId)) throw new Error(`${path} must not contain surrounding whitespace or control characters`);
  return groupId;
}

export function validateUiSource(value) {
  const record = requireRecord(value, "/ui");
  if (record.format !== "nea-recovered-client-ui" || record.version !== 1 || record.sourceMessage !== "gameUI.reset") throw new Error("Unsupported client UI source");
  if (typeof record.running !== "boolean") throw new Error("/ui/running must be boolean");
  const uiTreeState = validateUiTreeBinding(record.defaultScreenId, record.uiTree);
  const pictureAssets = requireRecord(record.pictureAssets, "/ui/pictureAssets");
  const validatedPictures = {};
  for (const [name, value] of Object.entries(pictureAssets)) {
    const asset = requireRecord(value, `/ui/pictureAssets/${name}`);
    if (typeof asset.hash !== "string" || typeof asset.metadataHash !== "string" || !Number.isInteger(asset.width) || !Number.isInteger(asset.height)) throw new Error(`Invalid client UI picture asset: ${name}`);
    validatedPictures[name] = Object.freeze({ hash: asset.hash, metadataHash: asset.metadataHash, width: asset.width, height: asset.height });
  }
  return Object.freeze({ format: "nea-recovered-client-ui", version: 1, sourceMessage: "gameUI.reset", running: record.running, defaultScreenId: uiTreeState.defaultScreenId, pictureAssets: Object.freeze(validatedPictures), uiTree: uiTreeState.uiTree });
}

export function validateUiTreeBinding(defaultScreenIdValue, sourceTree) {
  const defaultScreenId = requireText(defaultScreenIdValue, "/ui/defaultScreenId", 512);
  const tree = requireRecord(sourceTree, "/ui/uiTree");
  const uiTree = {};
  for (const [id, value] of Object.entries(tree)) {
    const node = requireRecord(value, `/ui/uiTree/${id}`);
    if (node.id !== id || !Number.isInteger(node.type) || typeof node.name !== "string" || typeof node.parentId !== "string" || !Array.isArray(node.childrenIds) || !node.childrenIds.every(childId => typeof childId === "string")) throw new Error(`Invalid client UI node: ${id}`);
    uiTree[id] = Object.freeze({ ...node, childrenIds: Object.freeze([...node.childrenIds]) });
  }
  const root = uiTree.ROOT_ID;
  if (!root || root.type !== 0 || root.parentId !== "") throw new Error("Client UI tree must contain ROOT_ID");
  const defaultScreen = uiTree[defaultScreenId];
  if (!defaultScreen || defaultScreen.parentId !== "ROOT_ID" || defaultScreen.value?.type !== "screen") throw new Error("Client UI default screen is missing or invalid");
  for (const node of Object.values(uiTree)) {
    for (const childId of node.childrenIds) if (!uiTree[childId] || uiTree[childId].parentId !== node.id) throw new Error(`Invalid client UI child link: ${node.id} -> ${childId}`);
    if (node.id !== "ROOT_ID" && (!uiTree[node.parentId] || !uiTree[node.parentId].childrenIds.includes(node.id))) throw new Error(`Invalid client UI parent link: ${node.id}`);
  }
  return Object.freeze({ defaultScreenId, uiTree: Object.freeze(uiTree) });
}

function validateAssetSource(value, path) {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  const names = new Set();
  return value.map((asset, index) => {
    const record = requireRecord(asset, `${path}/${index}`);
    const name = requireText(record.name, `${path}/${index}/name`, 512);
    const assetPath = requirePackagePath(record.path, `${path}/${index}/path`);
    if (names.has(name)) throw new Error(`${path} contains duplicate asset name: ${name}`);
    names.add(name);
    return Object.freeze({ name, path: assetPath, kind: record.kind === undefined ? null : requireText(record.kind, `${path}/${index}/kind`, 80) });
  });
}

function validateModulePaths(value, path, entry) {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array of package paths`);
  const modules = value.map((modulePath, index) => requirePackagePath(modulePath, `${path}/${index}`));
  if (new Set(modules).size !== modules.length) throw new Error(`${path} contains duplicates`);
  if (entry !== null && !modules.includes(entry)) throw new Error(`${path} must include its entry module`);
  if (entry === null && modules.length > 0) throw new Error(`${path} requires a client entry`);
  return modules;
}

function validateCapabilities(value, path) {
  const capabilities = requireStringArray(value, path)
    .map((capability, index) => requireCapability(capability, `${path}/${index}`));
  if (new Set(capabilities).size !== capabilities.length) throw new Error(`${path} contains duplicates`);
  return capabilities;
}

export function validatePhysicsSource(value, shape) {
  const record = requireRecord(value, "/physics");
  if (record.formatVersion !== PHYSICS_FORMAT) throw new Error("Unsupported physics format");
  const airFriction = record.airFriction;
  const materialsRecord = requireRecord(record.materials ?? {}, "/physics/materials");
  const materials = Object.fromEntries(Object.entries(materialsRecord).map(([blockId, value]) => {
    const id = requireInteger(Number(blockId), `/physics/materials/${blockId}`, 1, 0x0fff);
    const material = requireRecord(value, `/physics/materials/${blockId}`);
    return [String(id), Object.freeze({
      solid: material.solid === undefined ? true : requireBoolean(material.solid, `/physics/materials/${blockId}/solid`),
      friction: requireFiniteRange(material.friction ?? 8, `/physics/materials/${blockId}/friction`, 0, 100),
      restitution: requireFiniteRange(material.restitution ?? 0, `/physics/materials/${blockId}/restitution`, 0, 1),
      tags: Object.freeze(requireStringArray(material.tags ?? [], `/physics/materials/${blockId}/tags`)
        .map((tag, index) => requireIdentifier(tag, `/physics/materials/${blockId}/tags/${index}`))),
    })];
  }));
  return Object.freeze({
    formatVersion: PHYSICS_FORMAT,
    gravity: requireFiniteRange(record.gravity ?? -20, "/physics/gravity", -200, 200),
    ...(airFriction === undefined ? {} : { airFriction: requireFiniteNumber(airFriction, "/physics/airFriction") }),
    maxFallSpeed: requireFiniteRange(record.maxFallSpeed ?? 50, "/physics/maxFallSpeed", 1, 500),
    stepHeight: requireFiniteRange(record.stepHeight ?? 1.25, "/physics/stepHeight", 0, 1.5),
    playerBody: validatePlayerBodyProfile(record.playerBody, "/physics/playerBody"),
    materials: Object.freeze(materials),
    colliders: Object.freeze(validateVolumes(record.colliders ?? [], shape, "/physics/colliders", true)),
    triggers: Object.freeze(validateVolumes(record.triggers ?? [], shape, "/physics/triggers", false)),
  });
}

export function validateEnvironmentSource(value) {
  const record = requireRecord(value, "/environment");
  if (record.formatVersion !== ENVIRONMENT_FORMAT) throw new Error("Unsupported environment format");
  if (record.compatibility !== "partial") throw new Error("Recovered environment compatibility must remain partial");
  if (record.source !== "recovered-project") throw new Error("Recovered environment source is invalid");
  const fields = requireRecord(record.fields, "/environment/fields");
  if (!Array.isArray(record.diagnostics)) throw new Error("/environment/diagnostics must be an array");
  return Object.freeze({
    formatVersion: ENVIRONMENT_FORMAT,
    compatibility: record.compatibility,
    source: record.source,
    fields: Object.freeze(fields),
    diagnostics: Object.freeze(record.diagnostics),
  });
}

function defaultPhysicsSource() {
  return Object.freeze({
    formatVersion: PHYSICS_FORMAT,
    gravity: -20,
    maxFallSpeed: 50,
    stepHeight: 1.25,
    playerBody: null,
    materials: Object.freeze({}),
    colliders: Object.freeze([]),
    triggers: Object.freeze([]),
  });
}

function validatePlayerBodyProfile(value, path) {
  if (value === undefined || value === null) return null;
  const record = requireRecord(value, path);
  const legacyHalfExtents = record.halfExtents;
  const boundsHalfExtents = requireFiniteVector(record.boundsHalfExtents ?? legacyHalfExtents, `${path}/boundsHalfExtents`);
  const shapeHalfExtents = requireFiniteVector(record.shapeHalfExtents ?? legacyHalfExtents, `${path}/shapeHalfExtents`);
  if (boundsHalfExtents.some(component => component <= 0 || component > 4)) throw new Error(`${path}/boundsHalfExtents must be positive and at most 4`);
  if (shapeHalfExtents.some(component => component <= 0 || component > 4)) throw new Error(`${path}/shapeHalfExtents must be positive and at most 4`);
  if (shapeHalfExtents.some((component, index) => component > boundsHalfExtents[index])) throw new Error(`${path}/shapeHalfExtents must fit inside boundsHalfExtents`);
  if (record.origin !== "body-center") throw new Error(`${path}/origin currently supports only body-center`);
  const originStatus = requireEvidenceStatus(record.originStatus, `${path}/originStatus`);
  const sizeStatus = requireEvidenceStatus(record.sizeStatus, `${path}/sizeStatus`);
  return Object.freeze({
    profileId: requireIdentifier(record.profileId, `${path}/profileId`),
    origin: record.origin,
    originStatus,
    sizeStatus,
    boundsHalfExtents: vectorObject(boundsHalfExtents),
    shapeHalfExtents: vectorObject(shapeHalfExtents),
    evidence: requireText(record.evidence, `${path}/evidence`, 1024),
  });
}

function vectorObject(vector) {
  return Object.freeze({ x: vector[0], y: vector[1], z: vector[2] });
}

function validateVolumes(values, shape, path, solid) {
  if (!Array.isArray(values)) throw new Error(`${path} must be an array`);
  const ids = new Set();
  return values.map((value, index) => {
    const item = requireRecord(value, `${path}/${index}`);
    const id = requireIdentifier(item.id, `${path}/${index}/id`);
    if (ids.has(id)) throw new Error(`Duplicate interaction volume id: ${id}`);
    ids.add(id);
    const min = requireFiniteVector(item.min, `${path}/${index}/min`);
    const max = requireFiniteVector(item.max, `${path}/${index}/max`);
    if (min.some((component, axis) => component < 0 || component >= shape[axis])) throw new Error(`${path}/${index}/min is outside world shape`);
    if (max.some((component, axis) => component <= min[axis] || component > shape[axis])) throw new Error(`${path}/${index}/max is invalid`);
    return Object.freeze({
      id,
      min,
      max,
      solid,
      material: item.material === undefined ? null : requireIdentifier(item.material, `${path}/${index}/material`),
      tags: Object.freeze(requireStringArray(item.tags ?? [], `${path}/${index}/tags`)
        .map((tag, tagIndex) => requireIdentifier(tag, `${path}/${index}/tags/${tagIndex}`))),
    });
  });
}

export function validateTerrainSource(value, shape) {
  const record = requireRecord(value, "/terrain");
  if (record.formatVersion !== TERRAIN_FORMAT) throw new Error("Unsupported terrain format");
  const boxes = Array.isArray(record.boxes) ? record.boxes : [];
  const voxels = Array.isArray(record.voxels) ? record.voxels : [];
  if (boxes.length + voxels.length === 0) throw new Error("Terrain source must contain boxes or voxels");

  return Object.freeze({
    boxes: Object.freeze(boxes.map((item, index) => {
      const box = requireRecord(item, `/terrain/boxes/${index}`);
      const from = requireIntegerVector(box.from, `/terrain/boxes/${index}/from`, 0, 1023);
      const to = requireIntegerVector(box.to, `/terrain/boxes/${index}/to`, 0, 1023);
      assertPositionInside(from, shape, `/terrain/boxes/${index}/from`);
      assertPositionInside(to, shape, `/terrain/boxes/${index}/to`);
      if (to.some((component, axis) => component < from[axis])) throw new Error(`Terrain box ${index} has an inverted range`);
      return Object.freeze({
        from,
        to,
        blockId: requireInteger(box.blockId, `/terrain/boxes/${index}/blockId`, 0, 0x0fff),
        rotation: requireInteger(box.rotation ?? 0, `/terrain/boxes/${index}/rotation`, 0, 3),
      });
    })),
    voxels: Object.freeze(voxels.map((item, index) => {
      const voxel = requireRecord(item, `/terrain/voxels/${index}`);
      const position = requireIntegerVector(voxel.position, `/terrain/voxels/${index}/position`, 0, 1023);
      assertPositionInside(position, shape, `/terrain/voxels/${index}/position`);
      return Object.freeze({
        position,
        blockId: requireInteger(voxel.blockId, `/terrain/voxels/${index}/blockId`, 0, 0x0fff),
        rotation: requireInteger(voxel.rotation ?? 0, `/terrain/voxels/${index}/rotation`, 0, 3),
      });
    })),
  });
}

export function validateEntitySource(value, shape) {
  const record = requireRecord(value, "/entities");
  if (!Array.isArray(record.entities)) throw new Error("Entity source requires an entities array");
  const ids = new Set();
  return Object.freeze(record.entities.map((item, index) => {
    const entity = requireRecord(item, `/entities/entities/${index}`);
    const id = requireIdentifier(entity.id, `/entities/entities/${index}/id`);
    if (ids.has(id)) throw new Error(`Duplicate entity id: ${id}`);
    ids.add(id);
    const position = requireFiniteVector(entity.position, `/entities/entities/${index}/position`);
    if (position.some((component, axis) => component < 0 || component >= shape[axis])) {
      throw new Error(`Entity ${id} is outside world shape`);
    }
    const kind = entity.kind ?? "prop";
    if (!["player", "entity", "prop"].includes(kind)) throw new Error(`Unsupported entity kind: ${kind}`);
    const tags = requireStringArray(entity.tags ?? [], `/entities/entities/${index}/tags`)
      .map((tag, tagIndex) => requireIdentifier(tag, `/entities/entities/${index}/tags/${tagIndex}`));
    const mesh = entity.mesh === undefined || entity.mesh === null ? null : requireText(entity.mesh, `/entities/entities/${index}/mesh`, 512);
    return Object.freeze({ id, kind, position, tags: Object.freeze([...new Set(tags)]), mesh });
  }));
}

export function expandTerrain(terrain) {
  const cells = new Map();
  for (const box of terrain.boxes) {
    for (let x = box.from[0]; x <= box.to[0]; x += 1) {
      for (let y = box.from[1]; y <= box.to[1]; y += 1) {
        for (let z = box.from[2]; z <= box.to[2]; z += 1) {
          setCell(cells, [x, y, z], box.blockId, box.rotation);
        }
      }
    }
  }
  for (const voxel of terrain.voxels) setCell(cells, voxel.position, voxel.blockId, voxel.rotation);
  return [...cells.values()].sort(compareVoxels);
}

function setCell(cells, position, blockId, rotation) {
  const key = position.join(",");
  if (blockId === 0) cells.delete(key);
  else cells.set(key, Object.freeze({ position: Object.freeze([...position]), blockId, rotation }));
  if (cells.size > MAX_EXPANDED_VOXELS) throw new Error(`Expanded terrain exceeds ${MAX_EXPANDED_VOXELS} voxels`);
}

function compareVoxels(left, right) {
  return left.position[0] - right.position[0]
    || left.position[1] - right.position[1]
    || left.position[2] - right.position[2];
}

async function readJson(root, packagePath) {
  const path = resolveInside(root, packagePath);
  await assertRegularFile(root, packagePath);
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON in ${packagePath}: ${error instanceof Error ? error.message : error}`);
  }
}

async function assertRegularFile(root, packagePath) {
  const info = await lstat(resolveInside(root, packagePath));
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Package path is not a regular file: ${packagePath}`);
}

function resolveInside(root, packagePath) {
  const target = resolve(root, packagePath);
  const local = relative(root, target);
  if (local === "" || local.startsWith("..") || isAbsolute(local)) throw new Error(`Path escapes map root: ${packagePath}`);
  return target;
}

function assertPositionInside(position, shape, path) {
  if (position.some((component, axis) => component >= shape[axis])) throw new Error(`${path} is outside world shape`);
}

function requireRecord(value, path) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${path} must be an object`);
  return value;
}

function requireBoolean(value, path) {
  if (typeof value !== "boolean") throw new Error(`${path} must be a boolean`);
  return value;
}

function requireFiniteRange(value, path, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${path} must be a finite number from ${minimum} to ${maximum}`);
  }
  return value;
}

function requireFiniteNumber(value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${path} must be a finite number`);
  return value;
}

function requireText(value, path, maximumLength) {
  if (typeof value !== "string" || value.length === 0 || value.length > maximumLength || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) {
    throw new Error(`${path} must be non-empty text up to ${maximumLength} characters`);
  }
  return value;
}

function requireIdentifier(value, path) {
  const identifier = requireText(value, path, 64);
  // Real box3/DAO3 maps use arbitrary (often CJK) entity ids — e.g. parkour
  // checkpoint entities named "存档点_1". Keep the ASCII fast path but allow
  // any non-empty text with no control characters or slashes.
  if (/^[a-z0-9][a-z0-9-]{0,63}$/.test(identifier)) return identifier;
  if (/[\x00-\x1f\x7f/\\]/.test(identifier) || identifier.length === 0) {
    throw new Error(`${path} is not a valid identifier`);
  }
  return identifier;
}

function requireCapability(value, path) {
  const capability = requireText(value, path, 128);
  if (!/^[a-z][a-z0-9-]{0,63}(?:\.[a-z][a-z0-9-]{0,63})*$/.test(capability)) throw new Error(`${path} is not a valid capability`);
  return capability;
}

function requireVersion(value, path) {
  const version = requireText(value, path, 32);
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`${path} must be a semantic version`);
  return version;
}

function requireContract(value, path, prefix) {
  const contract = requireText(value, path, 128);
  if (!contract.startsWith(prefix)) throw new Error(`${path} must start with ${prefix}`);
  return contract;
}

function requireCompatibilityLevel(value, path) {
  if (!['experimental', 'partial', 'conformant'].includes(value)) throw new Error(`${path} is invalid`);
  return value;
}

function requireEvidenceStatus(value, path) {
  if (!['confirmed', 'derived', 'unverified'].includes(value)) throw new Error(`${path} is invalid`);
  return value;
}

function requirePackagePath(value, path) {
  const packagePath = requireText(value, path, 512);
  if (packagePath.startsWith("/") || packagePath.includes("\\")) throw new Error(`${path} is not a safe package path`);
  const segments = packagePath.split("/");
  if (segments.some(segment => segment === "" || segment === "." || segment === "..")) throw new Error(`${path} is not a safe package path`);
  return packagePath;
}

function requireInteger(value, path, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`${path} must be an integer from ${minimum} to ${maximum}`);
  return value;
}

function requireIntegerVector(value, path, minimum, maximum) {
  if (!Array.isArray(value) || value.length !== 3) throw new Error(`${path} must be a 3D integer vector`);
  return Object.freeze(value.map((component, index) => requireInteger(component, `${path}/${index}`, minimum, maximum)));
}

function requireFiniteVector(value, path) {
  if (!Array.isArray(value) || value.length !== 3 || value.some(component => typeof component !== "number" || !Number.isFinite(component))) {
    throw new Error(`${path} must be a finite 3D vector`);
  }
  return Object.freeze([...value]);
}

function requireStringArray(value, path) {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new Error(`${path} must be an array of strings`);
  return [...value];
}
