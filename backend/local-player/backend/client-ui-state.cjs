const { readFile } = require("node:fs/promises");
const { isAbsolute, relative, resolve } = require("node:path");

async function loadClientUiState(assetRoot, manifestName) {
  if (!manifestName) return undefined;
  const root = resolve(assetRoot);
  const manifestPath = resolveInside(root, manifestName);
  const value = JSON.parse(await readFile(manifestPath, "utf8"));
  return validateClientUiState(value);
}

function validateClientUiState(value) {
  if (!isRecord(value) || value.format !== "nea-recovered-client-ui" || value.version !== 1 || value.sourceMessage !== "gameUI.reset") {
    throw new Error("Unsupported client UI manifest");
  }
  if (typeof value.running !== "boolean" || typeof value.defaultScreenId !== "string" || value.defaultScreenId.length === 0) {
    throw new Error("Invalid client UI state");
  }
  if (!isRecord(value.pictureAssets) || !isRecord(value.uiTree)) throw new Error("Invalid client UI state");
  const uiTree = {};
  for (const [id, node] of Object.entries(value.uiTree)) {
    if (!isRecord(node) || node.id !== id || !Number.isInteger(node.type) || typeof node.name !== "string" || typeof node.parentId !== "string" || !Array.isArray(node.childrenIds) || !node.childrenIds.every(childId => typeof childId === "string")) {
      throw new Error(`Invalid client UI node: ${id}`);
    }
    uiTree[id] = {
      ...node,
      childrenIds: [...node.childrenIds],
      value: node.value === undefined || node.value === null ? undefined : node.value,
    };
  }
  const root = uiTree.ROOT_ID;
  if (!root || root.type !== 0 || root.parentId !== "") throw new Error("Client UI tree must contain ROOT_ID");
  const defaultScreen = uiTree[value.defaultScreenId];
  if (!defaultScreen || defaultScreen.parentId !== "ROOT_ID" || defaultScreen.value?.type !== "screen") {
    throw new Error("Client UI default screen is missing or invalid");
  }
  for (const node of Object.values(uiTree)) {
    for (const childId of node.childrenIds) {
      const child = uiTree[childId];
      if (!child || child.parentId !== node.id) throw new Error(`Client UI child link is invalid: ${node.id} -> ${childId}`);
    }
    if (node.id !== "ROOT_ID") {
      const parent = uiTree[node.parentId];
      if (!parent || !parent.childrenIds.includes(node.id)) throw new Error(`Client UI parent link is invalid: ${node.id}`);
    }
  }
  const pictureAssets = {};
  for (const [name, asset] of Object.entries(value.pictureAssets)) {
    if (!isRecord(asset) || typeof asset.hash !== "string" || typeof asset.metadataHash !== "string" || !Number.isInteger(asset.width) || !Number.isInteger(asset.height)) {
      throw new Error(`Invalid client UI picture asset: ${name}`);
    }
    pictureAssets[name] = { hash: asset.hash, metadataHash: asset.metadataHash, width: asset.width, height: asset.height };
  }
  return Object.freeze({
    running: value.running,
    defaultScreenId: value.defaultScreenId,
    pictureAssets: Object.freeze(pictureAssets),
    uiTree: Object.freeze(uiTree),
  });
}

function resolveInside(root, path) {
  const target = resolve(root, path);
  const local = relative(root, target);
  if (local === "" || local.startsWith("..") || isAbsolute(local)) throw new Error("Client UI manifest must be inside the archive root");
  return target;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

module.exports = { loadClientUiState, validateClientUiState };