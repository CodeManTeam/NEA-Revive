import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { digestCapabilityJson } from "../src/capability-input-digest.mjs";
import { normalizeCapabilityWorldConfig } from "../src/capability-input-normalize.mjs";
import { importMapProject, publishClientScript, publishClientUiState } from "../src/import-project.mjs";

function assertPresentCapabilityDigest(value) {
  assert.ok(value && typeof value === "object");
  assert.equal(value.present, true);
  assert.ok(Number.isSafeInteger(value.bytes));
  assert.ok(value.bytes >= 0);
  assert.match(value.sha256, /^[a-f0-9]{64}$/);
}

test("imports the Demo into dao3-project/v1", async () => {
  const source = resolve(fileURLToPath(new URL("../project", import.meta.url)));
  const output = join(await mkdtemp(join(tmpdir(), "nea-map-import-")), "project");
  const result = await importMapProject(source, output);
  assert.equal(result.manifest.id, "nea-script-lab");
  assert.ok(result.voxelCount > 8_000);
  assert.equal(result.entityCount, 2);
  assert.equal(result.assetCount, 0);
  assert.equal(result.clientScript?.name, "clientIndex.js");

  const manifest = JSON.parse(await readFile(join(output, "dao3.project.json"), "utf8"));
  assert.equal(manifest.formatVersion, "dao3-project/v1");
  assert.equal(manifest.engine.clientContract, "dao3-client-runtime/v1");
  assert.equal(manifest.engine.serverContract, "nea-server-runtime/v1");
  assert.equal(manifest.engine.tickRate, 20);
  assert.deepEqual(manifest.storage, { groupId: null });
  const scripts = JSON.parse(await readFile(join(output, "scripts", "manifest.json"), "utf8"));
  assert.deepEqual(scripts.capabilities, [
    "server.world.events",
    "server.world.chat",
    "server.world.entities",
    "server.world.voxels",
    "server.world.config",
    "server.gui",
    "server.storage",
    "server.player",
    "server.player.write",
    "server.remote-channel",
    "server.http",
  ]);
  assert.deepEqual(result.manifest.scripts.clientCapabilities, ["client.core", "client.ui", "client.remote-channel"]);
  const capabilities = JSON.parse(await readFile(join(output, "capabilities", "manifest.json"), "utf8"));
  assert.equal(capabilities.format, "nea-project-capability-manifest");
  assert.equal(capabilities.status, result.capabilityManifest.status);
  assert.equal(capabilities.version, 14);
  assertPresentCapabilityDigest(capabilities.inputs.projectIdentity);
  assertPresentCapabilityDigest(capabilities.inputs.storageScope);
  assertPresentCapabilityDigest(capabilities.inputs.worldConfig);
  assertPresentCapabilityDigest(capabilities.inputs.worldSpawn);
  assertPresentCapabilityDigest(capabilities.inputs.playerBody);
  assert.ok(capabilities.requirements.some(item => item.usage === "world.say"));
  assert.ok(capabilities.requirements.some(item => item.usage === "UiText.create"));
  assert.ok(capabilities.requirements.some(item => item.usage === "runtimeStatus.textContent" && item.owner === "UiText"));
  assert.ok(capabilities.requirements.some(item => item.usage === "player.snapshot" && item.compatibility === "extension"));
  assert.equal(capabilities.summary.blockedModules, 0);
  assert.equal(capabilities.summary.blockingDiagnostics, 0);
  assert.ok(capabilities.summary.uiNodes >= 1);
  assert.equal(capabilities.summary.entities, result.entityCount);
  assert.deepEqual(result.physics.playerBody.boundsHalfExtents, { x: 0.45, y: 1.1, z: 0.45 });
  assert.deepEqual(result.physics.playerBody.shapeHalfExtents, { x: 0.45, y: 1.1, z: 0.45 });
  const terrain = JSON.parse(await readFile(join(output, "world", "terrain.json"), "utf8"));
  assert.equal(terrain.voxels.length, result.voxelCount);
  assert.equal(new Set(terrain.voxels.map(voxel => voxel.position.join(","))).size, terrain.voxels.length);
  const physics = JSON.parse(await readFile(join(output, "world", "physics.json"), "utf8"));
  assert.equal(physics.formatVersion, "nea-physics/v1");
  assert.equal(physics.stepHeight, 1.25);
  assert.equal(physics.playerBody.origin, "body-center");
  assert.equal(physics.playerBody.originStatus, "confirmed");
  assert.equal(physics.playerBody.sizeStatus, "confirmed");
  assert.equal(physics.materials["631"].restitution, 0.82);
  assert.equal(physics.colliders[0].id, "training-step");
  assert.equal(physics.triggers.length, 2);
});

test("imports optional airFriction as a capability-bound world physics input", async () => {
  const fixture = resolve(fileURLToPath(new URL("../project", import.meta.url)));
  const temporaryRoot = await mkdtemp(join(tmpdir(), "nea-map-air-friction-"));
  const source = join(temporaryRoot, "source");
  const output = join(temporaryRoot, "project");
  await cp(fixture, source, { recursive: true });
  const physicsPath = join(source, "world", "physics.json");
  const physics = JSON.parse(await readFile(physicsPath, "utf8"));
  physics.gravity = -0.1;
  physics.airFriction = 0.01;
  await writeFile(physicsPath, `${JSON.stringify(physics, null, 2)}\n`, "utf8");

  const result = await importMapProject(source, output);
  const packagedPhysics = JSON.parse(await readFile(join(output, "world", "physics.json"), "utf8"));
  assert.equal(packagedPhysics.airFriction, 0.01);
  assert.deepEqual(
    result.capabilityManifest.inputs.worldConfig,
    digestCapabilityJson(normalizeCapabilityWorldConfig({ entityLimit: result.manifest.world.entityLimit, gravity: -0.1, airFriction: 0.01 })),
  );
});

test("imports and publishes complete server and client module sets", async () => {
  const fixture = resolve(fileURLToPath(new URL("../project", import.meta.url)));
  const temporaryRoot = await mkdtemp(join(tmpdir(), "nea-map-modules-"));
  const source = join(temporaryRoot, "source");
  const output = join(temporaryRoot, "project");
  const assets = join(temporaryRoot, "assets");
  await cp(fixture, source, { recursive: true });
  const manifestPath = join(source, "nea.map.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.runtime.groupId = "group-7";
  manifest.scripts.serverModules = ["scripts/server.js", "scripts/lib/entity.js"];
  manifest.scripts.clientModules = ["scripts/client.js", "scripts/lib/ui.js"];
  manifest.assets = [{ name: "icon.bin", path: "assets/icon.bin", kind: "image" }];
  manifest.ui = "ui/client-ui.json";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const entitiesPath = join(source, manifest.world.entities);
  const entities = JSON.parse(await readFile(entitiesPath, "utf8"));
  entities.entities[0].mesh = "asset:icon.bin";
  await writeFile(entitiesPath, `${JSON.stringify(entities, null, 2)}\n`);
  await mkdir(join(source, "scripts", "lib"), { recursive: true });
  await mkdir(join(source, "assets"), { recursive: true });
  await mkdir(join(source, "ui"), { recursive: true });
  await writeFile(join(source, "scripts", "lib", "entity.js"), `module.exports = world.querySelector(".dummy");\n`);
  await writeFile(join(source, "scripts", "lib", "ui.js"), `const icon = UiImage.create(); icon.image = "asset:icon.bin"; const status = ui.findChildByName("status"); module.exports = { icon, status };\n`);
  await writeFile(join(source, "assets", "icon.bin"), Buffer.from([1, 2, 3, 4]));
  await writeFile(join(source, "ui", "client-ui.json"), `${JSON.stringify({
    format: "nea-recovered-client-ui",
    version: 1,
    sourceMessage: "gameUI.reset",
    running: true,
    defaultScreenId: "SCREEN",
    pictureAssets: {},
    uiTree: {
      ROOT_ID: { id: "ROOT_ID", type: 0, name: "root", parentId: "", childrenIds: ["SCREEN"] },
      SCREEN: { id: "SCREEN", type: 1, name: "main", parentId: "ROOT_ID", childrenIds: ["STATUS"], value: { type: "screen" } },
      STATUS: { id: "STATUS", type: 2, name: "status", parentId: "SCREEN", childrenIds: [], value: { type: "text" } },
    },
  }, null, 2)}\n`);

  const result = await importMapProject(source, output);
  const packageManifest = JSON.parse(await readFile(join(output, "dao3.project.json"), "utf8"));
  assert.deepEqual(packageManifest.storage, { groupId: "group-7" });
  assert.equal(result.manifest.runtime.groupId, "group-7");
  const scripts = JSON.parse(await readFile(join(output, "scripts", "manifest.json"), "utf8"));
  assert.deepEqual(scripts.modules, ["scripts/server.js", "scripts/lib/entity.js"]);
  assert.match(await readFile(join(output, "scripts", "lib", "entity.js"), "utf8"), /querySelector/);
  assert.ok(result.capabilityManifest.requirements.some(item => item.module === "scripts/lib/entity.js" && item.usage === "world.querySelector"));
  assert.equal(result.assetCount, 1);
  const assetIndex = JSON.parse(await readFile(join(output, "assets", "index.json"), "utf8"));
  assert.equal(assetIndex.format, "nea-project-assets");
  assert.equal(assetIndex.assets[0].name, "icon.bin");
  assert.equal(assetIndex.assets[0].bytes, 4);
  assert.equal((await readFile(join(output, assetIndex.assets[0].path))).byteLength, 4);
  assert.equal(result.capabilityManifest.resources.find(item => item.reference === "asset:icon.bin").state, "partial");
  assert.equal(result.capabilityManifest.ui.find(item => item.source === "lookup" && item.lookupName === "status").state, "ready");
  assert.equal(result.capabilityManifest.entities.find(item => item.source === "project" && item.id === entities.entities[0].id).state, "blocked");
  const packagedEntities = JSON.parse(await readFile(join(output, "world", "entities.json"), "utf8"));
  assert.equal(packagedEntities.entities[0].mesh, "asset:icon.bin");

  const published = await publishClientScript(result, assets);
  const clientManifest = JSON.parse(await readFile(join(assets, published), "utf8"));
  assert.deepEqual(clientManifest.files.map(file => file.name), ["clientIndex.js", "lib/ui.js"]);
  assert.match(await readFile(join(assets, "project", manifest.id, "client-scripts", "lib", "ui.js"), "utf8"), /UiImage\.create/);
  const publishedUi = await publishClientUiState(result, assets);
  const uiManifest = JSON.parse(await readFile(join(assets, publishedUi), "utf8"));
  assert.equal(uiManifest.sourceMessage, "gameUI.reset");
  assert.equal(uiManifest.uiTree.STATUS.name, "status");
});

test("failed imports preserve existing packages and do not create new packages", async () => {
  const fixture = resolve(fileURLToPath(new URL("../project", import.meta.url)));
  const temporaryRoot = await mkdtemp(join(tmpdir(), "nea-map-transactional-import-"));
  const source = join(temporaryRoot, "source");
  const existingOutput = join(temporaryRoot, "existing-project");
  const newOutput = join(temporaryRoot, "new-project");
  await cp(fixture, source, { recursive: true });
  await importMapProject(source, existingOutput);
  const originalManifest = await readFile(join(existingOutput, "dao3.project.json"), "utf8");

  const manifestPath = join(source, "nea.map.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.scripts.serverModules = ["scripts/server.js", "scripts/missing.js"];
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  await assert.rejects(importMapProject(source, existingOutput));
  await assert.rejects(importMapProject(source, newOutput));
  assert.equal(await readFile(join(existingOutput, "dao3.project.json"), "utf8"), originalManifest);
  await assert.rejects(stat(newOutput));
});
