import assert from "node:assert/strict";
import test from "node:test";
import { preserveRecoveredEnvironment } from "../src/recovered-environment-adapter.mjs";

test("preserves observed environment fields without claiming runtime compatibility", () => {
  const input = environment();
  const preserved = preserveRecoveredEnvironment(input);

  assert.equal(preserved.formatVersion, "nea-recovered-environment/v1");
  assert.equal(preserved.compatibility, "partial");
  assert.deepEqual(preserved.fields, input);
  assert.equal(preserved.diagnostics[0].code, "runtime-consumption-unverified");
  assert.throws(() => preserved.fields.sky = {}, TypeError);
});

test("blocks malformed environment values before preservation", () => {
  assert.throws(
    () => preserveRecoveredEnvironment({ ...environment(), drawDistance: "unknown" }),
    error => error.code === "evidence-blocked",
  );
});

function environment() {
  return {
    bakedShadow: { enabled: true },
    drawDistance: 128,
    fog: { density: 0.1 },
    rain: { enabled: false },
    sky: { color: [0.2, 0.3, 0.4] },
    snow: { enabled: false },
  };
}
