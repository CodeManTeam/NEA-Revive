import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { entityAutomaticSoundEvidenceConformance } from "../conformance/entity-automatic-sound-evidence.mjs";

const manifestSource = await readFile(new URL("../../../Frontend/demo-map/src/capability-manifest.mjs", import.meta.url), "utf8");
const runtimeSource = await readFile(new URL("../../../Frontend/demo-map/src/runtime/script-runtime.mjs", import.meta.url), "utf8");

test("automatic entity sound properties remain evidence-blocked instead of event-emulated", () => {
  assert.equal(entityAutomaticSoundEvidenceConformance.status, "evidence-blocked");
  for (const property of ["chatSound", "hurtSound", "dieSound", "interactSound"]) {
    assert.match(manifestSource, new RegExp(`server\\.GameEntity\\.${property}`));
    assert.doesNotMatch(runtimeSource, new RegExp(`\\b${property}\\b`));
  }
  assert.match(entityAutomaticSoundEvidenceConformance.prohibitedFallback, /Do not translate/);
});
