import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { worldEntityQuotaApiConformance } from "../conformance/world-entity-quota-api.mjs";

const runtimeSource = await readFile(new URL("../../../Frontend/demo-map/src/runtime/script-runtime.mjs", import.meta.url), "utf8");
const formatSource = await readFile(new URL("../../../Frontend/demo-map/src/format.mjs", import.meta.url), "utf8");
const manifestSource = await readFile(new URL("../../../Frontend/demo-map/src/capability-manifest.mjs", import.meta.url), "utf8");
const gateSource = await readFile(new URL("../../../Frontend/demo-map/src/capability-launch-gate.mjs", import.meta.url), "utf8");

test("entity quota preserves recovered formula and limit behavior", () => {
  assert.match(runtimeSource, /entityQuota: \(\) => Math\.max\(0, this\.entityLimit - this\.#entities\.size\)/);
  assert.match(runtimeSource, /if \(this\.#entities\.size >= this\.entityLimit\)/);
  assert.match(runtimeSource, /return null;/);
  assert.equal(worldEntityQuotaApiConformance.protocolDefault, 3400);
  assert.equal(worldEntityQuotaApiConformance.playersConsumeQuota, false);
  assert.equal(worldEntityQuotaApiConformance.status, "compatible");
});

test("entityLimit is package-validated and capability-bound", () => {
  assert.match(formatSource, /entityLimit: world\.entityLimit === undefined \? 3400/);
  assert.match(manifestSource, /worldConfig: digestCapabilityJson\(worldConfig\)/);
  assert.match(gateSource, /verifyProjectCapabilityWorldConfigInput/);
  assert.match(gateSource, /CAPABILITY_MANIFEST_VERSION = 14/);
});
