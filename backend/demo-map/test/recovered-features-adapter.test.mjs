import assert from "node:assert/strict";
import test from "node:test";
import { preserveRecoveredFeatures } from "../src/recovered-features-adapter.mjs";

test("preserves the observed trigger feature without enabling it", () => {
  const preserved = preserveRecoveredFeatures({ enableTriggerAPI: true });

  assert.deepEqual(preserved.fields, { enableTriggerAPI: true });
  assert.equal(preserved.compatibility, "partial");
  assert.equal(preserved.diagnostics[0].code, "runtime-consumption-unverified");
});

test("blocks malformed recovered feature values", () => {
  assert.throws(
    () => preserveRecoveredFeatures({ enableTriggerAPI: "true" }),
    error => error.code === "evidence-blocked",
  );
});
