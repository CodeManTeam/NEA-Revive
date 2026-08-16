import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("project field inventory remains anonymous while preserving migration field evidence", async () => {
  const text = await readFile(resolve(root, "evidence", "project-field-inventory.json"), "utf8");
  const evidence = JSON.parse(text);
  assert.equal(evidence.format, "nea-redacted-project-field-inventory");
  assert.equal(evidence.version, 1);
  assert.equal(evidence.privacy.sourceValuesIncluded, false);
  assert.equal(evidence.privacy.sourcePathsIncluded, false);
  assert.equal(evidence.privacy.sourceNamesIncluded, false);
  assert.equal(evidence.privacy.sourceScriptsIncluded, false);
  assert.equal(evidence.provenance.sourceClass, "approved-local-private-inspection");
  assert.equal(evidence.provenance.redactionStatus, "schema-only-and-redacted-values");
  assert.equal(evidence.provenance.publicStatus, "public-sanitized");
  assert.match(evidence.provenance.reproducibilityLimit, /original project values/i);
  assert.equal(evidence.migrationReadiness.targetFormat, "nea-map/v1");
  assert.equal(evidence.migrationReadiness.status, "partial");
  assert.deepEqual(evidence.samples.map(sample => sample.sample), ["sample-001"]);
  assert.ok(evidence.samples[0].descriptorCount > 0);
  const fields = new Set(evidence.samples.flatMap(sample => sample.fields.map(field => field.path)));
  for (const field of ["voxels", "entitiesTree", "environment", "physics", "player", "features", "uiTree"]) {
    assert.ok(fields.has(field), `expected field inventory to include ${field}`);
    assert.ok(evidence.migrationReadiness.confirmedFieldPresence.includes(field));
  }
  assert.ok(evidence.migrationReadiness.evidenceDeferred.includes("voxel chunk value encoding"));
  assert.doesNotMatch(text, /works\/private|manual-cdp|bedwars|parkour|private-world|private-map/i);
});
