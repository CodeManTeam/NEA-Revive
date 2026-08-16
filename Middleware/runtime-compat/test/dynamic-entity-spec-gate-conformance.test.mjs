import test from "node:test";
import assert from "node:assert/strict";
import { dynamicEntitySpecGateContract } from "../conformance/dynamic-entity-spec-gate.mjs";

test("dynamic entity specifications remain inventoried without fabricated projection", () => {
  assert.match(dynamicEntitySpecGateContract.inventoryPolicy, /Every statically visible/);
  assert.match(dynamicEntitySpecGateContract.projectionPolicy, /captured and validated binding/);
  assert.match(dynamicEntitySpecGateContract.dynamicPolicy, /remain partial and script-local/);
  assert.deepEqual(dynamicEntitySpecGateContract.prohibitedBehavior, [
    "fabricated mesh bounds",
    "fabricated geometry",
    "fabricated physics body",
    "unverified authoritative projection",
  ]);
});
