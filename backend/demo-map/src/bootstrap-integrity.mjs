import { createHash } from "node:crypto";

const PROJECT_BOOTSTRAP_FORMAT = "nea-recovered-project-bootstrap";
const PROJECT_BOOTSTRAP_VERSION = 2;
const PROJECT_BOOTSTRAP_SOURCE_MESSAGES = Object.freeze([
  "models.appendMeshHashes",
  "models.appendSkinHashes",
  "models.appendSkinPartHashes",
  "sound.resetDictionary",
  "gameNet.syncClientScriptModules",
  "gameTerrain.reset",
  "models.appendSkinPartHashes",
]);

export function verifyProjectBootstrapFile(manifest, bytes) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("Project bootstrap manifest is invalid");
  if (manifest.format !== "nea-recovered-project-bootstrap-manifest" || manifest.version !== 1) throw new Error("Project bootstrap manifest format is unsupported");
  const file = manifest.file;
  if (!file || typeof file !== "object" || Array.isArray(file)) throw new Error("Project bootstrap manifest file is missing");
  if (typeof file.name !== "string" || file.name.length === 0 || file.name.includes("/") || file.name.includes("\\") || file.name === "." || file.name === "..") throw new Error("Project bootstrap manifest file name is invalid");
  if (!Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error("Project bootstrap manifest byte length is invalid");
  if (!/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error("Project bootstrap manifest hash is invalid");
  const actualBytes = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (actualBytes.byteLength !== file.bytes) throw new Error("Project bootstrap file byte length mismatch");
  const actualHash = createHash("sha256").update(actualBytes).digest("hex");
  if (actualHash !== file.sha256) throw new Error("Project bootstrap file hash mismatch");
  return Object.freeze({ name: file.name, bytes: file.bytes, sha256: file.sha256 });
}

export function verifyProjectBootstrapProtocol(bytes) {
  let bootstrap;
  try {
    bootstrap = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    throw new Error("Project bootstrap protocol is not valid JSON", { cause: error });
  }
  if (!bootstrap || typeof bootstrap !== "object" || Array.isArray(bootstrap) ||
      bootstrap.format !== PROJECT_BOOTSTRAP_FORMAT || bootstrap.version !== PROJECT_BOOTSTRAP_VERSION ||
      !Array.isArray(bootstrap.sourceMessages) || bootstrap.sourceMessages.length !== PROJECT_BOOTSTRAP_SOURCE_MESSAGES.length ||
      bootstrap.sourceMessages.some((message, index) => message !== PROJECT_BOOTSTRAP_SOURCE_MESSAGES[index])) {
    throw new Error("Project bootstrap protocol identity is unsupported");
  }
  return Object.freeze({ format: bootstrap.format, version: bootstrap.version, sourceMessages: PROJECT_BOOTSTRAP_SOURCE_MESSAGES });
}
