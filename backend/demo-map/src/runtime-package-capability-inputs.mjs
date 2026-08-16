import { verifyClientScriptAssets } from "./client-script-integrity.mjs";
import { verifyClientUiPictureAssets } from "./client-ui-picture-integrity.mjs";
import { validateUiSource } from "./format.mjs";
import { readJsonFile } from "./json-file.mjs";
import { resolveRegularFileWithin } from "./package-paths.mjs";
import { verifyServerScriptModules } from "./server-script-integrity.mjs";
import { verifyClientScriptContractIdentity, verifyServerScriptContractIdentity } from "./script-contract-identity.mjs";

export async function readRuntimePackageScriptInputs(options) {
  const { buildRoot, assetRoot, projectManifest, capabilityManifest, clientManifest } = options;
  const scriptManifestPath = await resolveRegularFileWithin(buildRoot, projectManifest.scripts, "project script manifest");
  const scriptManifest = await readJsonFile(scriptManifestPath, "project script manifest");
  verifyServerScriptContractIdentity({ projectManifest, capabilityManifest, serverScriptManifest: scriptManifest });
  const server = await verifyServerScriptModules(buildRoot, scriptManifest);
  const clientManifestPath = await resolveRegularFileWithin(assetRoot, clientManifest, "client script manifest");
  const clientScriptManifest = await readJsonFile(clientManifestPath, "client script manifest");
  verifyClientScriptContractIdentity({ projectManifest, capabilityManifest, clientScriptManifest });
  const client = await verifyClientScriptAssets(clientManifestPath, clientScriptManifest);
  return Object.freeze({
    modules: Object.freeze([...server, ...client]),
    capabilities: Object.freeze({ server: scriptManifest.capabilities, client: clientScriptManifest.capabilities }),
  });
}

export async function readRuntimePackageUiState(assetRoot, clientUiManifest) {
  if (clientUiManifest === null || clientUiManifest === undefined) return null;
  const manifestPath = await resolveRegularFileWithin(assetRoot, clientUiManifest, "client UI manifest");
  const uiState = validateUiSource(await readJsonFile(manifestPath, "client UI manifest"));
  await verifyClientUiPictureAssets(assetRoot, uiState);
  return uiState;
}

export async function readRuntimePackageEvidenceInputs(buildRoot, projectManifest) {
  const assetPath = await resolveRegularFileWithin(buildRoot, projectManifest.assets, "project asset index");
  const assets = await readJsonFile(assetPath, "project asset index");
  const worldPath = await resolveRegularFileWithin(buildRoot, projectManifest.world, "project world manifest");
  const world = await readJsonFile(worldPath, "project world manifest");
  const entityPath = await resolveRegularFileWithin(buildRoot, world.entities, "project entity snapshot");
  const entities = await readJsonFile(entityPath, "project entity snapshot");
  if (!Array.isArray(assets.assets) || !Array.isArray(entities.entities)) {
    throw new Error("Project capability asset/entity snapshots are missing or invalid");
  }
  return Object.freeze({ assets: assets.assets, entities: entities.entities });
}
