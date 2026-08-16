import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const client = JSON.parse(await readFile(resolve(root, "generated", "player-client-script-runtime-analysis.json"), "utf8"));
const server = JSON.parse(await readFile(resolve(root, "generated", "local-server-runtime-analysis.json"), "utf8"));
const shared = JSON.parse(await readFile(resolve(root, "generated", "local-shared-runtime-analysis.json"), "utf8"));
const entries = [...client.entries, ...server.entries, ...shared.entries, ...profileEntries()]
  .sort((left, right) => left.id.localeCompare(right.id));

const ids = new Set();
for (const entry of entries) {
  if (ids.has(entry.id)) throw new Error(`Duplicate current Runtime ABI id: ${entry.id}`);
  ids.add(entry.id);
  if (entry.capability && !entry.capability.startsWith(`${entry.side}.`)) {
    throw new Error(`Current Runtime capability must be side-qualified: ${entry.id} -> ${entry.capability}`);
  }
}

await writeFile(resolve(root, "abi", "current-runtime.json"), `${JSON.stringify({
  format: "nea-runtime-abi",
  version: 1,
  generatedAt: new Date().toISOString(),
  entries,
}, null, 2)}\n`);
console.log(`Composed current Runtime ABI with ${entries.length} executable entries.`);

function profileEntries() {
  return [
    profile("client.runtime.contract", "client", "runtime", "contract", {
      id: "dao3-client-runtime/v1",
      apiVersion: "0.1.0",
    }, "native", "Binds imported client.js to the archived Player-side SES Script Runtime.", "Frontend/demo-map/src/import-project.mjs", "publishClientScript.contract"),
    profile("server.runtime.contract", "server", "runtime", "contract", {
      id: "nea-server-runtime/v1",
      apiVersion: "0.1.0",
      compatibilityLevel: "experimental",
    }, "emulated", "Runtime load fails on side, contract id, or API version mismatch.", "Frontend/demo-map/src/runtime/script-runtime.mjs", "ScriptRuntime.load"),
    profile("transport.mudb.contract", "transport", "mudb", "contract", {
      id: "mudb-transport/v1",
      protocolAbi: "nea-protocol-abi/v1",
    }, "bridged", "Preserves recovered MuDB protocol names, directions and message schemas.", "Middleware/runtime-compat/abi/protocols.json", "protocols"),
    profile("server.authoritativeRuntime.contract", "server", "authoritativeRuntime", "contract", {
      id: "nea-authoritative-runtime/v1",
      owns: ["ticks", "players", "rigid-bodies", "accepted-state-transitions"],
    }, "emulated", "Network and scripts submit state transitions to the authoritative runtime instead of owning wire state.", "local-player/backend/box3-server.cjs", "AuthoritativeGameRuntime"),
    profile("physics.playerBody.profile", "physics", "playerBody", "profile", {
      required: ["profileId", "origin", "originStatus", "sizeStatus", "boundsHalfExtents", "shapeHalfExtents", "evidence"],
    }, "emulated", "Body-center origin and upright Player default bounds/shape half extents 0.45x1.1x0.45 are confirmed; the two field groups remain independent for future posture deltas.", "Frontend/demo-map/src/runtime/physics/player-body.mjs", "requirePlayerBodyProfile", "partial"),
  ];
}

function profile(id, side, owner, name, signature, compatibility, note, path, symbol, availability = "confirmed") {
  return {
    id,
    side,
    kind: "profile",
    owner,
    name,
    signature,
    availability,
    compatibility,
    capability: null,
    since: "0.1.0",
    notes: [note],
    evidence: [{ type: path.startsWith("Middleware/runtime-compat/generated/") ? "derived" : "local-source", path, symbol, confidence: "direct" }],
  };
}
