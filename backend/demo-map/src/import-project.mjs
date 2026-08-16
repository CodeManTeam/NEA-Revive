import { mkdir, mkdtemp, open, readFile, rename, rm } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { expandTerrain, loadMapSource, RUNTIME_API_VERSION } from "./format.mjs";
import { buildRepositoryProjectCapabilityManifest } from "./project-capability.mjs";

export async function importMapProject(sourceRoot, outputRoot, options = {}) {
  const source = await loadMapSource(sourceRoot);
  const destination = resolve(outputRoot);
  const prepared = await prepareImport(source, options);
  const staging = await createStagingDirectory(destination);
  try {
    await writeProjectPackage(staging, prepared);
    await replaceProjectPackage(staging, destination);
    return createImportResult(source, destination, prepared);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function prepareImport(source, options) {
  const terrain = expandTerrain(source.terrain);
  const serverModules = await readSourceModules(source.root, source.manifest.scripts.serverModules, modulePath => modulePath);
  const clientModules = await readSourceModules(source.root, source.manifest.scripts.clientModules, modulePath => clientModuleName(source.manifest.scripts.client, modulePath));
  const assets = await readSourceAssets(source.root, source.assets);
  const serverScript = serverModules.find(module => module.sourcePath === source.manifest.scripts.server)?.source;
  const clientScript = clientModules.find(module => module.sourcePath === source.manifest.scripts.client) ?? null;
  const capabilityManifest = await buildRepositoryProjectCapabilityManifest({
    runtimeCompatibility: options.runtimeCompatibility,
    apiVersion: source.manifest.runtime.apiVersion,
    contracts: { client: source.manifest.runtime.clientContract, server: source.manifest.runtime.serverContract },
    serverSource: serverScript,
    clientSource: clientScript?.source.toString("utf8") ?? "",
    serverModules: serverModules.map(module => ({ name: module.name, source: module.source.toString("utf8") })),
    clientModules: clientModules.map(module => ({ name: module.name, source: module.source.toString("utf8") })),
    serverCapabilities: source.manifest.scripts.serverCapabilities,
    clientCapabilities: source.manifest.scripts.clientCapabilities,
    assets,
    entities: source.entities,
    uiState: source.ui,
    storageScope: { groupId: source.manifest.runtime.groupId },
    projectIdentity: { projectName: source.manifest.display.name },
    worldConfig: {
      entityLimit: source.manifest.world.entityLimit,
      ...(source.physics.airFriction === undefined ? {} : {
        gravity: source.physics.gravity,
        airFriction: source.physics.airFriction,
      }),
    },
    worldSpawnEvidence: source.manifest.world.spawn,
    playerBodyEvidence: source.physics.playerBody,
    environmentEvidence: source.environment,
  });
  return { source, terrain, serverModules, clientModules, assets, clientScript, capabilityManifest };
}

async function writeProjectPackage(destination, prepared) {
  const { source, terrain, serverModules, assets, capabilityManifest } = prepared;
  const files = {
    manifest: join(destination, "dao3.project.json"),
    world: join(destination, "world", "world.json"),
    terrain: join(destination, "world", "terrain.json"),
    entities: join(destination, "world", "entities.json"),
    environment: join(destination, "world", "environment.json"),
    physics: join(destination, "world", "physics.json"),
    assets: join(destination, "assets", "index.json"),
    scripts: join(destination, "scripts", "manifest.json"),
    serverScript: join(destination, "scripts", "server.js"),
    capabilityManifest: join(destination, "capabilities", "manifest.json"),
  };
  await Promise.all([mkdir(join(destination, "world"), { recursive: true }), mkdir(join(destination, "assets"), { recursive: true }), mkdir(join(destination, "scripts"), { recursive: true }), mkdir(join(destination, "capabilities"), { recursive: true })]);

  await writeJson(files.manifest, {
    formatVersion: "dao3-project/v1",
    packageId: source.manifest.id,
    display: source.manifest.display,
    engine: {
      runtimeApiVersion: source.manifest.runtime.apiVersion,
      tickRate: source.manifest.runtime.tickRate,
      clientContract: source.manifest.runtime.clientContract,
      serverContract: source.manifest.runtime.serverContract,
      compatibilityLevel: source.manifest.runtime.compatibilityLevel,
    },
    world: "world/world.json",
    assets: "assets/index.json",
    scripts: "scripts/manifest.json",
    capabilities: "capabilities/manifest.json",
    storage: { groupId: source.manifest.runtime.groupId },
  });
  await writeJson(files.world, {
    shape: source.manifest.world.shape,
    spawn: source.manifest.world.spawn,
    entityLimit: source.manifest.world.entityLimit,
    entities: "world/entities.json",
    terrain: "world/terrain.json",
    environment: source.environment === null ? null : "world/environment.json",
    physics: "world/physics.json",
  });
  await writeJson(files.terrain, {
    voxels: terrain.map(voxel => ({ position: voxel.position, blockId: voxel.blockId, rotation: voxel.rotation })),
  });
  await writeJson(files.entities, {
    entities: source.entities.map(entity => ({
      kind: entity.kind,
      position: entity.position,
      tags: [...new Set([`id-${entity.id}`, ...entity.tags])].sort(),
      mesh: entity.mesh,
    })),
  });
  if (source.environment !== null) await writeJson(files.environment, source.environment);
  await writeJson(files.physics, source.physics);
  await writeJson(files.assets, {
    format: "nea-project-assets",
    version: 1,
    assets: assets.map(asset => ({ name: asset.name, kind: asset.kind, path: asset.packagePath, bytes: asset.bytes.byteLength, sha256: asset.sha256 })),
  });
  await writeJson(files.capabilityManifest, capabilityManifest);
  await writeJson(files.scripts, {
    entry: source.manifest.scripts.server,
    modules: serverModules.map(module => module.name),
    contract: {
      side: "server",
      id: source.manifest.runtime.serverContract,
      apiVersion: source.manifest.runtime.apiVersion,
    },
    capabilities: source.manifest.scripts.serverCapabilities,
  });
  await Promise.all(serverModules.map(module => writeFileInPlace(resolve(destination, module.name), module.source)));
  await Promise.all(assets.map(asset => writeFileInPlace(resolve(destination, asset.packagePath), asset.bytes)));
}

function createImportResult(source, destination, prepared) {
  const { terrain, serverModules, clientModules, assets, clientScript, capabilityManifest } = prepared;
  return Object.freeze({
    sourceRoot: source.root,
    outputRoot: destination,
    manifest: source.manifest,
    physics: source.physics,
    environment: source.environment,
    voxelCount: terrain.length,
    entityCount: source.entities.length,
    assetCount: assets.length,
    assets: Object.freeze(assets),
    entities: source.entities,
    clientScript: clientScript === null ? null : Object.freeze({ name: clientScript.name, bytes: clientScript.source, sha256: clientScript.sha256 }),
    serverModules: Object.freeze(serverModules.map(module => Object.freeze({ name: module.name, bytes: module.source, sha256: module.sha256 }))),
    clientModules: Object.freeze(clientModules.map(module => Object.freeze({ name: module.name, bytes: module.source, sha256: module.sha256 }))),
    clientUiState: source.ui,
    capabilityManifest,
  });
}

async function createStagingDirectory(destination) {
  const parent = dirname(destination);
  const prefix = `.${basename(destination)}.staging-`;
  await mkdir(parent, { recursive: true });
  return mkdtemp(join(parent, prefix));
}

async function replaceProjectPackage(staging, destination) {
  const backup = join(dirname(destination), `.${basename(destination)}.backup-${Date.now()}-${process.pid}`);
  let movedPrevious = false;
  try {
    await rename(destination, backup);
    movedPrevious = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  try {
    await rename(staging, destination);
  } catch (error) {
    if (movedPrevious) await rename(backup, destination);
    throw error;
  }
  if (movedPrevious) await rm(backup, { recursive: true, force: true });
}

async function readSourceAssets(root, assets) {
  return Promise.all(assets.map(async asset => {
    const bytes = await readFile(resolve(root, asset.path));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    return Object.freeze({ ...asset, bytes, sha256, packagePath: `assets/files/${sha256}${extname(asset.path).toLowerCase()}` });
  }));
}

export async function publishClientScript(importedProject, assetRoot) {
  if (importedProject.clientModules.length === 0) return null;
  const relativeManifest = `project/${importedProject.manifest.id}/client-scripts/manifest.json`;
  const manifestPath = resolve(assetRoot, relativeManifest);
  await mkdir(dirname(manifestPath), { recursive: true });
  await Promise.all(importedProject.clientModules.map(module => writeFileInPlace(join(dirname(manifestPath), module.name), module.bytes)));
  await writeJson(manifestPath, {
    format: "nea-recovered-client-scripts",
    version: 1,
    contract: {
      side: "client",
      id: importedProject.manifest.runtime.clientContract,
      apiVersion: importedProject.manifest.runtime.apiVersion,
    },
    capabilities: importedProject.manifest.scripts.clientCapabilities,
    sourceMessage: "gameNet.syncClientScriptModules",
    files: importedProject.clientModules.map(module => ({ name: module.name, bytes: module.bytes.byteLength, sha256: module.sha256 })),
  });
  return relativeManifest.split("\\").join("/");
}

export async function publishClientUiState(importedProject, assetRoot) {
  if (importedProject.clientUiState === null) return null;
  const relativeManifest = `project/${importedProject.manifest.id}/client-ui/manifest.json`;
  await writeJson(resolve(assetRoot, relativeManifest), importedProject.clientUiState);
  return relativeManifest.split("\\").join("/");
}

async function readSourceModules(root, modulePaths, mapName) {
  const modules = await Promise.all(modulePaths.map(async sourcePath => {
    const source = await readFile(resolve(root, sourcePath));
    return Object.freeze({ sourcePath, name: mapName(sourcePath), source, sha256: createHash("sha256").update(source).digest("hex") });
  }));
  if (new Set(modules.map(module => module.name)).size !== modules.length) throw new Error("Module paths produce duplicate synchronized module names");
  return modules;
}

function clientModuleName(entryPath, modulePath) {
  if (entryPath === modulePath) return "clientIndex.js";
  const name = relative(dirname(entryPath), modulePath).replace(/\\/g, "/");
  if (name === "" || name === ".." || name.startsWith("../")) throw new Error("Client modules must stay inside the client entry directory");
  return name;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFileInPlace(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeFileInPlace(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const handle = await openForRewrite(path);
  try {
    await handle.truncate(0);
    await handle.writeFile(value);
  } finally {
    await handle.close();
  }
}

async function openForRewrite(path) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await open(path, "r+");
    } catch (error) {
      if (error?.code === "ENOENT") return open(path, "w");
      if (error?.code !== "EPERM" || attempt === 7) throw error;
      await new Promise(resolveDelay => setTimeout(resolveDelay, 75 * (attempt + 1)));
    }
  }
  throw new Error(`Unable to open generated file for rewrite: ${path}`);
}

export function formatImportSummary(result) {
  return `${result.manifest.id}: ${result.voxelCount} voxels, ${result.entityCount} entities, runtime ${result.manifest.runtime.apiVersion || RUNTIME_API_VERSION}`;
}
