import assert from "node:assert/strict";
import test from "node:test";

import { verifyClientScriptContractIdentity, verifyServerScriptContractIdentity } from "../src/script-contract-identity.mjs";

const projectManifest = Object.freeze({ engine: { clientContract: "dao3-client-runtime/v1", serverContract: "nea-server-runtime/v1", runtimeApiVersion: "0.1.0" } });
const capabilityManifest = Object.freeze({ contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" }, apiVersion: "0.1.0" });
const clientScriptManifest = Object.freeze({ contract: { side: "client", id: "dao3-client-runtime/v1", apiVersion: "0.1.0" } });
const serverScriptManifest = Object.freeze({ contract: { side: "server", id: "nea-server-runtime/v1", apiVersion: "0.1.0" } });

test("client script contract identity binds project and capability manifests", () => {
  assert.deepEqual(verifyClientScriptContractIdentity({ projectManifest, capabilityManifest, clientScriptManifest }), { id: "dao3-client-runtime/v1", apiVersion: "0.1.0" });
  assert.throws(() => verifyClientScriptContractIdentity({ projectManifest, capabilityManifest, clientScriptManifest: { contract: { ...clientScriptManifest.contract, side: "server" } } }), /client side/);
  assert.throws(() => verifyClientScriptContractIdentity({ projectManifest, capabilityManifest, clientScriptManifest: { contract: { ...clientScriptManifest.contract, id: "other" } } }), /does not match/);
  assert.throws(() => verifyClientScriptContractIdentity({ projectManifest, capabilityManifest, clientScriptManifest: { contract: { ...clientScriptManifest.contract, apiVersion: "2.0.0" } } }), /API version/);
});

test("server script contract identity binds project and capability manifests", () => {
  assert.deepEqual(verifyServerScriptContractIdentity({ projectManifest, capabilityManifest, serverScriptManifest }), { id: "nea-server-runtime/v1", apiVersion: "0.1.0" });
  assert.throws(() => verifyServerScriptContractIdentity({ projectManifest, capabilityManifest, serverScriptManifest: { contract: { ...serverScriptManifest.contract, side: "client" } } }), /server side/);
  assert.throws(() => verifyServerScriptContractIdentity({ projectManifest, capabilityManifest, serverScriptManifest: { contract: { ...serverScriptManifest.contract, id: "other" } } }), /does not match/);
  assert.throws(() => verifyServerScriptContractIdentity({ projectManifest, capabilityManifest, serverScriptManifest: { contract: { ...serverScriptManifest.contract, apiVersion: "2.0.0" } } }), /API version/);
});
